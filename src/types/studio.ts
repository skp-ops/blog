export interface StudioFile {
  path: string
  content: string
}

export interface StudioSnapshot {
  headSha: string
  branch: string
  remote: string
  dirty: boolean
  revision: string
  files: StudioFile[]
}

export interface StudioFileChange {
  path: string
  action: 'create' | 'update' | 'delete'
  content?: string
  encoding?: 'utf8' | 'base64'
}

export interface StudioCommitRequest {
  expectedHeadSha: string
  expectedRevision: string
  message: string
  changes: StudioFileChange[]
}

export interface StudioCommitResult {
  sha: string
  branch: string
  pushed: boolean
  pushError?: string
  url?: string
}
