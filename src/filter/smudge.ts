import fs from 'fs'
import path from 'path'
import { downloadFile } from '../server'
import lfsd from '../lfsd'

export async function smudge() {
  // read pointer from working directory
  const pointer = fs.readFileSync(0, 'utf-8')
  const { sha256, filePath } = lfsd.parsePointer(pointer)

  if (fs.existsSync(filePath)) {
    // try to fetch file content from local cache
    process.stdout.write(fs.readFileSync(filePath))
  } else {
    // if not exists in local cache, try to fetch from server
    process.stdout.write(
      await downloadFile(
        path.join(sha256.slice(0, 2), sha256.slice(2, 4), sha256),
        filePath,
      ),
    )
  }
}
