import fs from 'fs'
import path from 'path'
import { absPath, spawnSync } from '../../utils'

function initTestDir() {
  const tempDirPath = absPath('jest_temp/filterProcess')

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

test('temporary test directory has correct file structure', () => {
  expect(fs.existsSync(tempDirPath)).toBe(true)
  expect(fs.existsSync(path.join(tempDirPath, '.git'))).toBe(true)
  expect(fs.existsSync(path.join(tempDirPath, '.gitattributes'))).toBe(true)
  expect(fs.existsSync(path.join(tempDirPath, 'firstFile.txt'))).toBe(true)
  expect(fs.existsSync(path.join(tempDirPath, 'subDir1/secondFile.txt'))).toBe(
    true,
  )
})
