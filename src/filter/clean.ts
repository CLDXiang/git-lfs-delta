import fs from 'fs'
import path from 'path'
import { storeFileToLocalCache } from './utils'
import { uploadFile } from '../server'
import { VERSION } from '../utils'

export async function clean() {
  /** stdin */
  const stdin = fs.readFileSync(0)

  // store stdin to local cache
  const { sha256, size, filePath } = storeFileToLocalCache(stdin)

  // upload stdin to server
  // TODO: this should be done at pre-push hooks
  await uploadFile(
    filePath,
    path.join(sha256.slice(0, 2), sha256.slice(2, 4), sha256),
  )

  // write index to stdout
  const index = `version ${VERSION}\noid sha256:${sha256}\nsize ${size}\n`

  process.stdout.write(index, 'utf-8')
}
