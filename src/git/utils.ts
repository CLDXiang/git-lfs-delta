import { RefType } from './types'

/** get the type and name of a git ref */
export function parseRefToTypeAndName(
  ref: string,
): {
  name: string
  type: RefType
} {
  const PREFIX_LOCAL = 'refs/heads/'
  const PREFIX_REMOTE = 'refs/remotes/'
  const PREFIX_LOCAL_TAG = 'refs/tags/'

  let name = ref
  let type: RefType = 'other'

  if (ref === 'HEAD') {
    name = ref
    type = 'HEAD'
  } else if (ref.startsWith(PREFIX_LOCAL)) {
    name = ref.slice(PREFIX_LOCAL.length)
    type = 'localBranch'
  } else if (ref.startsWith(PREFIX_REMOTE)) {
    name = ref.slice(PREFIX_REMOTE.length)
    type = 'remoteBranch'
  } else if (ref.startsWith(PREFIX_LOCAL_TAG)) {
    name = ref.slice(PREFIX_LOCAL_TAG.length)
    type = 'localTag'
  }

  return {
    name,
    type,
  }
}
