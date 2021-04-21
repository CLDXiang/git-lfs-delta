import fs from 'fs'
import crypto from 'crypto'
import path from 'path'
import { localCachePath } from '../utils'
import { uploadFile } from '../../server'
import { VERSION } from '../../utils'

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

  const filePath = path.join(dirPath, sha256)
  fs.writeFileSync(filePath, fileContent)

  return { sha256, size, filePath }
}

export async function clean() {
  /** stdin */
  const stdin = fs.readFileSync(0)

  // store stdin to local cache
  const { sha256, size, filePath } = storeFileToLocalCache(stdin)

  // upload stdin to server
  await uploadFile(
    filePath,
    path.join(sha256.slice(0, 2), sha256.slice(2, 4), sha256),
  )

  // write index to stdout
  const index = `version ${VERSION}\noid sha256:${sha256}\nsize ${size}\n`

  process.stdout.write(index, 'utf-8')
}
