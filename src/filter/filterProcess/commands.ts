import fs from 'fs'
import path from 'path'
import { storeFileToLocalCache, localCachePath } from '../utils'
import { uploadFile, downloadFile } from '../../server'
import { VERSION } from '../../utils'

export async function clean(input: Buffer): Promise<Buffer> {
  // store input to local cache
  const { sha256, size, filePath } = storeFileToLocalCache(input)

  // upload stdin to server
  // TODO: this should be done at pre-push hooks
  await uploadFile(
    filePath,
    path.join(sha256.slice(0, 2), sha256.slice(2, 4), sha256),
  )

  // write index to stdout
  const index = `version ${VERSION}\noid sha256:${sha256}\nsize ${size}\n`

  return Buffer.from(index)
}

export async function smudge(input: Buffer): Promise<Buffer> {
  // read index from input
  const index = input.toString()
  const sha256RegExecArray = /oid sha256:([a-f0-9]{64})/.exec(index)
  if (sha256RegExecArray === null) {
    // not standard index file format, return as it is
    return input
  }
  const sha256 = sha256RegExecArray[1]

  const objectPath = path.join(
    localCachePath,
    sha256.slice(0, 2),
    sha256.slice(2, 4),
    sha256,
  )

  if (fs.existsSync(objectPath)) {
    // try to fetch file content from local cache
    return fs.readFileSync(objectPath)
  }
  // if not exists in local cache, try to fetch from server
  return downloadFile(
    path.join(sha256.slice(0, 2), sha256.slice(2, 4), sha256),
    objectPath,
  )
}
