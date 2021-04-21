import fs from 'fs'
import path from 'path'
import { downloadFile } from '../../server'
import { localCachePath } from '../utils'

export async function smudge() {
  // read index from working directory
  const index = fs.readFileSync(0, 'utf-8')
  const sha256RegExecArray = /oid sha256:([a-f0-9]{64})/.exec(index)
  if (sha256RegExecArray === null) {
    // not standard index file format, return as it is
    process.stdout.write(index, 'utf-8')
    return
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
    process.stdout.write(fs.readFileSync(objectPath))
  } else {
    // if not exists in local cache, try to fetch from server
    process.stdout.write(
      await downloadFile(
        path.join(sha256.slice(0, 2), sha256.slice(2, 4), sha256),
        objectPath,
      ),
    )
  }
}
