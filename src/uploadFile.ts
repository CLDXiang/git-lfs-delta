import { createReadStream } from 'fs'
import FormData from 'form-data'
import { API } from './utils'

export default async function uploadFile(
  localPath: string,
  serverPath: string,
) {
  const data = new FormData()

  data.append('file', createReadStream(localPath))
  data.append('path', serverPath)
  return API.post('upload', data, {
    headers: {
      ...data.getHeaders(),
    },
  })
}
