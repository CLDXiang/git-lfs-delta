import fs from 'fs'

export function clean() {
  const fileContent = fs.readFileSync(0, 'utf-8')

  process.stdout.write(`demo\n${fileContent}`)
}
