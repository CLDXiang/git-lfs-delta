#!/usr/bin/env node

import { createCommand } from 'commander'
import { viewPaths, addPath } from './track'
import { checkGitRepo } from './utils'

const program = createCommand()

program
  .command('track [path]')
  .description('View or add Git LFS delta paths to Git attributes')
  .action((path?: string) => {
    checkGitRepo()
    if (path === undefined) {
      viewPaths()
      return
    }
    addPath(path)
  })

program
  .command('post-checkout')
  .description('Description of post-checkout')
  .action(() => {
    checkGitRepo()
    console.log('post-checkout')
  })

program
  .command('post-commit')
  .description('Description of post-commit')
  .action(() => {
    checkGitRepo()
    console.log('post-commit')
  })

program
  .command('post-merge')
  .description('Description of post-merge')
  .action(() => {
    checkGitRepo()
    console.log('post-merge')
  })

program
  .command('pre-push')
  .description('Description of pre-push')
  .action(() => {
    checkGitRepo()
    console.log('pre-push')
  })

program.parse()
