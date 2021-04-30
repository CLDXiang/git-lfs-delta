/** git reference type */
export type RefType =
  | 'localBranch'
  | 'remoteBranch'
  | 'localTag'
  | 'remoteTag'
  | 'HEAD'
  | 'other'

/** a git reference */
export interface Ref {
  name: string
  type: RefType
  sha: string
}

/** object item output by "git rev-list --objects" */
export interface RevListObject {
  sha: string
  filePath?: string
}
