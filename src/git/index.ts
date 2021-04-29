import { CWD, spawnSync, findGitRepoRootDir } from '../utils'
import { Ref } from './types'
import { parseRefToTypeAndName } from './utils'

export class Git {
  constructor(path: string) {
    this.path = findGitRepoRootDir(path)
  }

  readonly path: string

  /** resolve a ref name using git rev-parse */
  resolveRef = (ref: string): Ref => {
    const output = spawnSync(
      'git',
      ['rev-parse', ref, '--symbolic-full-name', ref],
      {
        cwd: this.path,
      },
    )

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

  /** git rev-list --objects fromRef..toRef */
  revListObjects = (
    fromRef: string,
    toRef: string,
  ): {
    sha: string
    filePath?: string
  }[] => {
    const lines = spawnSync(
      'git',
      ['rev-list', '--objects', `${fromRef}..${toRef}`],
      {
        cwd: this.path,
      },
    ).split('\n')

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
}

export default new Git(CWD)

const a = new Git(CWD)
