import axios from 'axios'
import fs from 'fs'
import chalk from 'chalk'
import path from 'path'

/** current working directory */
export const CWD = process.cwd()

/** command field */
export const FIELD = 'lfsd'

/** logger and process control */
export const logger = {
  /** output a error message and exit process if necessary */
  error(msg: string, exit = true) {
    console.error(`${chalk.red('error')} ${msg}`)
    if (exit) {
      process.exit(1)
    }
  },
  /** output a warning message and exit process if necessary */
  warn(msg: string, exit = true) {
    console.warn(`${chalk.yellow('warn')} ${msg}`)
    if (exit) {
      process.exit(1)
    }
  },
  /** output a success message and exit process if necessary */
  success(msg: string, exit = false) {
    console.log(`${chalk.green('success')} ${msg}`)
    if (exit) {
      process.exit(0)
    }
  },
}

/** backend url to store object. TODO: can be config */
const BACKEND_URL = 'http://localhost:3000'

/** backend axios instance */
export const API = axios.create({
  baseURL: BACKEND_URL,
})

/** check whether current working directory is a git repository, if it's not, exit */
export function checkGitRepo() {
  if (!fs.existsSync('.git')) {
    logger.error(
      'This is not a git repository, please run this command in root directory of a git repository',
    )
  }
}

/** get absolute path by relative path */
export function absPath(relativePath: string) {
  return path.join(CWD, relativePath)
}
