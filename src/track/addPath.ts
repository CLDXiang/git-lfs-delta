import { logger, absPath, FIELD } from '../utils'
import { readLFSDPaths, appendFile } from './utils'

export function addPath(newPath: string) {
  const newPathTrim = newPath.trim()
  if (!newPathTrim) {
    logger.error('Please provide a valid path')
  }

  // modify .gitattributes
  const existingPaths = readLFSDPaths('.gitattributes')

  if (existingPaths.includes(newPathTrim)) {
    logger.warn(`Path "${newPathTrim}" already exists in .gitattributes`)
  }

  appendFile(
    absPath('.gitattributes'),
    `${newPathTrim} filter=${FIELD} diff=${FIELD} merge=${FIELD} -text`,
  )

  logger.success(`Add path "${newPathTrim}" in .gitattributes`)

  // TODO: modify gitconfig

  // TODO: add hooks
}
