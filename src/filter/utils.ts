import fs from 'fs'
import crypto from 'crypto'
import path from 'path'
import { absPath, FIELD } from '../utils'

export const localCachePath = absPath(`.git/${FIELD}/objects`)

export function storeFileToLocalCache(fileContent: Buffer) {
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
