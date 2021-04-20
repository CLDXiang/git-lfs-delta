import fs from 'fs'
import { absPath, FIELD } from '../utils'

/** read LFSPaths pattern from a attribute file */
export function readLFSDPaths(attributesFilePath: string): string[] {
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

/** extend fs.appendFileSync, add a \n prefix to data if there is no \n at the end of the file */
export function appendFile(
  file: fs.PathLike | number,
  data: string,
  options?: fs.WriteFileOptions | undefined,
) {
  const fileContent = fs.readFileSync(file).toString()
  if (fileContent[fileContent.length - 1] === '\n') {
    fs.appendFileSync(file, data, options)
  } else {
    fs.appendFileSync(file, `\n${data}`, options)
  }
}
