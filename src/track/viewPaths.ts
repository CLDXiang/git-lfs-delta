import fs from 'fs'
import { absPath, FIELD } from '../utils'

/** read LFSPaths pattern from a attribute file */
function readLFSDPaths(attributesFilePath: string): string[] {
  const attributesFileAbsPath = absPath(attributesFilePath)
  if (!fs.existsSync(attributesFileAbsPath)) {
    return []
  }
  const fileContentByLine = fs
    .readFileSync(attributesFileAbsPath)
    .toString()
    .split('\n')
  const paths: string[] = []

  const patternLineReg = new RegExp(
    `^(\\S+) filter=${FIELD} diff=${FIELD} merge=${FIELD} -text$`,
  )

  // const patternLineReg = /^(\S+) filter=lfsd diff=lfsd merge=lfsd -text$/

  fileContentByLine.forEach((line) => {
    const lineTrim = line.trim()
    if (!lineTrim.startsWith('#')) {
      const regMatch = patternLineReg.exec(lineTrim)
      if (regMatch) {
        paths.push(regMatch[1])
      }
    }
  })

  return paths
}

export function viewPaths() {
  const attributesFiles = ['.git/info/attributes', '.gitattributes']

  const patterns: string[] = []

  attributesFiles.forEach((attributeFile) => {
    const paths = readLFSDPaths(attributeFile)
    paths.forEach((path) => {
      patterns.push(`  ${path} (${attributeFile})`)
    })
  })

  if (patterns.length) {
    console.log('Listing tracked patterns')
    patterns.forEach((pattern) => {
      console.log(pattern)
    })

    console.log('Listing excluded patterns')
    // TODO: implement listing excluded patterns
  }
}
