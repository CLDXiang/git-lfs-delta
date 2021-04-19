#!/usr/bin/env node

import { createCommand } from 'commander'

const program = createCommand()

program
  .command('test1')
  .description('description of test1')
  .action(() => {
    console.log('test1')
  })

program
  .command('test2')
  .description('description of test2')
  .action(() => {
    console.log('test2')
  })

program.parse()
