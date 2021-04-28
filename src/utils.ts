import axios from 'axios'
import fs from 'fs'
import chalk from 'chalk'
import path from 'path'
import cp from 'child_process'

/** current working directory */
export const CWD = process.cwd()

/** command field */
export const FIELD = 'lfsd'

/** version */
export const VERSION = `${FIELD}@1`

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

// /** check whether current working directory is root of a git repository, if it's not, exit */
// export function checkGitRepo(dir?: string) {
//   if (!fs.existsSync(dir ? path.join(dir, '.git') : '.git')) {
//     logger.error(
//       'This is not a git repository, please run this command in root directory of a git repository',
//     )
//   }
// }

/** get absolute path by relative path */
export function absPath(relativePath: string) {
  if (path.isAbsolute(relativePath)) {
    return path.normalize(relativePath)
  }
  return path.join(CWD, relativePath)
}

/** find the root directory of a git repo */
export function findGitRepoRootDir(dir = CWD): string {
  let dirAbsPath = absPath(dir)
  let lastDirAbsPath = ''
  while (dirAbsPath !== lastDirAbsPath) {
    if (fs.existsSync(path.join(dirAbsPath, '.git'))) {
      return dirAbsPath
    }
    lastDirAbsPath = dirAbsPath
    // check parent dir
    dirAbsPath = path.resolve(dirAbsPath, '..')
  }
  logger.error(
    'This is not a git repository, please run this command a git repository',
  )
  return ''
}

/** extend child_process.spawnSync with error handler */
export function spawnSync(
  command: string,
  args?: readonly string[],
  options?: cp.SpawnSyncOptionsWithBufferEncoding,
): string {
  const res = cp.spawnSync(command, args, options)
  const commandString = `${command} ${args?.join(' ')}`
  if (res.status === null) {
    // terminated due to a signal
    if (!res.signal) {
      logger.error(`# ${commandString} - Unexpected termination`)
    } else {
      logger.error(
        `# ${commandString} - Terminated due to signal: ${res.signal}`,
      )
    }
  } else if (res.status !== 0) {
    // STDERR
    if (res.error) {
      throw res.error
    }
    logger.error(`# ${commandString} - ${res.stderr.toString()}`)
  }
  // return STDOUT as string
  return res.stdout.toString()
}
