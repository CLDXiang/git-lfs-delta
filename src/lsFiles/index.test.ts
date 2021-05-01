import fs from 'fs'
import path from 'path'
import { absPath, spawnSync } from '../utils'
import { lsFiles } from '.'
import { LargeFileStorageDelta } from '../lfsd'

function initTestDir() {
  const tempDirPath = absPath('jest_temp/lsFiles')

  // clear and create empty jest_temp directory for testing
  if (fs.existsSync(tempDirPath)) {
    fs.rmdirSync(tempDirPath, { recursive: true })
  }
  fs.mkdirSync(tempDirPath, { recursive: true })

  // $ git init
  spawnSync('git', ['init'], { cwd: tempDirPath })

  // create fs structure

  // create .gitattributes and track *.txt
  spawnSync('git', ['lfsd', 'track', '*.txt'], { cwd: tempDirPath })

  // # git add .gitattributes
  spawnSync('git', ['add', '.gitattributes'], { cwd: tempDirPath })

  // # git commit -m "add attributes"
  spawnSync('git', ['commit', '-m', '"add attributes"'], { cwd: tempDirPath })

  // create a file firstFile.txt
  fs.writeFileSync(
    path.join(tempDirPath, 'firstFile.txt'),
    'this is the first line.\nthis is the second line.\n',
  )

  // # git add firstFile.txt
  spawnSync('git', ['add', 'firstFile.txt'], { cwd: tempDirPath })

  // # git commit -m "first commit"
  spawnSync('git', ['commit', '-m', '"first commit"'], { cwd: tempDirPath })

  // create a dir subDir1 and file subDir1/secondFile.txt
  fs.mkdirSync(path.join(tempDirPath, 'subDir1'))
  fs.writeFileSync(
    path.join(tempDirPath, 'subDir1', 'secondFile.txt'),
    'This is all content in second file.\n',
  )

  // # git add subDir1/secondFile.txt
  spawnSync('git', ['add', 'subDir1/secondFile.txt'], { cwd: tempDirPath })

  // # git commit -m "second commit"
  spawnSync('git', ['commit', '-m', '"second commit"'], { cwd: tempDirPath })

  return tempDirPath
}

const tempDirPath = initTestDir()
const lfsd = new LargeFileStorageDelta(tempDirPath)

test('temporary test directory has correct file structure', () => {
  expect(fs.existsSync(tempDirPath)).toBe(true)
  expect(fs.existsSync(path.join(tempDirPath, '.git'))).toBe(true)
  expect(fs.existsSync(path.join(tempDirPath, '.gitattributes'))).toBe(true)
  expect(fs.existsSync(path.join(tempDirPath, 'firstFile.txt'))).toBe(true)
  expect(fs.existsSync(path.join(tempDirPath, 'subDir1/secondFile.txt'))).toBe(
    true,
  )
})

test('ls-files', () => {
  expect(lsFiles([], {}, lfsd)).toEqual([
    'c184237b49 firstFile.txt',
    '8933cf8d07 subDir1/secondFile.txt',
  ])
})

test('ls-files --long', () => {
  expect(lsFiles([], { long: true }, lfsd)).toEqual([
    'c184237b4933cd06166677b76567d40ca0adf85d19fa1ad110ffb8a4810cd34f * firstFile.txt',
    '8933cf8d075453ad9dfb807605845487b25728520903c169c45bfb6af1e6e6d8 * subDir1/secondFile.txt',
  ])
})

test('ls-files --size', () => {
  expect(lsFiles([], { size: true }, lfsd)).toEqual([
    'c184237b49 * firstFile.txt (49.0 B)',
    '8933cf8d07 * subDir1/secondFile.txt (36.0 B)',
  ])
})

test('ls-files --debug', () => {
  expect(lsFiles([], { debug: true }, lfsd)).toEqual([
    'filepath: firstFile.txt\nsize: 49\ndownload: true\noid: sha256 c184237b4933cd06166677b76567d40ca0adf85d19fa1ad110ffb8a4810cd34f\nversion: lfsd@1\n',
    'filepath: subDir1/secondFile.txt\nsize: 36\ndownload: true\noid: sha256 8933cf8d075453ad9dfb807605845487b25728520903c169c45bfb6af1e6e6d8\nversion: lfsd@1\n',
  ])
})
