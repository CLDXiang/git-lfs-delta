import { readLFSDPaths } from './utils'

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
