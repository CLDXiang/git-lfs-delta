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

  /** git rev-list --objects fromRef..toRef
   * if fromRef not provided, exec git rev-list --objects toRef
   */
  revListObjects = (toRef: string, fromRef?: string): RevListObject[] => {
    const lines = spawnSync(
      'git',
      ['rev-list', '--objects', `${fromRef ? `${fromRef}..` : ''}${toRef}`],
      {
        cwd: this.root,
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

export { RevListObject }
export default new Git(CWD)
