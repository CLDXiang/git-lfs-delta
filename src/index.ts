#!/usr/bin/env node

import { createCommand } from 'commander'
import { viewPaths, addPath } from './track'
import { checkGitRepo } from './utils'

const program = createCommand()

program
  .command('track [path]')
  .description('View or add Git LFS delta paths to Git attributes.')
  .action((path?: string) => {
    checkGitRepo()
    if (path === undefined) {
      viewPaths()
      return
    }
    addPath(path)
  })

program
  .command('test2')
  .description('description of test2')
  .action(() => {
    checkGitRepo()
    console.log('test2')
  })

program.parse()
