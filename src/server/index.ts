import { createReadStream, writeFileSync, existsSync, mkdirSync } from 'fs'
import path from 'path'
import FormData from 'form-data'
import { API, absPath } from '../utils'

export async function uploadFile(localPath: string, serverPath: string) {
  // TODO: progress, do this after move caller to pre-push hooks
  const data = new FormData()

  data.append('file', createReadStream(absPath(localPath)))
  data.append('path', serverPath)
  return API.post('upload', data, {
    headers: {
      ...data.getHeaders(),
    },
  })
}

// eslint-disable-next-line consistent-return
export async function downloadFile(
  serverPath: string,
  localPath: string,
): Promise<Buffer> {
  const resp = await API.post<{
    type: string
    data: number[]
  }>('download', { path: serverPath })

  if (resp.status === 200) {
    const buffer = Buffer.from(resp.data.data)
    if (!existsSync(path.dirname(absPath(localPath)))) {
      // if dir not exist, create it
      mkdirSync(path.dirname(absPath(localPath)))
    }
    writeFileSync(absPath(localPath), buffer)
    return buffer
  }

  process.exit(1)
}

export async function checkNotExist(serverPaths: string[]): Promise<string[]> {
  const resp = await API.post<string[]>('not-exist', { paths: serverPaths })
  return resp.data
}
