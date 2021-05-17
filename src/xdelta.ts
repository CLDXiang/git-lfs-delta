import cp from 'child_process'
import { CWD, spawnSync } from './utils'

type Options = Partial<{
  compressionLevel: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
  useStdout: boolean
  decompress: boolean
  compress: boolean
  forceOverwrite: boolean
  showHelp: boolean
  beQuiet: boolean
  beVerbose: boolean
  showVersion: boolean

  sourceWindowSize: number
  inputWindowSize: number

  /** enable/disable secondary compression */
  S: 'djw' | 'fgk'
  /** disable small string-matching compression */
  N: boolean
  /** disable external decompression (encode/decode) */
  D: boolean
  /** disable external recompression (decode) */
  R: boolean
  /** disable checksum (encode/decode) */
  n: boolean
  /** soft config (encode, undocumented) */
  C: boolean
  /** disable/provide application header (encode) */
  A: string
}>

export class XDelta {
  constructor(workingPath: string, cmd = 'xdelta3') {
    this.workingPath = workingPath
    this.cmd = cmd

    // check Xdelta is executable
    const checkCommand = cp.spawnSync(this.cmd, ['-h'])
    if (checkCommand.output === null && checkCommand.error) {
      throw new Error(
        `LFSD: Can't find '${this.cmd}' in your PATH, please make sure XDelta3 was installed in your PC and had been added to your PATH, see http://xdelta.org/`,
      )
    }
  }

  /** working path */
  workingPath: string

  /** command name / executable path */
  private cmd: string

  private parseOptions = (options?: Options) => {
    if (!options) {
      return []
    }
    const {
      compressionLevel,
      useStdout,
      decompress,
      compress,
      forceOverwrite,
      showHelp,
      beQuiet,
      beVerbose,
      showVersion,
      sourceWindowSize,
      inputWindowSize,
      S,
      N,
      D,
      R,
      n,
      C,
      A,
    } = options
    const resArr = []
    if (compressionLevel !== undefined) {
      resArr.push(`-${compressionLevel}`)
    }
    if (useStdout) {
      resArr.push('-c')
    }
    if (decompress) {
      resArr.push('-d')
    }
    if (compress) {
      resArr.push('-e')
    }
    if (forceOverwrite) {
      resArr.push('-f')
    }
    if (showHelp) {
      resArr.push('-h')
    }
    if (beQuiet) {
      resArr.push('-q')
    }
    if (beVerbose) {
      resArr.push('-v')
    }
    if (showVersion) {
      resArr.push('-V')
    }
    if (sourceWindowSize !== undefined) {
      resArr.push('-B', `${sourceWindowSize}`)
    }
    if (inputWindowSize !== undefined) {
      resArr.push('-W', `${inputWindowSize}`)
    }
    if (S) {
      resArr.push('-S', S)
    }
    if (N) {
      resArr.push('-N')
    }
    if (D) {
      resArr.push('-D')
    }
    if (R) {
      resArr.push('-R')
    }
    if (n) {
      resArr.push('-n')
    }
    if (C) {
      resArr.push('-C')
    }
    if (A !== undefined) {
      resArr.push('-A', A)
    }
    return resArr
  }

  compress = (
    sourceFilePath: string,
    targetFilePath: string,
    options?: Options,
  ) => {
    return spawnSync(
      this.cmd,
      [...this.parseOptions(options), '-s', sourceFilePath, targetFilePath],
      {
        cwd: this.workingPath,
      },
    )
  }

  decompress = (
    sourceFilePath: string,
    deltaFilePath: string,
    options?: Options,
  ) => {
    return spawnSync(
      this.cmd,
      [
        ...this.parseOptions(options),
        '-d',
        '-s',
        sourceFilePath,
        deltaFilePath,
      ],
      {
        cwd: this.workingPath,
      },
    )
  }

  decompressTo = (
    sourceFilePath: string,
    deltaFilePath: string,
    targetFilePath: string,
    options?: Options,
  ) => {
    return spawnSync(
      this.cmd,
      [
        ...this.parseOptions(options),
        '-d',
        '-s',
        sourceFilePath,
        deltaFilePath,
        targetFilePath,
      ],
      {
        cwd: this.workingPath,
      },
    )
  }

  /** xdelta3 config - print xdelta3 configuration */
  config = (options?: Options) => {
    spawnSync(this.cmd, ['config', ...this.parseOptions(options)], {
      cwd: this.workingPath,
    })
  }

  /** xdelta3 decode - decompress the input */
  decode = (options?: Options) => {
    spawnSync(this.cmd, ['decode', ...this.parseOptions(options)], {
      cwd: this.workingPath,
    })
  }

  /** xdelta3 encode - compress the input */
  encode = (options?: Options) => {
    spawnSync(this.cmd, ['encode', ...this.parseOptions(options)], {
      cwd: this.workingPath,
    })
  }

  /** xdelta3 test - run the builtin tests */
  test = (options?: Options) => {
    spawnSync(this.cmd, ['test', ...this.parseOptions(options)], {
      cwd: this.workingPath,
    })
  }

  /** xdelta3 printdelta - print information about the entire delta */
  printDelta = (options?: Options) => {
    spawnSync(this.cmd, ['printdelta', ...this.parseOptions(options)], {
      cwd: this.workingPath,
    })
  }

  /** xdelta3 printhdr - print information about the first window */
  printHdr = (options?: Options) => {
    spawnSync(this.cmd, ['printhdr', ...this.parseOptions(options)], {
      cwd: this.workingPath,
    })
  }

  /** xdelta3 printhdrs - print information about all windows */
  printHdrs = (options?: Options) => {
    spawnSync(this.cmd, ['printhdrs', ...this.parseOptions(options)], {
      cwd: this.workingPath,
    })
  }
}

export default new XDelta(CWD)
