import type {
  StudioCommitRequest,
  StudioCommitResult,
  StudioFile,
  StudioFileChange,
  StudioSnapshot,
} from '@/types/studio'
import { execFile } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, posix, relative, resolve, sep } from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const POSTS_ROOT = 'src/content/posts'
const NOTES_ROOT = 'src/content/notes'
const PHOTOS_PATH = 'src/content/photos/photos.json'
const CONTENT_PATHS = [POSTS_ROOT, NOTES_ROOT, PHOTOS_PATH]
const MAX_BODY_SIZE = 25 * 1024 * 1024
const STUDIO_HEADER = 'x-content-studio'

interface GitResult {
  code: number
  stdout: string
  stderr: string
}

class StudioHttpError extends Error {
  readonly status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'StudioHttpError'
    this.status = status
  }
}

async function runGit(root: string, args: string[], timeout = 120_000): Promise<GitResult> {
  try {
    const { stdout, stderr } = await execFileAsync('git', args, {
      cwd: root,
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: '0',
      },
      maxBuffer: 20 * 1024 * 1024,
      timeout,
      windowsHide: true,
    })

    return {
      code: 0,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
    }
  }
  catch (error) {
    const details = error as {
      code?: number | string
      stdout?: string
      stderr?: string
      message?: string
    }

    return {
      code: typeof details.code === 'number' ? details.code : 1,
      stdout: String(details.stdout || '').trim(),
      stderr: String(details.stderr || details.message || '').trim(),
    }
  }
}

function gitFailure(result: GitResult, fallback: string) {
  return [fallback, result.stderr, result.stdout]
    .filter(Boolean)
    .join('\n')
    .slice(0, 4_000)
}

async function gitOrThrow(root: string, args: string[], fallback: string) {
  const result = await runGit(root, args)
  if (result.code !== 0)
    throw new StudioHttpError(gitFailure(result, fallback), 500)
  return result.stdout
}

function toPosixPath(value: string) {
  return value.split(sep).join('/')
}

async function walkMarkdown(root: string, relativeRoot: string): Promise<StudioFile[]> {
  const directory = join(root, relativeRoot)
  const entries = await readdir(directory, { withFileTypes: true })
  const files: StudioFile[] = []

  entries.sort((a, b) => a.name.localeCompare(b.name))
  for (const entry of entries) {
    if (entry.isSymbolicLink())
      continue

    const absolutePath = join(directory, entry.name)
    const relativePath = toPosixPath(relative(root, absolutePath))
    if (entry.isDirectory()) {
      files.push(...await walkMarkdown(root, relativePath))
      continue
    }

    if (!entry.isFile() || !/\.(?:md|mdx)$/i.test(entry.name))
      continue

    files.push({
      path: relativePath,
      content: await readFile(absolutePath, 'utf8'),
    })
  }

  return files
}

async function collectContentFiles(root: string): Promise<StudioFile[]> {
  const [posts, notes, photos] = await Promise.all([
    walkMarkdown(root, POSTS_ROOT),
    walkMarkdown(root, NOTES_ROOT),
    readFile(join(root, PHOTOS_PATH), 'utf8'),
  ])

  return [
    ...posts,
    ...notes,
    {
      path: PHOTOS_PATH,
      content: photos,
    },
  ]
}

async function readRepositorySnapshot(root: string): Promise<StudioSnapshot> {
  const [headSha, branch, remoteResult, dirtyResult, files] = await Promise.all([
    gitOrThrow(root, ['rev-parse', 'HEAD'], '无法读取 Git HEAD。'),
    gitOrThrow(root, ['branch', '--show-current'], '无法读取当前分支。'),
    runGit(root, ['remote', 'get-url', 'origin']),
    runGit(root, ['status', '--porcelain=v1', '--', ...CONTENT_PATHS]),
    collectContentFiles(root),
  ])

  if (dirtyResult.code !== 0)
    throw new StudioHttpError(gitFailure(dirtyResult, '无法读取内容文件 Git 状态。'), 500)

  const revisionHash = createHash('sha256')
  revisionHash.update(headSha)
  for (const file of files) {
    revisionHash.update('\0')
    revisionHash.update(file.path)
    revisionHash.update('\0')
    revisionHash.update(file.content)
  }

  return {
    headSha,
    branch: branch || 'detached',
    remote: remoteResult.code === 0 ? remoteResult.stdout : '',
    dirty: Boolean(dirtyResult.stdout),
    revision: revisionHash.digest('hex'),
    files,
  }
}

function validateContentPath(value: unknown, action: StudioFileChange['action']) {
  if (typeof value !== 'string')
    throw new StudioHttpError('文件路径无效。')

  const path = value.replace(/\\/g, '/')
  const normalized = posix.normalize(path)
  if (
    !path
    || path !== normalized
    || isAbsolute(path)
    || path.split('/').includes('..')
    || path.startsWith('../')
  ) {
    throw new StudioHttpError(`非法文件路径：${path}`)
  }

  const isMarkdown = /^src\/content\/(?:posts|notes)\/(?:[^/]+\/)*[^/]+\.(?:md|mdx)$/i.test(path)
  if (!isMarkdown && path !== PHOTOS_PATH)
    throw new StudioHttpError(`只允许修改文章、说说和画廊内容：${path}`)
  if (path === PHOTOS_PATH && action === 'delete')
    throw new StudioHttpError('不能删除 photos.json，请单独删除画廊条目。')

  return path
}

async function readExistingFile(path: string) {
  try {
    return await readFile(path, 'utf8')
  }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      return null
    throw error
  }
}

async function atomicWrite(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true })
  const temporaryPath = join(
    dirname(path),
    `.${basename(path)}.studio-${randomUUID()}.tmp`,
  )
  await writeFile(temporaryPath, content, 'utf8')
  await rename(temporaryPath, path)
}

async function applyFileChanges(
  root: string,
  changes: Array<StudioFileChange & { content?: string }>,
) {
  const originals = new Map<string, string | null>()
  const effective: StudioFileChange[] = []

  for (const change of changes) {
    const absolutePath = resolve(root, change.path)
    const original = await readExistingFile(absolutePath)
    originals.set(change.path, original)

    if (change.action === 'create' && original !== null)
      throw new StudioHttpError(`文件已存在：${change.path}`, 409)
    if (change.action !== 'create' && original === null)
      throw new StudioHttpError(`文件不存在：${change.path}`, 409)
    if (change.action !== 'delete' && change.content === original)
      continue

    effective.push(change)
  }

  if (!effective.length)
    throw new StudioHttpError('内容没有产生实际变更。', 409)

  const applied: StudioFileChange[] = []
  try {
    for (const change of effective) {
      const absolutePath = resolve(root, change.path)
      if (change.action === 'delete') {
        await unlink(absolutePath)
      }
      else {
        await atomicWrite(absolutePath, change.content || '')
      }
      applied.push(change)
    }
  }
  catch (error) {
    for (const change of applied.reverse()) {
      const absolutePath = resolve(root, change.path)
      const original = originals.get(change.path)
      if (original === null)
        await unlink(absolutePath).catch(() => {})
      else
        await atomicWrite(absolutePath, original || '').catch(() => {})
    }

    throw new StudioHttpError(
      `写入内容失败：${error instanceof Error ? error.message : String(error)}`,
      500,
    )
  }

  return effective
}

function parseCommitRequest(value: unknown): StudioCommitRequest {
  if (!value || typeof value !== 'object')
    throw new StudioHttpError('提交请求无效。')

  const body = value as Record<string, unknown>
  const expectedHeadSha = String(body.expectedHeadSha || '')
  const expectedRevision = String(body.expectedRevision || '')
  const message = String(body.message || '').trim()
  const rawChanges = Array.isArray(body.changes) ? body.changes : []

  if (!/^[a-f0-9]{40,64}$/i.test(expectedHeadSha))
    throw new StudioHttpError('Git HEAD 信息无效，请刷新后重试。')
  if (!expectedRevision)
    throw new StudioHttpError('工作区版本信息无效，请刷新后重试。')
  if (!message)
    throw new StudioHttpError('提交信息不能为空。')
  if (message.length > 500)
    throw new StudioHttpError('提交信息过长。')
  if (!rawChanges.length || rawChanges.length > 500)
    throw new StudioHttpError('提交文件数量无效。')

  const seen = new Set<string>()
  const changes: StudioFileChange[] = rawChanges.map((rawChange) => {
    const change = rawChange as Record<string, unknown>
    const action = change.action
    if (action !== 'create' && action !== 'update' && action !== 'delete')
      throw new StudioHttpError('文件操作类型无效。')

    const path = validateContentPath(change.path, action)
    if (seen.has(path))
      throw new StudioHttpError(`提交中包含重复文件：${path}`)
    seen.add(path)

    if (action !== 'delete' && typeof change.content !== 'string')
      throw new StudioHttpError(`文件内容无效：${path}`)

    return {
      path,
      action,
      content: action === 'delete' ? undefined : String(change.content),
    }
  })

  return {
    expectedHeadSha,
    expectedRevision,
    message,
    changes,
  }
}

function commitUrl(remote: string, sha: string) {
  const cleaned = remote.trim().replace(/\.git$/, '')
  const httpsMatch = cleaned.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)$/)
  const sshMatch = cleaned.match(/^git@github\.com:([^/]+)\/([^/]+)$/)
  const match = httpsMatch || sshMatch
  return match ? `https://github.com/${match[1]}/${match[2]}/commit/${sha}` : undefined
}

async function tryPush(root: string, branch: string) {
  if (branch === 'detached')
    return { pushed: false, error: '当前处于 detached HEAD，无法自动推送。' }

  const upstream = await runGit(root, [
    'rev-parse',
    '--abbrev-ref',
    '--symbolic-full-name',
    '@{upstream}',
  ])

  const pushResult = upstream.code === 0
    ? await runGit(root, ['push'], 180_000)
    : await runGit(root, ['push', '-u', 'origin', branch], 180_000)

  if (pushResult.code !== 0) {
    return {
      pushed: false,
      error: gitFailure(pushResult, 'Git 提交已创建，但推送失败。'),
    }
  }

  return { pushed: true }
}

async function commitContent(root: string, body: unknown): Promise<StudioCommitResult> {
  const request = parseCommitRequest(body)
  const before = await readRepositorySnapshot(root)

  if (before.headSha !== request.expectedHeadSha) {
    throw new StudioHttpError('Git HEAD 已变化，请先刷新内容后重新提交。', 409)
  }
  if (before.revision !== request.expectedRevision) {
    throw new StudioHttpError('内容文件已被其他程序修改，请先刷新后重新提交。', 409)
  }

  const effectiveChanges = await applyFileChanges(root, request.changes)
  const paths = effectiveChanges.map(change => change.path)

  const addResult = await runGit(root, ['add', '--', ...paths])
  if (addResult.code !== 0) {
    throw new StudioHttpError(gitFailure(addResult, 'Git 暂存失败，修改仍保留在本地文件中。'), 500)
  }

  const diffResult = await runGit(root, ['diff', '--cached', '--quiet', '--', ...paths])
  if (diffResult.code === 0)
    throw new StudioHttpError('Git 中没有产生实际差异，请刷新后重试。', 409)
  if (diffResult.code !== 1)
    throw new StudioHttpError(gitFailure(diffResult, '无法检查 Git 暂存内容。'), 500)

  const commitResult = await runGit(root, ['commit', '-m', request.message, '--', ...paths], 180_000)
  if (commitResult.code !== 0) {
    throw new StudioHttpError(
      gitFailure(commitResult, 'Git 提交失败，修改仍保留在本地文件中。'),
      500,
    )
  }

  const sha = await gitOrThrow(root, ['rev-parse', 'HEAD'], '无法读取新提交。')
  const branch = await gitOrThrow(root, ['branch', '--show-current'], '无法读取当前分支。')
  const push = await tryPush(root, branch)
  const remoteResult = await runGit(root, ['remote', 'get-url', 'origin'])

  return {
    sha,
    branch,
    pushed: push.pushed,
    pushError: push.error,
    url: remoteResult.code === 0 ? commitUrl(remoteResult.stdout, sha) : undefined,
  }
}

function sendJson(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function isLocalRequest(request: Request) {
  const hostHeader = request.headers.get('host') || ''
  let hostname = ''
  try {
    hostname = new URL(`http://${hostHeader}`).hostname
  }
  catch {
    return false
  }

  if (!['127.0.0.1', 'localhost', '::1'].includes(hostname))
    return false
  return true
}

async function readJsonBody(request: Request) {
  const text = await request.text()
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_SIZE)
    throw new StudioHttpError('提交内容过大。', 413)

  try {
    return JSON.parse(text)
  }
  catch {
    throw new StudioHttpError('提交内容不是有效 JSON。')
  }
}

export async function handleStudioRequest(request: Request, root = process.cwd()) {
  const url = new URL(request.url)
  const pathname = url.pathname.replace(/\/+$/, '')
  if (!pathname.startsWith('/api/studio/'))
    return sendJson(404, { message: '内容服务接口不存在。' })

  if (!isLocalRequest(request))
    return sendJson(403, { message: '内容服务只允许本机访问。' })
  if (request.headers.get(STUDIO_HEADER) !== '1')
    return sendJson(403, { message: '缺少本地内容工作台请求头。' })

  try {
    if (request.method === 'GET' && pathname === '/api/studio/content')
      return sendJson(200, await readRepositorySnapshot(root))

    if (request.method === 'POST' && pathname === '/api/studio/commit') {
      const body = await readJsonBody(request)
      return sendJson(200, await commitContent(root, body))
    }

    return sendJson(404, { message: '内容服务接口不存在。' })
  }
  catch (error) {
    const status = error instanceof StudioHttpError ? error.status : 500
    const message = error instanceof Error ? error.message : String(error)
    return sendJson(status, { message })
  }
}
