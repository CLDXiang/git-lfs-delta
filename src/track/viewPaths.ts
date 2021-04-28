import path from 'path'
import { readLFSDPaths } from './utils'
import { findGitRepoRootDir } from '../utils'

export function viewPaths() {
  const attributesFiles = ['.git/info/attributes', '.gitattributes']

  const patterns: string[] = []
  const gitRepoRootDir = findGitRepoRootDir()

  attributesFiles.forEach((attributeFile) => {
    const paths = readLFSDPaths(path.join(gitRepoRootDir, attributeFile))
    paths.forEach((p) => {
      patterns.push(`  ${p} (${attributeFile})`)
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
