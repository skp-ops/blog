import type {
  StudioCommitRequest,
  StudioCommitResult,
  StudioSnapshot,
} from '@/types/studio'

export class StudioApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'StudioApiError'
    this.status = status
  }
}

async function studioRequest<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/studio/${endpoint}/`, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Studio': '1',
      ...init.headers,
    },
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

  if (!response.ok)
    throw new StudioApiError(payload?.message || `本地内容服务请求失败（${response.status}）`, response.status)

  return payload as T
}

export function getStudioSnapshot() {
  return studioRequest<StudioSnapshot>('content')
}

export function commitStudioChanges(request: StudioCommitRequest) {
  return studioRequest<StudioCommitResult>('commit', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}
