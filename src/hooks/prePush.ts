import fs from 'fs'
import { logger } from '../utils'

export function prePush(args: string[]) {
  if (!args.length) {
    logger.error("This should be run through Git's pre-push hook.")
  }
  console.log(fs.readFileSync(0, 'utf-8'))
  process.exit(1)
}
