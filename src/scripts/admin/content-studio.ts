import type { StudioFileChange, StudioSnapshot } from '@/types/studio'
import MarkdownIt from 'markdown-it'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { commitStudioChanges, getStudioSnapshot, StudioApiError } from './studio-client'

type CollectionKey = 'posts' | 'notes' | 'photos'
type EditorViewMode = 'edit' | 'split' | 'preview'
type ListFilter = 'all' | 'draft' | 'changed'

interface LocaleOption {
  value: string
  label: string
}

interface ContentItem {
  key: string
  collection: CollectionKey
  path: string
  data: Record<string, any>
  body: string
  raw: string
  isPending: boolean
}

interface BaselineItem {
  key: string
  collection: CollectionKey
  path: string
  title: string
  raw: string
}

interface Workspace {
  headSha: string
  revision: string
  branch: string
  remote: string
  dirty: boolean
  items: Record<CollectionKey, ContentItem[]>
  baseline: Map<string, BaselineItem>
  loadedAt: Date
}

interface ChangeRow {
  action: 'create' | 'update' | 'delete'
  path: string
  label: string
}

interface ComputedChanges {
  files: StudioFileChange[]
  rows: ChangeRow[]
}

interface PendingAsset {
  path: string
  content: string
  previewUrl: string
}

const POSTS_ROOT = 'src/content/posts'
const NOTES_ROOT = 'src/content/notes'
const PHOTOS_PATH = 'src/content/photos/photos.json'
const AUTO_SYNC_INTERVAL = 60_000
const LIST_PAGE_SIZE = 24
const EDITOR_VIEW_KEY = 'kun-blog-content-studio-view'
const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
const MAX_IMAGE_SIZE = 10 * 1024 * 1024
const previewParser = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
})

const collectionLabels: Record<CollectionKey, string> = {
  posts: '文章',
  notes: '说说',
  photos: '画廊',
}

function getById<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id)
  if (!element)
    throw new Error(`Missing admin element: ${id}`)
  return element as T
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&#39;',
  })[character] || character)
}

function localDateString(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

function timestampSlug() {
  const date = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('')
}

function randomId() {
  if (typeof crypto.randomUUID === 'function')
    return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function formatDate(value: unknown) {
  const date = new Date(String(value || ''))
  if (Number.isNaN(date.getTime()))
    return String(value || '无日期')
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function formatSyncTime(date: Date) {
  return `刚刚同步 · ${new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)}`
}

function itemDate(item: ContentItem) {
  return item.collection === 'posts' ? item.data.published : item.data.date
}

function itemTitle(item: ContentItem) {
  const title = String(item.data.title || '').trim()
  return title || '未命名内容'
}

function itemTags(item: ContentItem) {
  return Array.isArray(item.data.tags)
    ? item.data.tags.map(tag => String(tag))
    : []
}

function parseTags(value: string) {
  return [...new Set(value
    .split(/[,，\n]/)
    .map(tag => tag.trim())
    .filter(Boolean))]
}

function parseMarkdown(raw: string, path: string, collection: CollectionKey): ContentItem {
  const match = raw.match(/^\uFEFF?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/)
  if (!match)
    throw new Error('缺少 YAML frontmatter')

  const data = parseYaml(match[1])
  if (!data || typeof data !== 'object' || Array.isArray(data))
    throw new Error('frontmatter 不是有效对象')

  return {
    key: path,
    collection,
    path,
    data: data as Record<string, any>,
    body: match[2] || '',
    raw,
    isPending: false,
  }
}

function serializeMarkdown(item: ContentItem) {
  const frontmatter = stringifyYaml(item.data, { lineWidth: 0 }).trimEnd()
  const body = item.body.replace(/^\s*\n/, '').replace(/\s+$/, '')
  return `---\n${frontmatter}\n---\n\n${body}${body ? '\n' : ''}`
}

function serializePhoto(item: ContentItem) {
  return JSON.stringify(item.data, null, 2)
}

function sortItems(items: ContentItem[]) {
  return items.sort((a, b) => {
    const aTime = new Date(String(itemDate(a) || '')).getTime() || 0
    const bTime = new Date(String(itemDate(b) || '')).getTime() || 0
    return bTime - aTime
  })
}

function isCollectionKey(value: string | undefined): value is CollectionKey {
  return value === 'posts' || value === 'notes' || value === 'photos'
}

function studioErrorMessage(error: unknown) {
  if (error instanceof StudioApiError) {
    if (error.status === 403)
      return '内容服务只允许从本机 Content Studio 访问。'
    if (error.status === 409)
      return `工作区已变化：${error.message}`
    if (error.status === 404)
      return '本地内容服务不可用，请重新运行 pnpm studio。'
    return error.message
  }

  if (error instanceof TypeError)
    return '无法连接本地内容服务，请确认 pnpm studio 仍在运行。'

  return error instanceof Error ? error.message : String(error)
}

function mountContentStudio(root: HTMLElement) {
  document.title = `Content Studio | ${root.dataset.siteTitle || 'Blog'}`
  const locales = JSON.parse(root.dataset.locales || '[]') as LocaleOption[]

  const liveDot = getById<HTMLElement>('studio-live-dot')
  const connectionLabel = getById<HTMLElement>('studio-connection-label')
  const branchLabel = getById<HTMLElement>('studio-branch-label')
  const syncButton = getById<HTMLButtonElement>('studio-sync')
  const commitButton = getById<HTMLButtonElement>('studio-commit')
  const changeCount = getById<HTMLElement>('studio-change-count')
  const createButton = getById<HTMLButtonElement>('studio-create')
  const searchInput = getById<HTMLInputElement>('studio-search')
  const listElement = getById<HTMLElement>('studio-list')
  const paginationElement = getById<HTMLElement>('studio-list-pagination')
  const listLabel = getById<HTMLElement>('studio-list-label')
  const resultCount = getById<HTMLElement>('studio-result-count')
  const syncedAt = getById<HTMLElement>('studio-synced-at')
  const discardButton = getById<HTMLButtonElement>('studio-discard')
  const emptyState = getById<HTMLElement>('studio-empty')
  const editorElement = getById<HTMLElement>('studio-editor')
  const toastElement = getById<HTMLElement>('studio-toast')
  const tabButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.studio-tab'))
  const filterButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.studio-filter'))

  const commitDialog = getById<HTMLDialogElement>('studio-commit-dialog')
  const commitMessage = getById<HTMLInputElement>('studio-commit-message')
  const commitChanges = getById<HTMLElement>('studio-commit-changes')
  const commitFileCount = getById<HTMLElement>('studio-commit-file-count')
  const commitHint = getById<HTMLElement>('studio-commit-hint')
  const commitResult = getById<HTMLElement>('studio-commit-result')
  const commitTarget = getById<HTMLElement>('studio-commit-target')
  const commitConfirm = getById<HTMLButtonElement>('studio-commit-confirm')

  const countElements: Record<CollectionKey, HTMLElement> = {
    posts: getById<HTMLElement>('studio-count-posts'),
    notes: getById<HTMLElement>('studio-count-notes'),
    photos: getById<HTMLElement>('studio-count-photos'),
  }

  let workspace: Workspace | null = null
  let activeCollection: CollectionKey = 'posts'
  let activeFilter: ListFilter = 'all'
  let editorViewMode = readEditorViewMode()
  let selectedKey: string | null = null
  let editorFormDirty = false
  let loading = false
  let listPage = 0
  let previewTimer = 0
  let toastTimer = 0
  const pendingAssets = new Map<string, PendingAsset>()

  function readEditorViewMode(): EditorViewMode {
    const stored = localStorage.getItem(EDITOR_VIEW_KEY)
    return stored === 'edit' || stored === 'preview' || stored === 'split'
      ? stored
      : 'split'
  }

  function setConnection(mode: 'loading' | 'live' | 'error', text: string) {
    liveDot.className = 'studio-live-dot'
    if (mode === 'live')
      liveDot.classList.add('is-live')
    if (mode === 'error')
      liveDot.classList.add('is-error')
    connectionLabel.textContent = text
    branchLabel.textContent = workspace?.branch ? `⎇ ${workspace.branch}` : ''
  }

  function showToast(message: string, isError = false) {
    window.clearTimeout(toastTimer)
    toastElement.textContent = message
    toastElement.classList.toggle('is-error', isError)
    toastElement.classList.add('is-visible')
    toastTimer = window.setTimeout(() => {
      toastElement.classList.remove('is-visible')
    }, isError ? 7_000 : 4_500)
  }

  function allCurrentItems() {
    if (!workspace)
      return []
    return [...workspace.items.posts, ...workspace.items.notes, ...workspace.items.photos]
  }

  function findItem(key: string | null) {
    if (!key)
      return null
    return allCurrentItems().find(item => item.key === key) || null
  }

  function computeChanges(): ComputedChanges {
    const files: StudioFileChange[] = []
    const rows: ChangeRow[] = []

    if (!workspace)
      return { files, rows }

    for (const collection of ['posts', 'notes'] as const) {
      const baselineItems = [...workspace.baseline.values()]
        .filter(item => item.collection === collection)
      const baselineMap = new Map(baselineItems.map(item => [item.key, item]))
      const currentItems = workspace.items[collection].filter(item => !item.isPending)
      const currentMap = new Map(currentItems.map(item => [item.key, item]))

      for (const item of currentItems) {
        const baseline = baselineMap.get(item.key)
        if (!baseline) {
          files.push({
            path: item.path,
            action: 'create',
            content: item.raw,
          })
          rows.push({
            action: 'create',
            path: item.path,
            label: itemTitle(item),
          })
          continue
        }

        if (baseline.raw !== item.raw) {
          files.push({
            path: item.path,
            action: 'update',
            content: item.raw,
          })
          rows.push({
            action: 'update',
            path: item.path,
            label: itemTitle(item),
          })
        }
      }

      for (const item of baselineItems) {
        if (!currentMap.has(item.key)) {
          files.push({
            path: item.path,
            action: 'delete',
          })
          rows.push({
            action: 'delete',
            path: item.path,
            label: item.title,
          })
        }
      }
    }

    const baselinePhotos = [...workspace.baseline.values()]
      .filter(item => item.collection === 'photos')
    const baselinePhotosMap = new Map(baselinePhotos.map(item => [item.key, item]))
    const currentPhotos = workspace.items.photos.filter(item => !item.isPending)
    const currentPhotosMap = new Map(currentPhotos.map(item => [item.key, item]))
    let hasPhotoChanges = false

    for (const item of currentPhotos) {
      const baseline = baselinePhotosMap.get(item.key)
      const action = !baseline ? 'create' : baseline.raw !== item.raw ? 'update' : null
      if (!action)
        continue

      hasPhotoChanges = true
      rows.push({
        action,
        path: PHOTOS_PATH,
        label: itemTitle(item),
      })
    }

    for (const item of baselinePhotos) {
      if (!currentPhotosMap.has(item.key)) {
        hasPhotoChanges = true
        rows.push({
          action: 'delete',
          path: PHOTOS_PATH,
          label: item.title,
        })
      }
    }

    if (hasPhotoChanges) {
      const content = `${JSON.stringify(currentPhotos.map(item => item.data), null, 2)}\n`
      const exists = files.some(file => file.path === PHOTOS_PATH)
      if (exists) {
        const photoFile = files.find(file => file.path === PHOTOS_PATH)!
        photoFile.action = 'update'
        photoFile.content = content
      }
      else {
        files.push({
          path: PHOTOS_PATH,
          action: 'update',
          content,
        })
      }
    }

    const referencedMedia = new Set(
      allCurrentItems()
        .filter(item => !item.isPending)
        .flatMap(item => [item.data.image, item.data.thumbnail])
        .filter((value): value is string => typeof value === 'string' && value.startsWith('/')),
    )
    for (const asset of pendingAssets.values()) {
      const publicUrl = `/${asset.path.replace(/^public\//, '')}`
      if (!referencedMedia.has(publicUrl))
        continue

      files.push({
        path: asset.path,
        action: 'create',
        content: asset.content,
        encoding: 'base64',
      })
      rows.push({
        action: 'create',
        path: asset.path,
        label: publicUrl.split('/').pop() || '图片',
      })
    }

    return { files, rows }
  }

  function updateActionState() {
    const changes = computeChanges()
    const hasChanges = changes.files.length > 0
    commitButton.disabled = loading || !workspace || (!hasChanges && !editorFormDirty)
    changeCount.textContent = String(changes.files.length)
    discardButton.hidden = !workspace || (!hasChanges && !editorFormDirty)
    createButton.disabled = loading || !workspace
  }

  function updateCounts() {
    if (!workspace) {
      Object.values(countElements).forEach((element) => {
        element.textContent = '0'
      })
      return
    }

    for (const collection of ['posts', 'notes', 'photos'] as const)
      countElements[collection].textContent = String(workspace.items[collection].length)
  }

  function renderList() {
    if (!workspace) {
      listElement.innerHTML = `
        <div class="studio-list-empty">正在读取本地内容…</div>
      `
      resultCount.textContent = '0 条'
      return
    }

    const query = searchInput.value.trim().toLowerCase()
    const items = workspace.items[activeCollection]
      .filter((item) => {
        if (!query)
          return true
        return [
          itemTitle(item),
          item.path,
          ...itemTags(item),
        ].some(value => value.toLowerCase().includes(query))
      })
      .filter((item) => {
        if (activeFilter === 'draft')
          return Boolean(item.data.draft) || item.isPending
        if (activeFilter === 'changed') {
          const baseline = workspace?.baseline.get(item.key)
          return item.isPending || !baseline || baseline.raw !== item.raw
        }
        return true
      })

    const filterLabel = activeFilter === 'draft'
      ? '草稿'
      : activeFilter === 'changed'
        ? '有改动'
        : '全部'
    const totalPages = Math.max(1, Math.ceil(items.length / LIST_PAGE_SIZE))
    listPage = Math.min(listPage, totalPages - 1)
    const visibleItems = items.slice(
      listPage * LIST_PAGE_SIZE,
      (listPage + 1) * LIST_PAGE_SIZE,
    )
    listLabel.textContent = `${filterLabel}${collectionLabels[activeCollection]}`
    resultCount.textContent = `${items.length} 条`
    listElement.replaceChildren()
    paginationElement.replaceChildren()

    if (!items.length) {
      const empty = document.createElement('div')
      empty.className = 'studio-list-empty'
      empty.textContent = query ? '没有匹配的内容。' : '这里还没有内容，点击右上角新建。'
      listElement.appendChild(empty)
      paginationElement.hidden = true
      return
    }

    for (const item of visibleItems) {
      const baseline = workspace.baseline.get(item.key)
      const changed = Boolean(baseline && baseline.raw !== item.raw)
      const isNew = !baseline
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'studio-list-item'
      button.classList.toggle('is-active', item.key === selectedKey)
      button.classList.toggle('is-new', isNew)
      button.classList.toggle('is-changed', changed)
      button.dataset.itemKey = item.key

      const imageUrl = item.collection === 'photos' || item.collection === 'notes'
        ? String(item.data.thumbnail || item.data.image || '')
        : ''
      if (imageUrl) {
        const thumbnail = document.createElement('img')
        thumbnail.className = 'studio-list-thumb'
        thumbnail.src = imageUrl
        thumbnail.alt = ''
        thumbnail.loading = 'lazy'
        button.classList.add('has-thumb')
        button.appendChild(thumbnail)
      }

      const title = document.createElement('span')
      title.className = 'studio-list-title'
      title.textContent = itemTitle(item)

      const path = document.createElement('span')
      path.className = 'studio-list-path'
      path.textContent = item.collection === 'photos'
        ? [item.data.location, item.data.camera].filter(Boolean).join(' · ') || item.path
        : item.path

      const foot = document.createElement('span')
      foot.className = 'studio-list-foot'

      const date = document.createElement('span')
      date.textContent = formatDate(itemDate(item))
      foot.appendChild(date)

      if (item.data.draft) {
        const draft = document.createElement('span')
        draft.className = 'studio-mini-badge is-draft'
        draft.textContent = 'draft'
        foot.appendChild(draft)
      }

      if (isNew) {
        const badge = document.createElement('span')
        badge.className = 'studio-mini-badge'
        badge.textContent = item.isPending ? '待保存' : 'new'
        foot.appendChild(badge)
      }

      button.append(title, path, foot)
      button.addEventListener('click', () => selectItem(item.key))
      listElement.appendChild(button)
    }

    if (totalPages <= 1) {
      paginationElement.hidden = true
      return
    }

    paginationElement.hidden = false
    const previous = document.createElement('button')
    previous.type = 'button'
    previous.className = 'studio-page-button'
    previous.textContent = '上一页'
    previous.disabled = listPage === 0
    previous.addEventListener('click', () => {
      listPage = Math.max(0, listPage - 1)
      renderList()
      listElement.scrollTop = 0
    })

    const status = document.createElement('span')
    status.className = 'studio-page-status'
    status.textContent = `${listPage + 1} / ${totalPages}`

    const next = document.createElement('button')
    next.type = 'button'
    next.className = 'studio-page-button'
    next.textContent = '下一页'
    next.disabled = listPage >= totalPages - 1
    next.addEventListener('click', () => {
      listPage = Math.min(totalPages - 1, listPage + 1)
      renderList()
      listElement.scrollTop = 0
    })

    paginationElement.append(previous, status, next)
  }

  function languageOptions() {
    return [
      `<option value="">全语言通用</option>`,
      ...locales.map(locale =>
        `<option value="${escapeHtml(locale.value)}">${escapeHtml(locale.label)}</option>`,
      ),
    ].join('')
  }

  function field(
    label: string,
    control: string,
    options: { wide?: boolean, hint?: string } = {},
  ) {
    return `
      <label class="studio-field${options.wide ? ' studio-field-wide' : ''}">
        <span>
          ${escapeHtml(label)}
          ${options.hint ? `<small>${escapeHtml(options.hint)}</small>` : ''}
        </span>
        ${control}
      </label>
    `
  }

  function checkboxField(id: string, label: string) {
    return `
      <label class="studio-field studio-field-check">
        <input id="${id}" type="checkbox">
        <span>${escapeHtml(label)}</span>
      </label>
    `
  }

  function mediaField(
    label: string,
    id: string,
    placeholder: string,
    options: { wide?: boolean, required?: boolean } = {},
  ) {
    return `
      <div class="studio-field${options.wide ? ' studio-field-wide' : ''}">
        <span>
          ${escapeHtml(label)}
          <small>可粘贴地址或上传图片</small>
        </span>
        <div class="studio-media-control">
          <input
            id="${id}"
            type="text"
            autocomplete="off"
            placeholder="${escapeHtml(placeholder)}"
            ${options.required ? 'required' : ''}
          />
          <button class="studio-button studio-button-quiet" type="button" data-upload-for="${id}">
            上传
          </button>
        </div>
        <div class="studio-media-preview" data-preview-for="${id}" hidden></div>
      </div>
    `
  }

  function markdownFields(item: ContentItem) {
    const pathInput = item.isPending
      ? field(
          '文件路径',
          '<input id="studio-editor-path" type="text" autocomplete="off" spellcheck="false">',
          {
            wide: true,
            hint: item.collection === 'posts'
              ? '相对 src/content/posts，保存后不再修改'
              : '相对 src/content/notes，保存后不再修改',
          },
        )
      : ''

    if (item.collection === 'posts') {
      const advancedOpen = Boolean(
        item.data.abbrlink
        || item.data.series
        || item.data.seriesTitle
        || item.data.seriesOrder
        || item.data.pin
        || item.data.toc === false,
      )
      return `
        <div class="studio-field-grid">
          ${field('标题', '<input id="studio-editor-title" type="text" autocomplete="off" required>', { wide: true })}
          ${pathInput}
          ${field('首次发布时间', '<input id="studio-editor-date" type="text" inputmode="numeric" placeholder="YYYY-MM-DD" required>')}
          ${field('更新时间', '<input id="studio-editor-updated" type="text" inputmode="numeric" placeholder="可留空">')}
          ${field('语言', `<select id="studio-editor-lang">${languageOptions()}</select>`)}
          ${field('标签', '<input id="studio-editor-tags" type="text" autocomplete="off" placeholder="design, notes">')}
          ${field('摘要', '<textarea id="studio-editor-description" rows="3"></textarea>', { wide: true })}
          ${checkboxField('studio-editor-draft', '保存为草稿')}
        </div>
        <details class="studio-advanced" ${advancedOpen ? 'open' : ''}>
          <summary>
            <span>高级设置</span>
            <small>链接、系列、置顶和文章目录</small>
          </summary>
          <div class="studio-field-grid">
            ${field('自定义链接', '<input id="studio-editor-abbrlink" type="text" autocomplete="off" placeholder="lowercase-slug">')}
            ${field('置顶权重', '<input id="studio-editor-pin" type="number" min="0" max="99" step="1">')}
            ${field('系列标识', '<input id="studio-editor-series" type="text" autocomplete="off">')}
            ${field('系列标题', '<input id="studio-editor-series-title" type="text" autocomplete="off">')}
            ${field('系列序号', '<input id="studio-editor-series-order" type="number" min="0" step="1">')}
            ${checkboxField('studio-editor-toc', '显示文章目录')}
          </div>
        </details>
      `
    }

    return `
      <div class="studio-field-grid">
        ${field('标题', '<input id="studio-editor-title" type="text" autocomplete="off" required>', { wide: true })}
        ${pathInput}
        ${field('日期', '<input id="studio-editor-date" type="text" inputmode="numeric" placeholder="YYYY-MM-DD" required>')}
        ${field('语言', `<select id="studio-editor-lang">${languageOptions()}</select>`)}
        ${mediaField('配图', 'studio-editor-image', '/gallery/photo.jpg', { wide: true })}
        ${field('标签', '<input id="studio-editor-tags" type="text" autocomplete="off" placeholder="life, photo">')}
        ${checkboxField('studio-editor-draft', '保存为草稿')}
        ${field('摘要 / 备注', '<textarea id="studio-editor-description" rows="3"></textarea>', { wide: true })}
      </div>
    `
  }

  function photoFields(item: ContentItem) {
    const advancedOpen = Boolean(
      item.data.camera
      || item.data.lens
      || item.data.iso
      || item.data.aperture
      || item.data.shutter
      || item.data.focalLength,
    )
    return `
      <div class="studio-field-grid">
        ${field('标题', '<input id="studio-editor-title" type="text" autocomplete="off" required>', { wide: true })}
        ${field('日期', '<input id="studio-editor-date" type="text" inputmode="numeric" placeholder="YYYY-MM-DD">')}
        ${field('图片 ID', '<input id="studio-editor-id" type="text" autocomplete="off" readonly>')}
        ${mediaField('大图', 'studio-editor-image', '/gallery/photo.jpg', { wide: true, required: true })}
        ${mediaField('缩略图', 'studio-editor-thumbnail', '可留空，默认使用大图', { wide: true })}
        ${field('标签', '<input id="studio-editor-tags" type="text" autocomplete="off" placeholder="street, night">')}
        ${field('地点', '<input id="studio-editor-location" type="text" autocomplete="off">')}
        ${field('描述', '<textarea id="studio-editor-description" rows="4"></textarea>', { wide: true })}
      </div>
      <details class="studio-advanced" ${advancedOpen ? 'open' : ''}>
        <summary>
          <span>拍摄信息</span>
          <small>相机、镜头和曝光参数</small>
        </summary>
        <div class="studio-field-grid">
          ${field('相机', '<input id="studio-editor-camera" type="text" autocomplete="off">')}
          ${field('镜头', '<input id="studio-editor-lens" type="text" autocomplete="off">')}
          ${field('ISO', '<input id="studio-editor-iso" type="text" autocomplete="off" inputmode="numeric">')}
          ${field('光圈', '<input id="studio-editor-aperture" type="text" autocomplete="off" placeholder="f/2.8">')}
          ${field('快门', '<input id="studio-editor-shutter" type="text" autocomplete="off" placeholder="1/125s">')}
          ${field('焦距', '<input id="studio-editor-focal-length" type="text" autocomplete="off" placeholder="35mm">')}
        </div>
      </details>
    `
  }

  function setInputValue(id: string, value: unknown) {
    const input = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null
    if (input)
      input.value = value === undefined || value === null ? '' : String(value)
  }

  function setCheckbox(id: string, checked: unknown) {
    const input = document.getElementById(id) as HTMLInputElement | null
    if (input)
      input.checked = Boolean(checked)
  }

  function updateWordCount() {
    const body = (document.getElementById('studio-editor-body') as HTMLTextAreaElement | null)?.value || ''
    const text = body
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/[#>*_`~()[\]{}]/g, ' ')
      .replace(/\s+/g, '')
    const characters = [...text].length
    const minutes = Math.max(1, Math.ceil(characters / 400))
    const count = document.getElementById('studio-editor-count')
    const reading = document.getElementById('studio-editor-reading-time')
    if (count)
      count.textContent = `${characters} 字`
    if (reading)
      reading.textContent = `约 ${minutes} 分钟读完`
  }

  function updateMarkdownPreview(item: ContentItem) {
    if (item.collection === 'photos')
      return

    const preview = document.getElementById('studio-preview-doc')
    const body = (document.getElementById('studio-editor-body') as HTMLTextAreaElement | null)?.value || ''
    if (!preview)
      return

    preview.replaceChildren()
    const header = document.createElement('div')
    header.className = 'studio-preview-header'

    const title = document.createElement('div')
    title.className = 'studio-preview-title'
    title.textContent = inputValue('studio-editor-title') || `未命名${collectionLabels[item.collection]}`

    const meta = document.createElement('div')
    meta.className = 'studio-preview-meta'
    const date = document.createElement('span')
    date.textContent = formatDate(itemDate(item))
    meta.appendChild(date)
    for (const tag of parseTags(inputValue('studio-editor-tags'))) {
      const badge = document.createElement('span')
      badge.className = 'studio-preview-tag'
      badge.textContent = tag
      meta.appendChild(badge)
    }
    header.append(title, meta)
    preview.appendChild(header)

    if (item.collection === 'notes') {
      const imageUrl = inputValue('studio-editor-image')
      if (imageUrl) {
        const image = document.createElement('img')
        image.className = 'studio-preview-cover'
        image.src = imageUrl
        image.alt = inputValue('studio-editor-title')
        image.loading = 'lazy'
        preview.appendChild(image)
      }
    }

    const content = document.createElement('div')
    content.className = 'studio-preview-content'
    if (body.trim()) {
      content.innerHTML = previewParser.render(body)
      const collectionRoot = item.collection === 'posts' ? POSTS_ROOT : NOTES_ROOT
      const directory = item.path
        .slice(collectionRoot.length + 1)
        .split('/')
        .slice(0, -1)
        .join('/')
      const assetBase = `/${collectionRoot}/${directory ? `${directory}/` : ''}`
      for (const image of Array.from(content.querySelectorAll('img'))) {
        const source = image.getAttribute('src') || ''
        if (
          source
          && !source.startsWith('/')
          && !/^(?:[a-z]+:|#)/i.test(source)
        ) {
          image.src = `${assetBase}${source.replace(/^\.\//, '')}`
        }
      }
    }
    else {
      const empty = document.createElement('p')
      empty.className = 'studio-preview-empty'
      empty.textContent = '开始输入正文后，这里会显示实时预览。'
      content.appendChild(empty)
    }
    preview.appendChild(content)
    updateWordCount()
  }

  function schedulePreview(item: ContentItem) {
    window.clearTimeout(previewTimer)
    previewTimer = window.setTimeout(() => updateMarkdownPreview(item), 120)
  }

  function setEditorView(mode: EditorViewMode) {
    editorViewMode = mode
    localStorage.setItem(EDITOR_VIEW_KEY, mode)
    editorElement.dataset.view = mode
    for (const button of Array.from(editorElement.querySelectorAll<HTMLButtonElement>('[data-editor-view]')))
      button.classList.toggle('is-active', button.dataset.editorView === mode)
  }

  function updateMediaPreview(id: string) {
    const container = document.querySelector<HTMLElement>(`[data-preview-for="${id}"]`)
    const input = document.getElementById(id) as HTMLInputElement | null
    if (!container || !input)
      return

    const value = input.value.trim()
    container.replaceChildren()
    if (!value) {
      container.hidden = true
      return
    }

    const pending = pendingAssets.get(value)
    const image = document.createElement('img')
    image.src = pending?.previewUrl || value
    image.alt = ''
    image.loading = 'lazy'
    image.addEventListener('error', () => {
      image.style.display = 'none'
    })

    const copy = document.createElement('div')
    copy.className = 'studio-media-preview-copy'
    const name = document.createElement('strong')
    name.textContent = value.split('/').pop() || value
    copy.appendChild(name)

    const status = document.createElement('span')
    status.textContent = pending
      ? `待提交：${pending.path}`
      : value.startsWith('/')
        ? `项目路径：public${value}`
        : '外部图片地址'
    if (pending)
      status.className = 'studio-pending-asset'
    copy.appendChild(status)

    container.append(image, copy)
    container.title = pending?.path || value
    container.hidden = false
  }

  function readFileAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.addEventListener('load', () => resolve(String(reader.result || '')))
      reader.addEventListener('error', () => reject(reader.error || new Error('图片读取失败。')))
      reader.readAsDataURL(file)
    })
  }

  async function importImageFile(file: File, targetId: string) {
    const extension = IMAGE_EXTENSIONS[file.type]
      || file.name.toLowerCase().match(/\.(avif|gif|jpe?g|png|webp)$/)?.[1]?.replace('jpeg', 'jpg')
    if (!extension || !['avif', 'gif', 'jpg', 'png', 'webp'].includes(extension))
      throw new Error('只支持 AVIF、GIF、JPG、PNG 和 WebP 图片。')
    if (file.size > MAX_IMAGE_SIZE)
      throw new Error('图片不能超过 10 MB。')

    const dataUrl = await readFileAsDataUrl(file)
    const base64 = dataUrl.split(',')[1]
    if (!base64)
      throw new Error('图片内容读取失败。')

    const month = localDateString().slice(0, 7)
    const previousImage = (document.getElementById('studio-editor-image') as HTMLInputElement | null)?.value
    const baseName = file.name
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 56) || 'image'
    const assetPath = `public/gallery/uploads/${month}/${timestampSlug()}-${randomId().slice(0, 8)}-${baseName}.${extension}`
    const publicUrl = `/${assetPath.replace(/^public\//, '')}`
    pendingAssets.set(publicUrl, {
      path: assetPath,
      content: base64,
      previewUrl: dataUrl,
    })

    setInputValue(targetId, publicUrl)
    const target = document.getElementById(targetId) as HTMLInputElement | null
    target?.dispatchEvent(new Event('input', { bubbles: true }))

    if (targetId === 'studio-editor-image') {
      const thumbnail = document.getElementById('studio-editor-thumbnail') as HTMLInputElement | null
      if (thumbnail && (!thumbnail.value.trim() || thumbnail.value === previousImage)) {
        thumbnail.value = publicUrl
        thumbnail.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }

    updateMediaPreview(targetId)
    showToast('图片已加入待提交文件，提交 Git 时会一起上传。')
  }

  function initializeMediaFields() {
    for (const button of Array.from(editorElement.querySelectorAll<HTMLButtonElement>('[data-upload-for]'))) {
      const targetId = button.dataset.uploadFor
      if (!targetId)
        continue
      const control = button.closest<HTMLElement>('.studio-media-control')
      button.addEventListener('click', () => {
        const picker = document.createElement('input')
        picker.type = 'file'
        picker.accept = 'image/avif,image/gif,image/jpeg,image/png,image/webp'
        picker.addEventListener('change', () => {
          const file = picker.files?.[0]
          if (!file)
            return
          void importImageFile(file, targetId).catch((error) => {
            showToast(error instanceof Error ? error.message : String(error), true)
          })
        })
        picker.click()
      })

      if (control) {
        control.addEventListener('dragover', (event) => {
          if (event.dataTransfer?.types.includes('Files')) {
            event.preventDefault()
            control.classList.add('is-dragover')
          }
        })
        control.addEventListener('dragleave', () => control.classList.remove('is-dragover'))
        control.addEventListener('drop', (event) => {
          event.preventDefault()
          control.classList.remove('is-dragover')
          const file = event.dataTransfer?.files?.[0]
          if (file) {
            void importImageFile(file, targetId).catch(error =>
              showToast(error instanceof Error ? error.message : String(error), true),
            )
          }
        })
      }
    }

    for (const id of ['studio-editor-image', 'studio-editor-thumbnail']) {
      const input = document.getElementById(id) as HTMLInputElement | null
      if (!input)
        continue
      input.addEventListener('input', () => updateMediaPreview(id))
      updateMediaPreview(id)
    }
  }

  function applyMarkdownAction(action: string) {
    const textarea = document.getElementById('studio-editor-body') as HTMLTextAreaElement | null
    if (!textarea)
      return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = textarea.value.slice(start, end)
    let replacement = selected
    let selectionStart = start
    let selectionEnd = end

    const wrap = (before: string, after: string, placeholder: string) => {
      const content = selected || placeholder
      replacement = `${before}${content}${after}`
      selectionStart = start + before.length
      selectionEnd = selectionStart + content.length
    }
    const prefixLines = (prefix: (index: number) => string) => {
      const content = selected || '内容'
      replacement = content
        .split('\n')
        .map((line, index) => `${prefix(index)}${line}`)
        .join('\n')
      selectionStart = start
      selectionEnd = start + replacement.length
    }

    if (action === 'bold') {
      wrap('**', '**', '粗体文字')
    }
    else if (action === 'italic') {
      wrap('*', '*', '斜体文字')
    }
    else if (action === 'code') {
      wrap('`', '`', '代码')
    }
    else if (action === 'h2') {
      prefixLines(() => '## ')
    }
    else if (action === 'quote') {
      prefixLines(() => '> ')
    }
    else if (action === 'ul') {
      prefixLines(() => '- ')
    }
    else if (action === 'ol') {
      prefixLines(index => `${index + 1}. `)
    }
    else if (action === 'link') {
      wrap('[', '](https://example.com)', '链接文字')
    }
    else if (action === 'image') {
      wrap('![', '](/gallery/photo.jpg)', '图片描述')
    }
    else if (action === 'codeblock') {
      replacement = `\n\`\`\`\n${selected || '代码'}\n\`\`\`\n`
      selectionStart = start + 5
      selectionEnd = selectionStart + (selected || '代码').length
    }
    else if (action === 'divider') {
      replacement = '\n\n---\n\n'
      selectionStart = start + replacement.length
      selectionEnd = selectionStart
    }

    textarea.setRangeText(replacement, start, end, 'end')
    textarea.focus()
    textarea.setSelectionRange(selectionStart, selectionEnd)
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
  }

  function renderEditor() {
    const item = findItem(selectedKey)
    emptyState.hidden = Boolean(item)
    editorElement.hidden = !item

    if (!item) {
      editorElement.replaceChildren()
      return
    }
    editorElement.dataset.view = editorViewMode

    const baseline = workspace?.baseline.get(item.key)
    const changed = Boolean(baseline && baseline.raw !== item.raw)
    const pathHint = item.collection === 'photos'
      ? PHOTOS_PATH
      : item.path
    const bodySection = item.collection === 'photos'
      ? ''
      : `
          <section class="studio-editor-section">
            <div class="studio-editor-section-heading">
              <h3>Markdown 正文</h3>
              <div class="studio-editor-section-heading-right">
                <span id="studio-editor-count"></span>
                <div class="studio-view-switch" role="group" aria-label="编辑视图">
                  <button type="button" data-editor-view="edit">编辑</button>
                  <button type="button" data-editor-view="split">分栏</button>
                  <button type="button" data-editor-view="preview">预览</button>
                </div>
              </div>
            </div>
            <div class="studio-markdown-toolbar" role="toolbar" aria-label="Markdown 格式化">
              <button type="button" data-md-action="h2" title="二级标题">H2</button>
              <button type="button" data-md-action="bold" title="粗体"><strong>B</strong></button>
              <button type="button" data-md-action="italic" title="斜体"><em>I</em></button>
              <button type="button" data-md-action="code" title="行内代码">&lt;/&gt;</button>
              <span class="studio-toolbar-separator" aria-hidden="true"></span>
              <button type="button" data-md-action="link" title="链接">↗</button>
              <button type="button" data-md-action="image" title="图片">IMG</button>
              <span class="studio-toolbar-separator" aria-hidden="true"></span>
              <button type="button" data-md-action="quote" title="引用">❝</button>
              <button type="button" data-md-action="ul" title="无序列表">•</button>
              <button type="button" data-md-action="ol" title="有序列表">1.</button>
              <button type="button" data-md-action="codeblock" title="代码块">&#96;&#96;&#96;</button>
              <span class="studio-toolbar-separator" aria-hidden="true"></span>
              <button type="button" data-md-action="divider" title="分隔线">—</button>
            </div>
            <div class="studio-body-grid">
              <div class="studio-field studio-editor-pane">
                <textarea id="studio-editor-body" class="studio-body-input" spellcheck="false"></textarea>
              </div>
              <div class="studio-preview-panel">
                <div id="studio-preview-doc"></div>
              </div>
            </div>
            <div class="studio-editor-meta">
              <span>Markdown 实时预览</span>
              <span id="studio-editor-reading-time"></span>
            </div>
          </section>
        `

    editorElement.innerHTML = `
      <div class="studio-editor-heading">
        <div>
          <span class="studio-eyebrow">${collectionLabels[item.collection]}</span>
          <h2></h2>
          <span class="studio-editor-path"></span>
        </div>
        <div class="studio-editor-heading-side">
          <div class="studio-editor-state"></div>
          <button id="studio-editor-quick-save" class="studio-button studio-button-primary studio-editor-quick-save" type="button">
            保存工作副本
          </button>
        </div>
      </div>
      <form id="studio-editor-form" class="studio-editor-form" novalidate>
        ${item.collection === 'photos' ? photoFields(item) : markdownFields(item)}
        ${bodySection}
        <div id="studio-editor-message" class="studio-form-message" role="alert"></div>
        <div class="studio-editor-actions">
          <button id="studio-editor-delete" class="studio-button studio-danger-button" type="button">
            ${item.isPending ? '丢弃这条新建' : '删除内容'}
          </button>
          <div class="studio-editor-actions-right">
            <span class="studio-microcopy">修改先保存在工作副本</span>
            <button class="studio-button studio-button-primary" type="submit">
              保存工作副本
            </button>
          </div>
        </div>
      </form>
    `

    const heading = editorElement.querySelector<HTMLElement>('.studio-editor-heading h2')
    const path = editorElement.querySelector<HTMLElement>('.studio-editor-path')
    const state = editorElement.querySelector<HTMLElement>('.studio-editor-state')
    if (heading)
      heading.textContent = itemTitle(item)
    if (path)
      path.textContent = pathHint

    if (state) {
      const badges = [
        item.isPending ? '待保存' : '',
        !baseline ? '新建' : changed ? '已修改' : '已同步',
        item.data.draft ? '草稿' : '',
      ].filter(Boolean)

      for (const label of badges) {
        const badge = document.createElement('span')
        badge.className = 'studio-mini-badge'
        if (label === '草稿')
          badge.classList.add('is-draft')
        badge.textContent = label
        state.appendChild(badge)
      }
    }

    setInputValue('studio-editor-title', item.data.title)
    setInputValue('studio-editor-date', itemDate(item))
    setInputValue('studio-editor-lang', item.data.lang || '')
    setInputValue('studio-editor-tags', itemTags(item).join(', '))
    setInputValue('studio-editor-description', item.data.description)

    if (item.isPending) {
      const rootPath = item.collection === 'posts' ? POSTS_ROOT : NOTES_ROOT
      setInputValue('studio-editor-path', item.path.replace(`${rootPath}/`, ''))
    }

    if (item.collection === 'posts') {
      setInputValue('studio-editor-updated', item.data.updated)
      setInputValue('studio-editor-abbrlink', item.data.abbrlink)
      setInputValue('studio-editor-pin', item.data.pin ?? 0)
      setInputValue('studio-editor-series', item.data.series)
      setInputValue('studio-editor-series-title', item.data.seriesTitle)
      setInputValue('studio-editor-series-order', item.data.seriesOrder ?? 0)
      setCheckbox('studio-editor-draft', item.data.draft)
      setCheckbox('studio-editor-toc', item.data.toc ?? true)
    }
    else if (item.collection === 'notes') {
      setInputValue('studio-editor-image', item.data.image)
      setCheckbox('studio-editor-draft', item.data.draft)
    }
    else {
      setInputValue('studio-editor-id', item.data.id)
      setInputValue('studio-editor-image', item.data.image)
      setInputValue('studio-editor-thumbnail', item.data.thumbnail)
      setInputValue('studio-editor-location', item.data.location)
      setInputValue('studio-editor-camera', item.data.camera)
      setInputValue('studio-editor-lens', item.data.lens)
      setInputValue('studio-editor-iso', item.data.iso)
      setInputValue('studio-editor-aperture', item.data.aperture)
      setInputValue('studio-editor-shutter', item.data.shutter)
      setInputValue('studio-editor-focal-length', item.data.focalLength)
    }

    setInputValue('studio-editor-body', item.body)
    editorFormDirty = false
    updateActionState()
    setEditorView(editorViewMode)
    updateMarkdownPreview(item)
    initializeMediaFields()

    const form = getById<HTMLFormElement>('studio-editor-form')
    const formMessage = getById<HTMLElement>('studio-editor-message')
    const deleteButton = getById<HTMLButtonElement>('studio-editor-delete')
    const quickSaveButton = getById<HTMLButtonElement>('studio-editor-quick-save')

    form.addEventListener('input', () => {
      if (heading)
        heading.textContent = inputValue('studio-editor-title') || `未命名${collectionLabels[item.collection]}`
      schedulePreview(item)
      if (!editorFormDirty) {
        editorFormDirty = true
        formMessage.textContent = '表单有未保存的字段，保存后才会加入 Git 提交。'
        formMessage.classList.add('is-info')
        updateActionState()
      }
    })

    form.addEventListener('submit', (event) => {
      event.preventDefault()
      formMessage.textContent = ''
      formMessage.classList.remove('is-info')
      saveEditor(item, formMessage)
    })

    quickSaveButton.addEventListener('click', () => {
      formMessage.textContent = ''
      formMessage.classList.remove('is-info')
      saveEditor(item, formMessage)
    })

    for (const button of Array.from(editorElement.querySelectorAll<HTMLButtonElement>('[data-editor-view]'))) {
      button.addEventListener('click', () => {
        const mode = button.dataset.editorView
        if (mode === 'edit' || mode === 'split' || mode === 'preview') {
          setEditorView(mode)
          updateMarkdownPreview(item)
        }
      })
    }

    for (const button of Array.from(editorElement.querySelectorAll<HTMLButtonElement>('[data-md-action]'))) {
      button.addEventListener('click', () => {
        applyMarkdownAction(button.dataset.mdAction || '')
      })
    }

    deleteButton.addEventListener('click', () => deleteItem(item))
  }

  function normalizeMarkdownPath(collection: 'posts' | 'notes', value: string) {
    const root = collection === 'posts' ? POSTS_ROOT : NOTES_ROOT
    let path = value.trim().replace(/\\/g, '/').replace(/^\/+/, '')

    if (path.startsWith(`${root}/`))
      path = path.slice(root.length + 1)
    if (!path)
      throw new Error('请填写文件路径。')
    if (path.includes('..'))
      throw new Error('文件路径不能包含 ..')
    if (!/\.(?:md|mdx)$/i.test(path))
      path = `${path}.md`
    if (!/^[^:*?"<>|\r\n]+$/.test(path))
      throw new Error('文件路径包含不支持的字符。')

    return `${root}/${path}`
  }

  function inputValue(id: string) {
    return (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null)?.value.trim() || ''
  }

  function inputChecked(id: string) {
    return Boolean((document.getElementById(id) as HTMLInputElement | null)?.checked)
  }

  function showEditorError(formMessage: HTMLElement, message: string) {
    formMessage.textContent = message
    formMessage.classList.remove('is-info')
    showToast(message, true)
  }

  function saveEditor(
    item: ContentItem,
    formMessage: HTMLElement,
    options: { quiet?: boolean } = {},
  ) {
    if (!workspace)
      return false

    try {
      const title = inputValue('studio-editor-title')
      const date = inputValue('studio-editor-date')

      if (!title)
        throw new Error('标题不能为空。')
      if (!date)
        throw new Error('日期不能为空。')

      if (item.isPending && item.collection !== 'photos') {
        const newPath = normalizeMarkdownPath(item.collection, inputValue('studio-editor-path'))
        const duplicate = allCurrentItems().some(other => other !== item && other.path === newPath)
          || workspace.baseline.has(newPath)
        if (duplicate)
          throw new Error('该文件路径已存在，请换一个。')
        item.key = newPath
        item.path = newPath
        selectedKey = newPath
      }

      item.data = {
        ...item.data,
        title,
      }

      if (item.collection === 'posts') {
        item.data.published = date
        item.data.updated = inputValue('studio-editor-updated') || undefined
        item.data.description = inputValue('studio-editor-description')
        item.data.tags = parseTags(inputValue('studio-editor-tags'))
        item.data.draft = inputChecked('studio-editor-draft')
        item.data.pin = Number.parseInt(inputValue('studio-editor-pin') || '0', 10) || 0
        item.data.toc = inputChecked('studio-editor-toc')
        item.data.lang = inputValue('studio-editor-lang')
        item.data.abbrlink = inputValue('studio-editor-abbrlink')
        item.data.series = inputValue('studio-editor-series')
        item.data.seriesTitle = inputValue('studio-editor-series-title')
        item.data.seriesOrder = Number.parseInt(inputValue('studio-editor-series-order') || '0', 10) || 0
        item.body = (document.getElementById('studio-editor-body') as HTMLTextAreaElement).value
      }
      else if (item.collection === 'notes') {
        item.data.date = date
        item.data.description = inputValue('studio-editor-description')
        item.data.image = inputValue('studio-editor-image')
        item.data.tags = parseTags(inputValue('studio-editor-tags'))
        item.data.draft = inputChecked('studio-editor-draft')
        item.data.lang = inputValue('studio-editor-lang')
        item.body = (document.getElementById('studio-editor-body') as HTMLTextAreaElement).value
      }
      else {
        const image = inputValue('studio-editor-image')
        if (!image)
          throw new Error('画廊内容必须填写图片地址。')
        item.data.date = date
        item.data.description = inputValue('studio-editor-description')
        item.data.image = image
        item.data.thumbnail = inputValue('studio-editor-thumbnail')
        item.data.tags = parseTags(inputValue('studio-editor-tags'))
        item.data.location = inputValue('studio-editor-location')
        item.data.camera = inputValue('studio-editor-camera')
        item.data.lens = inputValue('studio-editor-lens')
        item.data.iso = inputValue('studio-editor-iso')
        item.data.aperture = inputValue('studio-editor-aperture')
        item.data.shutter = inputValue('studio-editor-shutter')
        item.data.focalLength = inputValue('studio-editor-focal-length')
      }

      item.raw = item.collection === 'photos'
        ? serializePhoto(item)
        : serializeMarkdown(item)
      item.isPending = false
      editorFormDirty = false
      renderList()
      renderEditor()
      updateActionState()
      if (!options.quiet)
        showToast('已保存到工作副本。提交 Git 后才会发布。')
      return true
    }
    catch (error) {
      showEditorError(formMessage, error instanceof Error ? error.message : String(error))
      return false
    }
  }

  function deleteItem(item: ContentItem) {
    if (!workspace)
      return

    if (!item.isPending) {
      // eslint-disable-next-line no-alert -- destructive edits need explicit confirmation
      const confirmed = window.confirm(
        `确定删除「${itemTitle(item)}」吗？\n\n删除会先保存在工作副本中，提交 Git 后才会从仓库移除。`,
      )
      if (!confirmed)
        return
    }

    workspace.items[item.collection] = workspace.items[item.collection]
      .filter(current => current.key !== item.key)
    selectedKey = null
    editorFormDirty = false
    renderEverything()
    showToast(item.isPending ? '已丢弃这条新建内容。' : '已标记删除，提交 Git 后生效。')
  }

  function selectItem(key: string) {
    if (key === selectedKey)
      return
    // eslint-disable-next-line no-alert -- switching editors can discard form input
    if (editorFormDirty && !window.confirm('当前表单还有未保存的输入，切换后将丢失。继续吗？'))
      return

    const item = findItem(key)
    if (!item)
      return
    activeCollection = item.collection
    selectedKey = key
    editorFormDirty = false
    updateTabs()
    renderList()
    renderEditor()
    if (window.matchMedia('(max-width: 900px)').matches)
      editorElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function createItem() {
    if (!workspace) {
      showToast('内容尚未同步完成。', true)
      return
    }

    const today = localDateString()
    const now = new Date().toISOString()
    let item: ContentItem

    if (activeCollection === 'posts') {
      const slug = timestampSlug()
      let path = `${POSTS_ROOT}/untitled-${slug}.md`
      let suffix = 2
      while (allCurrentItems().some(existing => existing.path === path))
        path = `${POSTS_ROOT}/untitled-${slug}-${suffix++}.md`
      item = {
        key: `new:${randomId()}`,
        collection: 'posts',
        path,
        data: {
          title: '',
          published: today,
          description: '',
          tags: [],
          draft: true,
          pin: 0,
          toc: true,
          lang: '',
          abbrlink: '',
          series: '',
          seriesTitle: '',
          seriesOrder: 0,
        },
        body: '',
        raw: '',
        isPending: true,
      }
    }
    else if (activeCollection === 'notes') {
      const slug = timestampSlug()
      let path = `${NOTES_ROOT}/${today}-untitled-${slug}.md`
      let suffix = 2
      while (allCurrentItems().some(existing => existing.path === path))
        path = `${NOTES_ROOT}/${today}-untitled-${slug}-${suffix++}.md`
      item = {
        key: `new:${randomId()}`,
        collection: 'notes',
        path,
        data: {
          title: '',
          date: today,
          description: '',
          image: '',
          tags: [],
          draft: true,
          lang: '',
        },
        body: '',
        raw: '',
        isPending: true,
      }
    }
    else {
      const id = `photo-${timestampSlug()}-${Math.random().toString(36).slice(2, 6)}`
      item = {
        key: `photo:${id}`,
        collection: 'photos',
        path: PHOTOS_PATH,
        data: {
          id,
          title: '',
          description: '',
          date: now,
          image: '',
          thumbnail: '',
          tags: [],
          location: '',
          camera: '',
          lens: '',
          iso: '',
          aperture: '',
          shutter: '',
          focalLength: '',
        },
        body: '',
        raw: '',
        isPending: true,
      }
    }

    workspace.items[activeCollection].unshift(item)
    listPage = 0
    selectedKey = item.key
    editorFormDirty = false
    updateCounts()
    renderList()
    renderEditor()
    window.setTimeout(() => {
      getById<HTMLInputElement>('studio-editor-title').focus()
    }, 0)
  }

  function renderEverything() {
    updateCounts()
    updateFilters()
    renderList()
    renderEditor()
    updateActionState()
    if (workspace) {
      syncedAt.textContent = formatSyncTime(workspace.loadedAt)
      branchLabel.textContent = `⎇ ${workspace.branch}`
    }
  }

  function updateTabs() {
    for (const button of tabButtons) {
      const collection = button.dataset.collection
      const active = collection === activeCollection
      button.classList.toggle('is-active', active)
      button.setAttribute('aria-selected', String(active))
    }
  }

  function updateFilters() {
    for (const button of filterButtons)
      button.classList.toggle('is-active', button.dataset.filter === activeFilter)
  }

  async function loadContent(options: {
    force?: boolean
    preserveSelection?: boolean
    silent?: boolean
  } = {}) {
    if (loading)
      return

    const previousSelection = options.preserveSelection ? selectedKey : null
    loading = true
    syncButton.disabled = true
    createButton.disabled = true
    setConnection('loading', '正在读取本地工作区')

    if (!workspace) {
      listElement.innerHTML = `
        <div class="studio-list-empty">正在读取最新提交…</div>
      `
    }

    try {
      const snapshot: StudioSnapshot = await getStudioSnapshot()

      if (
        workspace
        && options.silent
        && !options.force
        && workspace.revision === snapshot.revision
      ) {
        workspace.headSha = snapshot.headSha
        workspace.branch = snapshot.branch
        workspace.remote = snapshot.remote
        workspace.dirty = snapshot.dirty
        workspace.loadedAt = new Date()
        syncedAt.textContent = formatSyncTime(workspace.loadedAt)
        branchLabel.textContent = `⎇ ${workspace.branch}`
        setConnection('live', workspace.dirty ? '本地工作区 · 已有未提交改动' : '本地工作区 · 已同步')
        return
      }

      const markdownEntries = snapshot.files.filter(file =>
        /^src\/content\/posts\/.+\.(?:md|mdx)$/i.test(file.path)
        || /^src\/content\/notes\/.+\.(?:md|mdx)$/i.test(file.path),
      )
      const fileMap = new Map(snapshot.files.map(file => [file.path, file]))
      const warnings: string[] = []
      const items: Record<CollectionKey, ContentItem[]> = {
        posts: [],
        notes: [],
        photos: [],
      }

      for (const file of markdownEntries) {
        const collection = file.path.startsWith(POSTS_ROOT) ? 'posts' : 'notes'
        try {
          items[collection].push(parseMarkdown(file.content, file.path, collection))
        }
        catch (error) {
          warnings.push(`${file.path}: ${error instanceof Error ? error.message : String(error)}`)
        }
      }

      const photosFile = fileMap.get(PHOTOS_PATH)
      if (!photosFile)
        throw new Error('画廊数据读取失败。')

      let photos: any[]
      try {
        const parsed = JSON.parse(photosFile.content)
        if (!Array.isArray(parsed))
          throw new Error('根节点必须是数组')
        photos = parsed
      }
      catch (error) {
        throw new Error(`photos.json 解析失败：${error instanceof Error ? error.message : String(error)}`)
      }

      const photoIds = new Set<string>()
      for (const photo of photos) {
        if (!photo || typeof photo !== 'object' || !photo.id)
          throw new Error('photos.json 中存在缺少 id 的条目。')
        const id = String(photo.id)
        if (photoIds.has(id))
          throw new Error(`photos.json 中存在重复 id：${id}`)
        photoIds.add(id)
        items.photos.push({
          key: `photo:${id}`,
          collection: 'photos',
          path: PHOTOS_PATH,
          data: photo,
          body: '',
          raw: JSON.stringify(photo, null, 2),
          isPending: false,
        })
      }

      sortItems(items.posts)
      sortItems(items.notes)
      sortItems(items.photos)

      const baseline = new Map<string, BaselineItem>()
      for (const collection of ['posts', 'notes', 'photos'] as const) {
        for (const item of items[collection]) {
          baseline.set(item.key, {
            key: item.key,
            collection,
            path: item.path,
            title: itemTitle(item),
            raw: item.raw,
          })
        }
      }

      workspace = {
        headSha: snapshot.headSha,
        revision: snapshot.revision,
        branch: snapshot.branch,
        remote: snapshot.remote,
        dirty: snapshot.dirty,
        items,
        baseline,
        loadedAt: new Date(),
      }
      pendingAssets.clear()
      listPage = 0
      selectedKey = previousSelection && findItem(previousSelection)
        ? previousSelection
        : null
      editorFormDirty = false
      renderEverything()
      setConnection('live', workspace.dirty ? '本地工作区 · 已有未提交改动' : '本地工作区 · 已同步')
      if (warnings.length)
        showToast(`已同步，${warnings.length} 个 Markdown 文件未能解析：${warnings[0]}`, true)
    }
    catch (error) {
      setConnection('error', '同步失败')
      showToast(studioErrorMessage(error), true)
      if (!workspace) {
        listElement.innerHTML = `
          <div class="studio-list-empty">读取失败，请确认 pnpm studio 正在运行。</div>
        `
      }
      else {
        renderList()
        renderEditor()
      }
    }
    finally {
      loading = false
      syncButton.disabled = false
      updateActionState()
    }
  }

  function openCommitDialog() {
    if (!workspace) {
      showToast('内容尚未同步完成。', true)
      return
    }

    if (editorFormDirty) {
      const item = findItem(selectedKey)
      const message = document.getElementById('studio-editor-message')
      if (item && message && !saveEditor(item, message, { quiet: true }))
        return
    }

    const changes = computeChanges()
    if (!changes.files.length) {
      showToast('当前没有需要提交的修改。')
      return
    }

    commitChanges.replaceChildren()
    for (const row of changes.rows) {
      const element = document.createElement('div')
      element.className = 'studio-commit-row'

      const action = document.createElement('span')
      action.className = `studio-commit-action is-${row.action}`
      action.textContent = row.action

      const details = document.createElement('span')
      details.className = 'studio-commit-path'
      details.textContent = row.path === PHOTOS_PATH
        ? `${row.path} · ${row.label}`
        : row.path

      element.append(action, details)
      commitChanges.appendChild(element)
    }

    const createCount = changes.files.filter(change => change.action === 'create').length
    const updateCount = changes.files.filter(change => change.action === 'update').length
    const deleteCount = changes.files.filter(change => change.action === 'delete').length
    commitFileCount.textContent = `${changes.files.length} 个文件 · +${createCount} ~${updateCount} -${deleteCount}`
    commitMessage.value = 'content: update blog content'
    commitHint.textContent = `将把 ${changes.files.length} 个文件写入本地工作区，创建一次 Git 提交，并尝试推送到远端。`
    commitTarget.textContent = `${workspace.branch} · ${workspace.headSha.slice(0, 7)}`
    commitResult.hidden = true
    commitResult.replaceChildren()
    commitConfirm.disabled = false
    commitConfirm.textContent = '创建 Git 提交'
    if (!commitDialog.open)
      commitDialog.showModal()
  }

  async function submitCommit() {
    if (!workspace)
      return

    const message = commitMessage.value.trim()
    if (!message) {
      showToast('请填写提交信息。', true)
      commitMessage.focus()
      return
    }

    const changes = computeChanges()
    if (!changes.files.length) {
      showToast('当前没有需要提交的修改。', true)
      return
    }

    commitConfirm.disabled = true
    commitConfirm.textContent = '正在提交…'
    commitResult.hidden = true

    try {
      const result = await commitStudioChanges({
        expectedHeadSha: workspace.headSha,
        expectedRevision: workspace.revision,
        message,
        changes: changes.files,
      })

      commitResult.replaceChildren()
      const heading = document.createElement('strong')
      heading.textContent = result.pushed ? '提交已创建并推送' : '提交已创建，推送失败'
      const details = document.createElement('p')
      details.textContent = result.pushed
        ? `已提交 ${changes.files.length} 个文件并推送，继续沿用仓库原有的部署流程。`
        : result.pushError || '提交已写入本地 Git，但尚未推送到远端。'
      commitResult.append(heading, details)
      if (result.url) {
        const link = document.createElement('a')
        link.href = result.url
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        link.textContent = `查看 commit ${result.sha.slice(0, 7)}`
        commitResult.appendChild(link)
      }
      commitResult.hidden = false
      showToast(result.pushed ? 'Git 提交已创建并推送。' : 'Git 提交已创建，但推送失败。', !result.pushed)

      try {
        await loadContent({ force: true, preserveSelection: true, silent: true })
      }
      catch {
        // Commit succeeded even if the follow-up refresh fails.
      }
    }
    catch (error) {
      commitResult.replaceChildren()
      const heading = document.createElement('strong')
      heading.textContent = '提交失败'
      const details = document.createElement('p')
      details.textContent = studioErrorMessage(error)
      commitResult.append(heading, details)
      commitResult.hidden = false
      showToast(studioErrorMessage(error), true)
    }
    finally {
      commitConfirm.disabled = false
      commitConfirm.textContent = '创建 Git 提交'
    }
  }

  async function manualSync() {
    const hasChanges = Boolean(computeChanges().files.length)
    if (
      (hasChanges || editorFormDirty)
      // eslint-disable-next-line no-alert -- refresh can discard unsaved work
      && !window.confirm('刷新会丢弃当前所有未提交修改，确定继续吗？')
    ) {
      return
    }

    editorFormDirty = false
    await loadContent({ force: true, preserveSelection: true })
  }

  async function discardChanges() {
    if (!workspace)
      return

    // eslint-disable-next-line no-alert -- discarding edits needs explicit confirmation
    if (!window.confirm('确定放弃当前所有未提交修改吗？此操作只会重新读取本地文件。'))
      return

    editorFormDirty = false
    await loadContent({ force: true, preserveSelection: true })
  }

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const collection = button.dataset.collection
      if (!isCollectionKey(collection) || collection === activeCollection)
        return
      // eslint-disable-next-line no-alert -- switching collections can discard form input
      if (editorFormDirty && !window.confirm('当前表单还有未保存的输入，切换后将丢失。继续吗？'))
        return

      activeCollection = collection
      selectedKey = null
      editorFormDirty = false
      listPage = 0
      searchInput.value = ''
      updateTabs()
      renderList()
      renderEditor()
      updateActionState()
    })
  })

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter
      if (filter !== 'all' && filter !== 'draft' && filter !== 'changed')
        return
      activeFilter = filter
      listPage = 0
      updateFilters()
      renderList()
    })
  })

  searchInput.addEventListener('input', () => {
    listPage = 0
    renderList()
  })
  createButton.addEventListener('click', createItem)
  syncButton.addEventListener('click', manualSync)
  discardButton.addEventListener('click', discardChanges)
  commitButton.addEventListener('click', openCommitDialog)
  commitConfirm.addEventListener('click', submitCommit)

  for (const closeButton of Array.from(document.querySelectorAll<HTMLElement>('[data-close-dialog]'))) {
    closeButton.addEventListener('click', () => {
      closeButton.closest('dialog')?.close()
    })
  }

  for (const dialog of [commitDialog]) {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog)
        dialog.close()
    })
  }

  window.addEventListener('keydown', (event) => {
    if (!(event.metaKey || event.ctrlKey))
      return

    const key = event.key.toLowerCase()
    if (key === 's') {
      const item = findItem(selectedKey)
      const formMessage = document.getElementById('studio-editor-message')
      if (item && formMessage) {
        event.preventDefault()
        formMessage.textContent = ''
        formMessage.classList.remove('is-info')
        saveEditor(item, formMessage)
      }
    }
    else if (key === 'enter' && !commitDialog.open) {
      event.preventDefault()
      openCommitDialog()
    }
  })

  window.addEventListener('beforeunload', (event) => {
    if (computeChanges().files.length || editorFormDirty) {
      event.preventDefault()
    }
  })

  window.setInterval(() => {
    if (
      document.hidden
      || loading
      || !workspace
      || computeChanges().files.length
      || editorFormDirty
      || commitDialog.open
    ) {
      return
    }
    void loadContent({ silent: true, preserveSelection: true })
  }, AUTO_SYNC_INTERVAL)

  renderEverything()
  setConnection('loading', '准备读取本地内容')
  void loadContent()
}

const root = document.getElementById('content-studio')
if (root)
  mountContentStudio(root)
