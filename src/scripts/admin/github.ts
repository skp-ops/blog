export interface GitHubConfig {
  owner: string
  repo: string
  branch: string
  token: string
}

export interface RepositoryInfo {
  fullName: string
  defaultBranch: string
  private: boolean
}

export interface GitTreeEntry {
  path: string
  mode: string
  type: 'blob' | 'tree' | 'commit'
  sha: string
  size?: number
}

export interface ContentFile {
  path: string
  sha: string
  content: string
}

export interface FileChange {
  path: string
  action: 'create' | 'update' | 'delete'
  content?: string
}

export interface CommitResult {
  sha: string
  url: string
}

interface GitHubRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH'
  body?: unknown
}

interface GitHubRequestResult<T> {
  data: T
  headers: Headers
}

interface GitRefResponse {
  object: {
    sha: string
    type: string
  }
}

interface GitCommitResponse {
  sha: string
  tree: {
    sha: string
  }
}

interface GitHubCommitResponse {
  sha: string
  commit: {
    tree: {
      sha: string
    }
  }
}

interface GitTreeResponse {
  sha: string
  tree: GitTreeEntry[]
  truncated: boolean
}

interface GitBlobResponse {
  content: string
  encoding: string
}

interface GitBlobCreateResponse {
  sha: string
}

interface GitTreeCreateResponse {
  sha: string
}

export class GitHubApiError extends Error {
  readonly status: number
  readonly remaining?: number
  readonly resetAt?: Date

  constructor(message: string, status: number, remaining?: number, resetAt?: Date) {
    super(message)
    this.name = 'GitHubApiError'
    this.status = status
    this.remaining = remaining
    this.resetAt = resetAt
  }
}

function authHeaders(token: string) {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }

  if (token.trim())
    headers.Authorization = `Bearer ${token.trim()}`

  return headers
}

async function request<T>(
  config: GitHubConfig,
  endpoint: string,
  options: GitHubRequestOptions = {},
): Promise<GitHubRequestResult<T>> {
  const response = await fetch(`https://api.github.com${endpoint}`, {
    method: options.method || 'GET',
    headers: authHeaders(config.token),
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: 'no-store',
  })

  const text = await response.text()
  let payload: any = null
  if (text) {
    try {
      payload = JSON.parse(text)
    }
    catch {
      payload = { message: text }
    }
  }

  if (!response.ok) {
    const remainingHeader = response.headers.get('x-ratelimit-remaining')
    const resetHeader = response.headers.get('x-ratelimit-reset')
    const remaining = remainingHeader === null ? undefined : Number(remainingHeader)
    const resetAt = resetHeader === null ? undefined : new Date(Number(resetHeader) * 1000)
    const apiMessage = payload?.message || `GitHub 请求失败（${response.status}）`
    throw new GitHubApiError(apiMessage, response.status, remaining, resetAt)
  }

  return {
    data: payload as T,
    headers: response.headers,
  }
}

export function parseRepository(value: string) {
  const trimmed = value.trim().replace(/\.git$/, '').replace(/\/$/, '')
  const match = trimmed.match(/(?:github\.com[/:])?([^/\s]+)\/([^/\s]+)$/)

  if (!match)
    throw new Error('仓库格式应为 owner/repo，例如 skp-ops/blog')

  return {
    owner: match[1],
    repo: match[2],
  }
}

function repositoryPath(config: GitHubConfig) {
  return `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}`
}

function branchRef(config: GitHubConfig) {
  return `heads/${config.branch.split('/').map(encodeURIComponent).join('/')}`
}

export async function getRepositoryInfo(config: GitHubConfig): Promise<RepositoryInfo> {
  const { data } = await request<{
    full_name: string
    default_branch: string
    private: boolean
  }>(config, repositoryPath(config))

  return {
    fullName: data.full_name,
    defaultBranch: data.default_branch,
    private: data.private,
  }
}

export async function getBranchHead(config: GitHubConfig): Promise<string> {
  const { data } = await request<GitRefResponse>(
    config,
    `${repositoryPath(config)}/git/ref/${branchRef(config)}`,
  )

  return data.object.sha
}

export async function getBranchSnapshot(
  config: GitHubConfig,
): Promise<{ headSha: string, treeSha: string }> {
  const { data } = await request<GitHubCommitResponse>(
    config,
    `${repositoryPath(config)}/commits/${encodeURIComponent(config.branch)}`,
  )

  return {
    headSha: data.sha,
    treeSha: data.commit.tree.sha,
  }
}

export async function getContentTree(
  config: GitHubConfig,
  treeSha: string,
): Promise<{ treeSha: string, entries: GitTreeEntry[] }> {
  const { data } = await request<GitTreeResponse>(
    config,
    `${repositoryPath(config)}/git/trees/${treeSha}?recursive=1`,
  )

  if (data.truncated)
    throw new Error('仓库文件树过大，GitHub 返回了截断数据。请缩小仓库或改用本地 Git 方式。')

  return {
    treeSha: data.sha,
    entries: data.tree,
  }
}

function decodeBase64Utf8(value: string) {
  const binary = atob(value.replace(/\s/g, ''))
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export async function getTextFiles(
  config: GitHubConfig,
  entries: GitTreeEntry[],
  refSha: string,
): Promise<ContentFile[]> {
  if (!config.token.trim()) {
    return Promise.all(entries.map(async (entry) => {
      const encodedPath = entry.path.split('/').map(encodeURIComponent).join('/')
      const response = await fetch(
        `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${refSha}/${encodedPath}`,
        { cache: 'no-store' },
      )

      if (!response.ok) {
        throw new GitHubApiError(
          `无法读取 ${entry.path}（${response.status}）`,
          response.status,
        )
      }

      return {
        path: entry.path,
        sha: entry.sha,
        content: await response.text(),
      }
    }))
  }

  const files: ContentFile[] = []
  const queue = [...entries]

  async function worker() {
    let entry = queue.shift()
    while (entry) {
      const { data } = await request<GitBlobResponse>(
        config,
        `${repositoryPath(config)}/git/blobs/${entry.sha}`,
      )

      const content = data.encoding === 'base64'
        ? decodeBase64Utf8(data.content)
        : data.content

      files.push({
        path: entry.path,
        sha: entry.sha,
        content,
      })
      entry = queue.shift()
    }
  }

  await Promise.all(Array.from({ length: Math.min(6, entries.length) }, worker))
  return files
}

export async function commitFiles(
  config: GitHubConfig,
  expectedHeadSha: string,
  message: string,
  changes: FileChange[],
): Promise<CommitResult> {
  if (!config.token.trim())
    throw new Error('提交到 Git 前需要填写 GitHub Token。')

  if (!changes.length)
    throw new Error('没有可提交的修改。')

  const currentHead = await getBranchHead(config)
  if (currentHead !== expectedHeadSha) {
    throw new Error('远端分支已更新。请先同步最新内容，再重新提交。')
  }

  const { data: headCommit } = await request<GitCommitResponse>(
    config,
    `${repositoryPath(config)}/git/commits/${currentHead}`,
  )

  const blobs = await Promise.all(changes
    .filter(change => change.action !== 'delete')
    .map(async (change) => {
      const { data } = await request<GitBlobCreateResponse>(
        config,
        `${repositoryPath(config)}/git/blobs`,
        {
          method: 'POST',
          body: {
            content: change.content ?? '',
            encoding: 'utf-8',
          },
        },
      )

      return {
        path: change.path,
        sha: data.sha,
      }
    }))

  const blobMap = new Map(blobs.map(blob => [blob.path, blob.sha]))
  const treeEntries = changes.map(change => ({
    path: change.path,
    mode: '100644',
    type: 'blob',
    sha: change.action === 'delete' ? null : blobMap.get(change.path),
  }))

  const { data: tree } = await request<GitTreeCreateResponse>(
    config,
    `${repositoryPath(config)}/git/trees`,
    {
      method: 'POST',
      body: {
        base_tree: headCommit.tree.sha,
        tree: treeEntries,
      },
    },
  )

  const { data: commit } = await request<GitCommitResponse>(
    config,
    `${repositoryPath(config)}/git/commits`,
    {
      method: 'POST',
      body: {
        message,
        tree: tree.sha,
        parents: [currentHead],
      },
    },
  )

  await request<GitRefResponse>(
    config,
    `${repositoryPath(config)}/git/refs/${branchRef(config)}`,
    {
      method: 'PATCH',
      body: {
        sha: commit.sha,
        force: false,
      },
    },
  )

  return {
    sha: commit.sha,
    url: `https://github.com/${config.owner}/${config.repo}/commit/${commit.sha}`,
  }
}
