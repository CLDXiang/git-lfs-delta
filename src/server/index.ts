import { createReadStream, writeFileSync, existsSync, mkdirSync } from 'fs'
import path from 'path'
import FormData from 'form-data'
import { API, absPath } from '../utils'

export async function uploadFile(localPath: string, serverPath: string) {
  const data = new FormData()

  data.append('file', createReadStream(absPath(localPath)))
  data.append('path', serverPath)
  return API.post('upload', data, {
    headers: {
      ...data.getHeaders(),
    },
  })
}

export async function downloadFile(
  serverPath: string,
  localPath: string,
): Promise<Buffer | string> {
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

  return ''
}
