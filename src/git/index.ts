import fs from 'fs'
import path from 'path'
import { CWD, spawnSync, findGitRepoRootDir } from '../utils'
import { Ref, RevListObject } from './types'
import { parseRefToTypeAndName } from './utils'

export class Git {
  constructor(workingPath: string) {
    this.root = findGitRepoRootDir(workingPath)
  }

  /** top level / root directory path of working tree */
  readonly root: string

  /** resolve a ref name using git rev-parse */
  resolveRef = (ref: string): Ref => {
    const output = spawnSync(
      'git',
      ['rev-parse', ref, '--symbolic-full-name', ref],
      {
        cwd: this.root,
      },
    ).toString()

    const lines = output.split('\n')

    if (lines.length === 1) {
      // no symbolic-full-name
      return {
        name: lines[0],
        sha: lines[0],
        type: 'other',
      }
    }

    // parse the symbolic-full-name
    const { name, type } = parseRefToTypeAndName(lines[1])

    return {
      name,
      sha: lines[0],
      type,
    }
  }

  /** get current ref */
  get currentRef() {
    return this.resolveRef('HEAD')
  }

  /** parse absRef and sha to Ref object */
  parseRef = (absRef: string, sha: string) => {
    const ref: Ref = {
      name: '',
      type: 'other',
      sha,
    }
    if (absRef.startsWith('refs/heads/')) {
      ref.name = absRef.slice(11)
      ref.type = 'localBranch'
    } else if (absRef.startsWith('refs/tags')) {
      ref.name = absRef.slice(10)
      ref.type = 'localTag'
    } else if (absRef.startsWith('refs/remotes/')) {
      ref.name = absRef.slice(13)
      ref.type = 'remoteBranch'
    } else {
      ref.name = absRef
      ref.type = absRef === 'HEAD' ? 'HEAD' : 'other'
    }
    return ref
  }

  /** returns true if the string is a valid hexadecimal Git object ID and represents the all-zeros object ID for some hash algorithm. */
  isZeroObjectID = (s: string) => {
    return (
      s === '0000000000000000000000000000000000000000' ||
      '0000000000000000000000000000000000000000000000000000000000000000'
    )
  }

  /** git rev-list --objects fromRef..toRef
   *
   * if fromRef not provided, exec git rev-list --objects toRef
   *
   * @param refs [toRef, fromRef?]
   * @param all pass --all option
   */
  revListObjects = (
    /** [toRef, fromRef?] */
    refs: string[],
    /** pass --all option */
    all = false,
  ): RevListObject[] => {
    const [toRef, fromRef] = refs
    const lines = spawnSync(
      'git',
      all
        ? [
            'rev-list',
            '--objects',
            '--all',
            `${fromRef ? `${fromRef}..` : ''}${toRef}`,
          ]
        : ['rev-list', '--objects', `${fromRef ? `${fromRef}..` : ''}${toRef}`],
      {
        cwd: this.root,
      },
    )
      .toString()
      .split('\n')

    return lines
      .filter((line) => line.trim())
      .map((line) => {
        const arr = line.split(' ')
        return {
          sha: arr[0],
          filePath: arr.slice(1).join(' ') || undefined,
        }
      })
  }

  /** read file content of .gitattributes */
  get attributesFileContent() {
    const attributesFilePath = path.join(this.root, '.gitattributes')
    if (!fs.existsSync(attributesFilePath)) {
      return ''
    }
    return fs.readFileSync(attributesFilePath, 'utf-8')
  }

  /** git cat-file -p sha1 */
  catFile = (sha1: string) => {
    return spawnSync('git', ['cat-file', '-p', sha1], {
      cwd: this.root,
    })
  }
}

export { RevListObject, Ref }
export default new Git(CWD)
