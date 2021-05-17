import fs from 'fs'
import path from 'path'
import faker from 'faker'
import { absPath, spawnSync } from './utils'

// set faker seed
faker.seed(2021)

/** insert content into the middle of a file */
function writeMiddle(filePath: string, content: string) {
  const rawFileContent = fs.readFileSync(filePath)
  fs.writeFileSync(
    filePath,
    rawFileContent.slice(0, Math.floor(rawFileContent.length / 2)),
  )
  fs.appendFileSync(filePath, content)
  fs.appendFileSync(
    filePath,
    rawFileContent.slice(Math.floor(rawFileContent.length / 2)),
  )
}

/** delete middle 1/3 content of a file */
function deleteMiddle(filePath: string) {
  const rawFileContent = fs.readFileSync(filePath)
  fs.writeFileSync(
    filePath,
    rawFileContent.slice(0, Math.floor(rawFileContent.length / 3)),
  )
  fs.appendFileSync(
    filePath,
    rawFileContent.slice(Math.floor((2 * rawFileContent.length) / 3)),
  )
}

const tempDirPath = absPath('jest_temp/overall')
const file1Path = path.join(tempDirPath, 'file1.txt')
const file2Path = path.join(tempDirPath, 'file2.exe')
const file3Path = path.join(tempDirPath, 'subDir', 'file3.txt')
const file4Path = path.join(tempDirPath, 'subDir', 'file4.exe')
const file5Path = path.join(tempDirPath, 'subDir', 'file5.txt')

/** create a temporary testing git repository
 *
 * following steps:
 *
 * 1. git init
 * 2. create .gitattributes and track *.txt
 * 3. add and commit .gitattributes to git
 */
function initTestDir() {
  // clear and create empty jest_temp directory for testing
  if (fs.existsSync(tempDirPath)) {
    fs.rmdirSync(tempDirPath, { recursive: true })
  }
  fs.mkdirSync(tempDirPath, { recursive: true })

  // 1. git init
  spawnSync('git', ['init'], { cwd: tempDirPath })

  // 2. create .gitattributes and track *.txt
  spawnSync('git', ['lfsd', 'track', '*.txt'], { cwd: tempDirPath })

  // 3. add and commit .gitattributes to git
  spawnSync('git', ['add', '.gitattributes'], { cwd: tempDirPath })
  spawnSync('git', ['commit', '-m', '"add .gitattributes"'], {
    cwd: tempDirPath,
  })
}

initTestDir()

test('add and commit some txt files with certain content and some none-txt files with certain content', () => {
  fs.writeFileSync(
    file1Path,
    `Here is the beginning of file1.txt or file2.exe. Following content is randomly generated text with size of about 1 MB.\n${faker.lorem.lines(
      2 ** 15,
    )}`,
  )

  // copy file1.txt but rename it to file2.exe
  fs.copyFileSync(file1Path, file2Path)

  fs.mkdirSync(path.join(tempDirPath, 'subDir'))

  fs.writeFileSync(file3Path, `file3.txt or file4.exe`)

  // copy file3.txt but rename it to file4.exe
  fs.copyFileSync(file3Path, file4Path)

  fs.writeFileSync(
    file5Path,
    `file5.txt, this file won't be modified after first committed.\n`,
  )

  spawnSync('git', ['add', '-A'], { cwd: tempDirPath })
  spawnSync(
    'git',
    ['commit', '-m', '"add three txt files and two none-txt files"'],
    { cwd: tempDirPath },
  )
})

test('add some content to some files (including at least one txt file and one none-txt file), commit to git', () => {
  const contentToInsert = faker.lorem.lines(2 ** 14)
  writeMiddle(file1Path, contentToInsert)
  writeMiddle(file2Path, contentToInsert)
  fs.appendFileSync(file3Path, 'new content.\n')
  fs.appendFileSync(file4Path, 'new content.\n')

  spawnSync('git', ['add', '-A'], { cwd: tempDirPath })
  spawnSync('git', ['commit', '-m', '"insert some new content to file 1~4"'], {
    cwd: tempDirPath,
  })
})

test('delete some content of some files (including at least one txt file and one none-txt file), commit to git', () => {
  deleteMiddle(file1Path)
  deleteMiddle(file2Path)
  deleteMiddle(file3Path)
  deleteMiddle(file4Path)

  spawnSync('git', ['add', '-A'], { cwd: tempDirPath })
  spawnSync('git', ['commit', '-m', '"delete middle 1/3 of file 1~4"'], {
    cwd: tempDirPath,
  })
})

test('remove some files (including at least one txt file and one none-txt file), commit to git', () => {
  fs.rmSync(file1Path)
  fs.rmSync(file2Path)

  spawnSync('git', ['add', '-A'], { cwd: tempDirPath })
  spawnSync('git', ['commit', '-m', '"remove file1 and file2"'], {
    cwd: tempDirPath,
  })
})
