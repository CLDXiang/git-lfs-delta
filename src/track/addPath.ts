import fs from 'fs'
import path from 'path'
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

  const attributeFilePath = absPath('.gitattributes')
  const contentToWrite = `${newPathTrim} filter=${FIELD} diff=${FIELD} merge=${FIELD} -text\n`

  if (!fs.existsSync(attributeFilePath)) {
    fs.writeFileSync(attributeFilePath, contentToWrite)
  } else {
    appendFile(attributeFilePath, contentToWrite)
  }

  logger.success(`Add path "${newPathTrim}" in .gitattributes`)

  // TODO: modify gitconfig

  // add hooks
  const hooksPath = absPath('.git/hooks')
  if (!fs.existsSync(hooksPath)) {
    fs.mkdirSync(hooksPath)
  }

  fs.writeFileSync(
    path.join(hooksPath, 'post-checkout'),
    `#!/bin/sh
command -v git-lfsd >/dev/null 2>&1 || { echo >&2 "\\nThis repository is configured for Git LFS Delta but 'git-lfsd' was not found on your path. If you no longer wish to use Git LFS Delta, remove this hook by deleting .git/hooks/post-checkout.\\n"; exit 2; }
git lfsd post-checkout "$@"
`,
  )

  fs.writeFileSync(
    path.join(hooksPath, 'post-commit'),
    `#!/bin/sh
command -v git-lfsd >/dev/null 2>&1 || { echo >&2 "\\nThis repository is configured for Git LFS Delta but 'git-lfsd' was not found on your path. If you no longer wish to use Git LFS Delta, remove this hook by deleting .git/hooks/post-commit.\\n"; exit 2; }
git lfsd post-commit "$@"
`,
  )

  fs.writeFileSync(
    path.join(hooksPath, 'post-merge'),
    `#!/bin/sh
command -v git-lfsd >/dev/null 2>&1 || { echo >&2 "\\nThis repository is configured for Git LFS Delta but 'git-lfsd' was not found on your path. If you no longer wish to use Git LFS Delta, remove this hook by deleting .git/hooks/post-merge.\\n"; exit 2; }
git lfsd post-merge "$@"
`,
  )

  fs.writeFileSync(
    path.join(hooksPath, 'pre-push'),
    `#!/bin/sh
command -v git-lfsd >/dev/null 2>&1 || { echo >&2 "\\nThis repository is configured for Git LFS Delta but 'git-lfsd' was not found on your path. If you no longer wish to use Git LFS Delta, remove this hook by deleting .git/hooks/pre-push.\\n"; exit 2; }
git lfsd pre-push "$@"
`,
  )
}
