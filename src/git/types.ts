export type RefType =
  | 'localBranch'
  | 'remoteBranch'
  | 'localTag'
  | 'remoteTag'
  | 'HEAD'
  | 'other'

export interface Ref {
  name: string
  type: RefType
  sha: string
}
