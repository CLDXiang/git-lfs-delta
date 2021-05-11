import fs from 'fs'
import path from 'path'
import { absPath } from './utils'
import { XDelta } from './xdelta'

function initTestDir() {
  const tempDirPath = absPath('jest_temp/xdelta')

  // clear and create empty jest_temp directory for testing
  if (fs.existsSync(tempDirPath)) {
    fs.rmdirSync(tempDirPath, { recursive: true })
  }
  fs.mkdirSync(tempDirPath, { recursive: true })

  // create a file as source
  fs.writeFileSync(
    path.join(tempDirPath, 'source.txt'),
    'this is the first line.\nthis is the second line.\n',
  )

  // create a file as target
  fs.writeFileSync(
    path.join(tempDirPath, 'target.txt'),
    'this is the first line.\nthis is the second line.\nthis is the third line.\n',
  )

  return tempDirPath
}

const tempDirPath = initTestDir()
const xdelta = new XDelta(tempDirPath)

test('directory structure is correct', () => {
  expect(fs.existsSync(tempDirPath)).toBe(true)
  expect(fs.existsSync(path.join(tempDirPath, 'source.txt'))).toBe(true)
  expect(fs.existsSync(path.join(tempDirPath, 'target.txt'))).toBe(true)
})

test("new XDelta instance's path is the tempDirPath", () => {
  expect(xdelta.workingPath).toBe(tempDirPath)
})

test('compress', () => {
  const delta = xdelta.compress('source.txt', 'target.txt', { useStdout: true })
  expect(delta instanceof Buffer).toBe(true)

  fs.writeFileSync(path.join(tempDirPath, 'delta'), delta)
  expect(fs.existsSync(path.join(tempDirPath, 'delta'))).toBe(true)
})

test('decompress', () => {
  const decompress = xdelta.decompress('source.txt', 'delta', {
    useStdout: true,
  })
  expect(decompress instanceof Buffer).toBe(true)

  const target = fs.readFileSync(path.join(tempDirPath, 'target.txt'), 'utf-8')
  expect(decompress.toString()).toBe(target)
})
