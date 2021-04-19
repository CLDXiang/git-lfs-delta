import path from 'path'
import { CWD } from './utils'
import uploadFile from './uploadFile'

async function main() {
  await uploadFile(path.join(CWD, 'assets', 'testFile.txt'), 'test/sub')
}

main()
