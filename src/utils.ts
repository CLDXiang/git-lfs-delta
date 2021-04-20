import axios from 'axios'
import fs from 'fs'
import chalk from 'chalk'
import path from 'path'

/** current working directory */
export const CWD = process.cwd()

/** command field */
export const FIELD = 'lfsd'

/** output a error message and exit process */
export function errorExit(msg: string) {
  console.error(`${chalk.red('error')} ${msg}`)
  process.exit(1)
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
    errorExit(
      'This is not a git repository, please run this command in root directory of a git repository',
    )
  }
}

/** get absolute path by relative path */
export function absPath(relativePath: string) {
  return path.join(CWD, relativePath)
}
