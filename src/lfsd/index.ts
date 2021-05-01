import fs from 'fs'
import crypto from 'crypto'
import path from 'path'
import { CWD, findGitRepoRootDir, FIELD, VERSION } from '../utils'
import { LocalObject } from './types'
import { Git } from '../git'

/** a handler to operate a git LFSD repo */
export class LargeFileStorageDelta {
  constructor(workingPath: string) {
    this.root = findGitRepoRootDir(workingPath)
    this.localCachePath = path.join(this.root, '.git', FIELD, 'objects')
    this.git = new Git(workingPath)
  }

  /** top level / root directory path of working tree */
  readonly root: string

  /** directory path where to store local storage objects */
  readonly localCachePath: string

  /** general git operator */
  readonly git: Git

  /** get object local storage path from sha256 */
  private objectPath = (sha256: string, dirOnly = false) => {
    if (dirOnly) {
      return path.join(
        this.localCachePath,
        sha256.slice(0, 2),
        sha256.slice(2, 4),
      )
    }
    return path.join(
      this.localCachePath,
      sha256.slice(0, 2),
      sha256.slice(2, 4),
      sha256,
    )
  }

  /** add object to local storage */
  add = (fileContent: Buffer): LocalObject => {
    /** file content SHA-256 */
    const sha256 = crypto.createHash('sha256').update(fileContent).digest('hex')
    const size = fileContent.byteLength

    const dirPath = this.objectPath(sha256, true)

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }

    const filePath = this.objectPath(sha256)
    fs.writeFileSync(filePath, fileContent)

    return { sha256, size, filePath }
  }

  /** check if an object exists in local storage */
  existsLocal = (sha256: string) => {
    return fs.existsSync(this.objectPath(sha256))
  }

  /** generate pointer content of a local object */
  generatePointer = (localObject: LocalObject) =>
    `version ${VERSION}\noid sha256:${localObject.sha256}\nsize ${localObject.size}\n`

  /** parse pointer content to a local object */
  parsePointer = (pointer: string) => {
    const sha256RegExecArray = /oid sha256:([a-f0-9]{64})/.exec(pointer)
    const sizeRegExecArray = /size (\d+)/.exec(pointer)

    if (sha256RegExecArray === null || sizeRegExecArray === null) {
      throw new Error('Not a standard pointer file')
    }
    const sha256 = sha256RegExecArray[1]
    const size = parseInt(sizeRegExecArray[1], 10)

    return {
      sha256,
      size,
      filePath: path.join(
        this.localCachePath,
        sha256.slice(0, 2),
        sha256.slice(2, 4),
        sha256,
      ),
    }
  }
}

export default new LargeFileStorageDelta(CWD)
