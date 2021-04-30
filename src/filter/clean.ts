import fs from 'fs'
import path from 'path'
import lfsd from '../lfsd'
import { uploadFile } from '../server'

export async function clean() {
  /** stdin */
  const stdin = fs.readFileSync(0)

  // store stdin to local cache
  const { sha256, size, filePath } = lfsd.add(stdin)

  // upload stdin to server
  // TODO: this should be done at pre-push hooks
  await uploadFile(
    filePath,
    path.join(sha256.slice(0, 2), sha256.slice(2, 4), sha256),
  )

  // write pointer to stdout
  const pointer = lfsd.generatePointer({ sha256, size, filePath })

  process.stdout.write(pointer, 'utf-8')
}
