#!/usr/bin/env node

import { createCommand } from 'commander'
import { viewPaths, addPath } from './track'
import { lsFiles } from './lsFiles'
import { clean, filterProcess, smudge } from './filter'
import { prePush } from './hooks'

const program = createCommand()

// track
program
  .command('track [path]')
  .description('View or add Git LFS delta paths to Git attributes')
  .action((path?: string) => {
    if (path === undefined) {
      viewPaths()
      return
    }
    addPath(path)
  })

// ls-files
program
  .command('ls-files [refs...]')
  .description(
    'Display paths of Git LFSD files that are found in the tree at the given reference. If no reference is given, scan the currently checked-out branch. If two references are given, the LFS files that are modified between the two references are shown; deletions are not listed.\nAn asterisk (*) after the OID indicates a full object, a minus (-) indicates an LFSD pointer.',
  )
  .option(
    '-l, --long',
    'Show the entire 64 character OID, instead of just first 10.',
  )
  .option(
    '-s, --size',
    'Show the size of the LFS object between parenthesis at the end of a line.',
  )
  .option(
    '-d, --debug',
    'Show as much information as possible about a LFS file. This is intended for manual inspection; the exact format may change at any time.',
  )
  .option(
    '-a, --all',
    'Inspects the full history of the repository, not the current HEAD (or other provided reference). This will include previous versions of LFS objects that are no longer found in the current tree.',
  )
  .option('-n, --name-only', 'Show only the lfs tracked file names.')
  .action((refs, options) => {
    lsFiles(refs, options)
  })

// hooks
program.command('post-checkout', { hidden: true }).action(() => {
  // console.log('post-checkout')
})

program.command('post-commit', { hidden: true }).action(() => {
  // console.log('post-commit')
})

program.command('post-merge', { hidden: true }).action(() => {
  // console.log('post-merge')
})

program.command('pre-push <args...>', { hidden: true }).action(async (args) => {
  await prePush(args)
})

// filter
program
  .command('clean <file>', { hidden: true })
  .action(async (file: string) => {
    await clean(file)
  })

program
  .command('smudge <file>', { hidden: true })
  .action(async (file: string) => {
    await smudge(file)
  })

program.command('filter-process', { hidden: true }).action(async () => {
  await filterProcess()
})

program.parse()
