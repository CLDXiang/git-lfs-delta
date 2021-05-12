import fs from 'fs'
import path from 'path'
import { absPath, spawnSync } from '../utils'
import { Git } from './index'

function initTestDir() {
  const tempDirPath = absPath('jest_temp/git')

  // clear and create empty jest_temp directory for testing
  if (fs.existsSync(tempDirPath)) {
    fs.rmdirSync(tempDirPath, { recursive: true })
  }
  fs.mkdirSync(tempDirPath, { recursive: true })

  // $ git init
  spawnSync('git', ['init'], { cwd: tempDirPath })

  // create fs structure

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
const git = new Git(tempDirPath)

test('there is a temporary test directory and has been init by git', () => {
  expect(fs.existsSync(tempDirPath)).toBe(true)
  expect(fs.existsSync(path.join(tempDirPath, '.git'))).toBe(true)
})

test("new Git instance's path is the tempDirPath", () => {
  expect(git.root).toBe(tempDirPath)
})

test('revList', () => {
  const revListLast = git.revListObjects(['HEAD', 'HEAD~1'])
  expect(revListLast).toContainEqual({
    filePath: 'subDir1',
    sha: '93965f67141f5e7feac490417a6a7d532fac08b1',
  })
  expect(revListLast).toContainEqual({
    filePath: 'subDir1/secondFile.txt',
    sha: '624cc9ad37861936f9430af06dde76ef69764510',
  })
  expect(revListLast).not.toContainEqual({
    filePath: 'firstFile.txt',
    sha: '5b62422f2f0f9982642b9e10f735fd8d8c7a845a',
  })
  const revListAll = git.revListObjects(['HEAD'])
  expect(revListAll).toContainEqual({
    filePath: 'firstFile.txt',
    sha: '5b62422f2f0f9982642b9e10f735fd8d8c7a845a',
  })
})

test('show file content', () => {
  expect(git.showFileContent('subDir1/secondFile.txt')?.toString()).toBe(
    'This is all content in second file.\n',
  )
  expect(git.showFileContent('fileNoExists')).toBe(null)

  expect(git.showFileContent('subDir1/secondFile.txt', 'HEAD~1')).toBe(null)

  expect(git.showFileContent('firstFile.txt', 'HEAD~1')?.toString()).toBe(
    'this is the first line.\nthis is the second line.\n',
  )
})
