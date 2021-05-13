import fs from 'fs'
import crypto from 'crypto'
import path from 'path'
import { CWD, findGitRepoRootDir, FIELD, VERSION, logger } from '../utils'
import { LocalObject } from './types'
import { Git } from '../git'
import { XDelta } from '../xdelta'
import { downloadFile } from '../server'

const ZERO_SHA256 =
  '0000000000000000000000000000000000000000000000000000000000000000'

/** a handler to operate a git LFSD repo */
export class LargeFileStorageDelta {
  constructor(workingPath: string) {
    this.root = findGitRepoRootDir(workingPath)
    this.localCachePath = path.join(this.root, '.git', FIELD, 'objects')
    this.tempPath = path.join(this.root, '.git', FIELD, 'temp')
    this.git = new Git(workingPath)
    this.xdelta = new XDelta(workingPath)
  }

  /** top level / root directory path of working tree */
  readonly root: string

  /** directory path where to store local storage objects */
  readonly localCachePath: string

  /** directory path where to store temporary files */
  readonly tempPath: string

  /** general git operator */
  readonly git: Git

  /** xdelta instance */
  readonly xdelta: XDelta

  /** write a file to local storage and add a source pointer in its head */
  writeObject = (
    filePath: string,
    fileContent: Buffer,
    pointer = ZERO_SHA256,
  ) => {
    fs.writeFileSync(
      filePath,
      Buffer.concat([Buffer.from(`S ${pointer}\n`, 'utf-8'), fileContent]),
    )
  }

  /** read a LFSD object, return its real content and source pointer separately */
  parseObject = (objectBuffer: Buffer) => {
    /** find first \n */
    const firstNewlineIndex = objectBuffer.findIndex((val) => val === 10)

    // split out first line
    const sourcePointerLine = objectBuffer
      .slice(0, firstNewlineIndex)
      .toString()

    if (!/^S \d{64}$/.test(sourcePointerLine)) {
      throw new Error(
        'LFSD: Bad object file format! No source pointer at the beginning!',
      )
    }

    return {
      sourceOid: sourcePointerLine.slice(2),
      fileContent: objectBuffer.slice(firstNewlineIndex + 1),
    }
  }

  /** create a temporary file */
  addTempFile = (fileName: string, fileContent: Buffer) => {
    if (!fs.existsSync(this.tempPath)) {
      fs.mkdirSync(this.tempPath, { recursive: true })
    }
    const filePath = path.join(this.tempPath, fileName)
    fs.writeFileSync(filePath, fileContent)
    return filePath
  }

  /** clear temporary file directory */
  clearTempFiles = () => {
    fs.rmdirSync(this.tempPath, { recursive: true })
  }

  /** get object local storage path from sha256 */
  objectPath = (sha256: string, dirOnly = false) => {
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
  add = (fileContent: Buffer, filePath: string): LocalObject => {
    /** file content SHA-256 */
    const sha256 = crypto.createHash('sha256').update(fileContent).digest('hex')
    const size = fileContent.byteLength
    const dirPath = this.objectPath(sha256, true)
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
    const storageFilePath = this.objectPath(sha256)

    /** file content in last commit */
    const lastCommittedPointer = this.git.showFileContent(filePath, 'HEAD~1')
    if (lastCommittedPointer === null) {
      // if no last commit version, store as it is and give a zero pointer
      this.writeObject(storageFilePath, fileContent)
    } else {
      const {} = this.parsePointer(lastCommittedPointer)

      // if last commit version exists, try to compress it with Xdelta, implementation here may cause I/O and disk space problem, better implement a XDelta handler with Buffer type input
      

      // if size of delta > size of last commit version, use last commit version it self
    }

    return { sha256, size, filePath: storageFilePath }
  }

  /** get a raw LFSD object by its oid(sha256)
   *
   * this will try to find the object in LFSD local storage, if it does not exists in local storage,
   * will try to download it from remote server and store it in local storage
   *
   * this method won't try to decompress a delta pointer, but return its raw content
   *
   * @param sha256 - oid
   * @param pathOnly - return object path in local storage but not file content Buffer
   */
  getRawObjectByOid = async (sha256: string, pathOnly = false) => {
    const localStorageFilePath = this.objectPath(sha256)
    if (fs.existsSync(localStorageFilePath)) {
      // if exists in local storage, return it
      if (pathOnly) {
        return localStorageFilePath
      }
      return fs.readFileSync(localStorageFilePath)
    }

    // if not exists in local storage, try to fetch from remote server
    const fileContent = await downloadFile(
      this.objectPath(sha256, true),
      localStorageFilePath,
    )
    if (pathOnly) {
      return localStorageFilePath
    }
    return fileContent
  }

  /** get a LFSD object by its oid(sha256), with decompressing delta pointer, the returned object won't include any source pointer */
  getObjectByOid = async (sha256: string) => {
    const sourceOid = ZERO_SHA256

    const obj = Buffer.from('', 'utf-8')

    // TODO: 从输入 oid 指向的 delta 一直找到 zero obj，记录下这个过程中的所有 oid，倒过来一个一个 decompress 还原
    do {
      //
    } while (sourceOid !== ZERO_SHA256)
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
    const versionRegExecArray = /version ([A-Za-z@\d]+)/.exec(pointer)
    const sha256RegExecArray = /oid sha256:([a-f0-9]{64})/.exec(pointer)
    const sizeRegExecArray = /size (\d+)/.exec(pointer)

    if (
      versionRegExecArray === null ||
      sha256RegExecArray === null ||
      sizeRegExecArray === null
    ) {
      throw new Error('Not a standard pointer file')
    }

    const version = versionRegExecArray[1]
    const sha256 = sha256RegExecArray[1]
    const size = parseInt(sizeRegExecArray[1], 10)

    return {
      version,
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
