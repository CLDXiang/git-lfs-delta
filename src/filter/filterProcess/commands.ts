import fs from 'fs'
import path from 'path'
import lfsdCwd from '../../lfsd'
import { uploadFile, downloadFile } from '../../server'

export async function clean(input: Buffer, lfsd = lfsdCwd): Promise<Buffer> {
  // store input to local cache
  const { sha256, size, filePath } = lfsd.add(input)

  // upload stdin to server
  // TODO: this should be done at pre-push hooks
  await uploadFile(
    filePath,
    path.join(sha256.slice(0, 2), sha256.slice(2, 4), sha256),
  )

  // write pointer to stdout
  const pointer = lfsd.generatePointer({ sha256, size, filePath })

  return Buffer.from(pointer)
}

export async function smudge(input: Buffer, lfsd = lfsdCwd): Promise<Buffer> {
  // read pointer from input
  const pointer = input.toString()

  const { sha256, filePath } = lfsd.parsePointer(pointer)

  if (fs.existsSync(filePath)) {
    // try to fetch file content from local cache
    return fs.readFileSync(filePath)
  }
  // if not exists in local cache, try to fetch from server
  return downloadFile(
    path.join(sha256.slice(0, 2), sha256.slice(2, 4), sha256),
    filePath,
  )
}
