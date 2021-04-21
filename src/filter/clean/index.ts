import fs from 'fs'
import crypto from 'crypto'
import path from 'path'
import { localCachePath } from '../utils'

function storeFileToLocalCache(fileContent: Buffer) {
  /** file content SHA-256 */
  const sha256 = crypto.createHash('sha256').update(fileContent).digest('hex')
  const size = fileContent.byteLength

  const dirPath = path.join(
    localCachePath,
    sha256.slice(0, 2),
    sha256.slice(2, 4),
  )

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }

  fs.writeFileSync(path.join(dirPath, sha256), fileContent)

  return { sha256, size }
}

export function clean() {
  /** stdin */
  const stdin = fs.readFileSync(0)

  // store stdin to local cache
  const { sha256, size } = storeFileToLocalCache(stdin)

  // TODO: upload stdin to server

  // write index to stdout
  const index = `version lfsd@1\noid sha256:${sha256}\nsize ${size}\n`

  process.stdout.write(index, 'utf-8')
}
