#!/usr/bin/env node

import { createCommand } from 'commander'
import { viewPaths, addPath } from './track'
import { clean, filterProcess, smudge } from './filter'
import { checkGitRepo } from './utils'

const program = createCommand()

// track
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

// hooks
program.command('post-checkout').action(() => {
  // console.log('post-checkout')
})

program.command('post-commit').action(() => {
  // console.log('post-commit')
})

program.command('post-merge').action(() => {
  // console.log('post-merge')
})

program.command('pre-push').action(() => {
  // console.log('pre-push')
})

// filter
program.command('clean <file>').action(async (file: string) => {
  await clean()
})

program.command('smudge <file>').action(async (file: string) => {
  await smudge()
})

program.command('filter-process').action(async () => {
  await filterProcess()
})

program.parse()
