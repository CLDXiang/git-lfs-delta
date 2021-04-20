import fs from 'fs'

export function smudge() {
  const fileContent = fs.readFileSync(0, 'utf-8')

  const lines = fileContent.split('\n')
  if (lines[0].trim() === 'demo') {
    process.stdout.write(lines.slice(1).join('\n'))
  } else {
    process.stdout.write(`${fileContent}`)
  }
}
