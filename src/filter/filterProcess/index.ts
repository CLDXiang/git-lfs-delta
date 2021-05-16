import { preZero } from './utils'
import { clean, smudge } from './commands'
import lfsdCwd, { LargeFileStorageDelta } from '../../lfsd'

const MAX_PACKET_CONTENT_SIZE = 65516

class FilterProcessor {
  constructor(lfsd = lfsdCwd) {
    this.lfsd = lfsd
    this.status = 'init'
    this.run()
  }

  /** LFSD instance */
  private lfsd: LargeFileStorageDelta

  private status:
    | 'init'
    | 'waitingVersion'
    | 'waitingVersionEnd'
    | 'checkingCapabilities'
    | 'waitingCommand'
    | 'waitingPathname'
    | 'waitingContentStart'
    | 'reading'
    | 'end'

  /** current command */
  private command = ''

  /** current pathname */
  private pathname = ''

  /** input data */
  private input = Buffer.from([])

  /** all packet line buffers  */
  private packetBuffers: Buffer[] = []

  /** start running */
  private run = () => {
    while (this.status !== 'end') {
      this.readPacket()
    }
  }

  /** stop running */
  stop = () => {
    this.status = 'end'
  }

  /** process a complete chunk, read each line according to its size and push it into packetBuffers */
  readChunk = (chunk: Buffer) => {
    /** how many bytes processed */
    let offset = 0
    while (offset < chunk.length) {
      /** the first 4 byte (hex) represent the bytes count of valid content following them */
      const sizeBuffer = chunk.slice(offset, offset + 4)
      offset += 4
      if (sizeBuffer.length !== 4) {
        // less than 4 bytes, bad packet
        throw new Error(`invalid packet: '${sizeBuffer}'`)
      }

      /** parse sizeBuffer to number */
      const packetSize = parseInt(sizeBuffer.toString(), 16)
      if (packetSize === 0) {
        // receive flush packet, push an empty Buffer
        this.packetBuffers.push(Buffer.from([]))
      } else if (packetSize > 4) {
        const contentSize = packetSize - 4
        /** Buffer containing real data */
        const contentBuffer = chunk.slice(offset, offset + contentSize)
        offset += contentSize
        if (contentBuffer.length !== contentSize) {
          throw new Error(
            `invalid packet (${contentSize} bytes expected; ${contentBuffer.byteLength} bytes read)`,
          )
        }
        // push real data Buffer to packetBuffers
        this.packetBuffers.push(contentBuffer)
      } else {
        throw new Error(`invalid packet size: ${packetSize}`)
      }
    }
  }

  /** read packet */
  private readPacket = async () => {
    if (!this.packetBuffers.length) {
      // no buffer, return
      return
    }

    switch (this.status) {
      case 'init': {
        if (this.readPacketText() !== 'git-filter-client') {
          throw new Error('bad initialize')
        }
        this.writePacketText('git-filter-server')
        this.status = 'waitingVersion'
        break
      }

      case 'waitingVersion': {
        if (this.readPacketText() !== 'version=2') {
          throw new Error('bad version')
        }
        this.writePacketText('version=2')
        this.status = 'waitingVersionEnd'
        break
      }

      case 'waitingVersionEnd': {
        if (this.readPacketBin().length !== 0) {
          throw new Error('bad version end')
        }
        this.flushPacket()
        this.status = 'checkingCapabilities'
        break
      }

      case 'checkingCapabilities': {
        const buf = this.readPacketBin()
        if (buf.length === 0) {
          this.flushPacket()
          this.status = 'waitingCommand'
        } else {
          const content = this.readPacketText(buf)
          if (
            ![
              'capability=clean',
              'capability=smudge',
              'capability=delay',
            ].includes(content)
          ) {
            throw new Error(`bad capability: ${content}`)
          }
          this.writePacketText(content)
        }
        break
      }

      case 'waitingCommand': {
        this.command = /^command=(.+)$/.exec(this.readPacketText())?.[1] || ''
        if (!this.command) {
          throw new Error(`bad command: '${this.command}'`)
        }
        this.status = 'waitingPathname'
        break
      }

      case 'waitingPathname': {
        this.pathname = /^pathname=(.+)$/.exec(this.readPacketText())?.[1] || ''
        if (!this.pathname) {
          throw new Error(`bad pathname: '${this.pathname}'`)
        }
        this.status = 'waitingContentStart'
        break
      }

      case 'waitingContentStart': {
        if (this.readPacketBin().length !== 0) {
          throw new Error('bad content start')
        }
        this.status = 'reading'
        break
      }

      case 'reading': {
        const buf = this.readPacketBin()
        if (buf.length !== 0) {
          // continue reading content, concat all input content
          this.input = Buffer.concat([this.input, buf])
        } else {
          // finish reading content, output
          let output = Buffer.from([])
          if (['clean', 'smudge'].includes(this.command)) {
            // filter input into output
            if (this.command === 'clean') {
              output = await clean(this.input, this.pathname, this.lfsd)
            } else if (this.command === 'smudge') {
              output = await smudge(this.input, this.lfsd)
            }
          } else {
            throw new Error(`bad command ${this.command}`)
          }

          this.writePacketText('status=success')
          this.flushPacket()

          // if output is too long, split it into several packets
          for (let i = 0; i < output.length; i += MAX_PACKET_CONTENT_SIZE) {
            this.writePacketBin(output.slice(i, i + MAX_PACKET_CONTENT_SIZE))
          }
          this.flushPacket()
          this.flushPacket()

          // clear and waiting next input
          this.command = ''
          this.pathname = ''
          this.input = Buffer.from([])
          this.status = 'waitingCommand'
        }
        break
      }

      default:
        throw new Error(`unexpected FilterProcessor status: ${this.status}`)
    }
  }

  /** read an element(a line) from packetBuffers */
  private readPacketBin = () => {
    if (this.packetBuffers.length === 0) {
      throw new Error('unexpected empty buffer')
    }
    return this.packetBuffers.shift() as Buffer
  }

  /** read an element(a line) from packetBuffers, and parse it as string(UTF-8), check LF */
  private readPacketText = (bin?: Buffer) => {
    let content = ''
    if (bin) {
      content = bin.toString() || ''
    } else {
      content = this.packetBuffers.shift()?.toString() || ''
    }
    if (!/\n$/.test(content)) {
      throw new Error(
        `A non-binary line MUST be terminated by an LF. Line content: ${(content.length <
        128
          ? content
          : `${content.slice(0, 64)}...${content.slice(content.length - 64)}`
        ).replace(/\n/g, '\\n')}`,
      )
    }
    return content.trim()
  }

  /** write a Buffer line to STDOUT with its size */
  private writePacketBin = (buffer: Buffer) => {
    /** size to write, bytes of content + 4 bytes size */
    const size = buffer.byteLength + 4
    process.stdout.write(`${preZero(size.toString(16))}`)
    process.stdout.write(buffer)
  }

  /** write a text line to STDOUT with its size, with LF */
  private writePacketText = (content: string) => {
    /** size to write, bytes of content + 4 bytes size + 1 byte LF */
    const size = Buffer.from(content).byteLength + 5
    console.log(`${preZero(size.toString(16))}${content}`)
  }

  /** send a flush packet to STDOUT */
  private flushPacket = () => {
    process.stdout.write('0000')
  }
}

/** implement filter.process, see https://www.git-scm.com/docs/gitattributes#_long_running_filter_process
 *
 * to debug, set environment variable GIT_TRACE_PACKET = 1
 */
export async function filterProcess(lfsd = lfsdCwd) {
  const filterProcessor = new FilterProcessor(lfsd)

  process.stdin.on('data', (chunk) => {
    filterProcessor.readChunk(chunk)
  })

  process.stdin.on('end', () => {
    filterProcessor.stop()
  })

  process.stdin.on('error', (err) => {
    throw err
  })

  // /** all packet line buffers  */
  // const packetBuffers: Buffer[] = []

  // /** process a complete chunk, read each line according to its size and push it into packetBuffers */
  // function readChunk(chunk: Buffer) {
  //   /** how many bytes processed */
  //   let offset = 0
  //   while (offset < chunk.length) {
  //     /** the first 4 byte (hex) represent the bytes count of valid content following them */
  //     const sizeBuffer = chunk.slice(offset, offset + 4)
  //     offset += 4
  //     if (sizeBuffer.length !== 4) {
  //       // less than 4 bytes, bad packet
  //       throw new Error(`invalid packet: '${sizeBuffer}'`)
  //     }

  //     /** parse sizeBuffer to number */
  //     const packetSize = parseInt(sizeBuffer.toString(), 16)
  //     if (packetSize === 0) {
  //       // receive flush packet, push an empty Buffer
  //       packetBuffers.push(Buffer.from([]))
  //     } else if (packetSize > 4) {
  //       const contentSize = packetSize - 4
  //       /** Buffer containing real data */
  //       const contentBuffer = chunk.slice(offset, offset + contentSize)
  //       offset += contentSize
  //       if (contentBuffer.length !== contentSize) {
  //         throw new Error(
  //           `invalid packet (${contentSize} bytes expected; ${contentBuffer.byteLength} bytes read)`,
  //         )
  //       }
  //       // push real data Buffer to packetBuffers
  //       packetBuffers.push(contentBuffer)
  //     } else {
  //       throw new Error(`invalid packet size: ${packetSize}`)
  //     }
  //   }
  // }

  // /** read an element(a line) from packetBuffers */
  // function readPacketBin() {
  //   if (packetBuffers.length === 0) {
  //     throw new Error('unexpected empty buffer')
  //   }
  //   return packetBuffers.shift() as Buffer
  // }

  // /** read an element(a line) from packetBuffers, and parse it as string(UTF-8), check LF */
  // function readPacketText() {
  //   const content = packetBuffers.shift()?.toString() || ''
  //   if (!/\n$/.test(content)) {
  //     throw new Error(
  //       `A non-binary line MUST be terminated by an LF. Line content: ${(content.length <
  //       128
  //         ? content
  //         : `${content.slice(0, 64)}...${content.slice(content.length - 64)}`
  //       ).replace(/\n/g, '\\n')}`,
  //     )
  //   }
  //   return content.trim()
  // }

  // /** write a Buffer line to STDOUT with its size */
  // function writePacketBin(buffer: Buffer) {
  //   /** size to write, bytes of content + 4 bytes size */
  //   const size = buffer.byteLength + 4
  //   process.stdout.write(`${preZero(size.toString(16))}`)
  //   process.stdout.write(buffer)
  // }

  // /** write a text line to STDOUT with its size, with LF */
  // function writePacketText(content: string) {
  //   /** size to write, bytes of content + 4 bytes size + 1 byte LF */
  //   const size = Buffer.from(content).byteLength + 5
  //   console.log(`${preZero(size.toString(16))}${content}`)
  // }

  // /** send a flush packet to STDOUT */
  // function flushPacket() {
  //   process.stdout.write('0000')
  // }

  // /** is initialize and version check finished? */
  // let initChecked = false

  // /** check initialize and version from git and response to it
  //  *
  //  * this process only happen once after a handshake is open
  //  */
  // function checkInit() {
  //   if (initChecked || !packetBuffers.length) {
  //     return false
  //   }
  //   if (readPacketText() !== 'git-filter-client') {
  //     throw new Error('bad initialize')
  //   }
  //   if (readPacketText() !== 'version=2') {
  //     throw new Error('bad version')
  //   }
  //   if (readPacketBin().length !== 0) {
  //     throw new Error('bad version end')
  //   }
  //   writePacketText('git-filter-server')
  //   writePacketText('version=2')
  //   flushPacket()
  //   initChecked = true
  //   return true
  // }

  // /** is capability check finished? */
  // let capabilityChecked = false

  // /** check capabilities from git and response to it
  //  *
  //  * this process only happen once after initialize and version check
  //  */
  // function checkCapability() {
  //   if (capabilityChecked || !packetBuffers.length) {
  //     return false
  //   }
  //   if (readPacketText() !== 'capability=clean') {
  //     throw new Error('bad capability')
  //   }
  //   if (readPacketText() !== 'capability=smudge') {
  //     throw new Error('bad capability')
  //   }
  //   if (readPacketText() !== 'capability=delay') {
  //     throw new Error('bad capability')
  //   }
  //   if (readPacketBin().length !== 0) {
  //     throw new Error('bad capability end')
  //   }
  //   writePacketText('capability=clean')
  //   writePacketText('capability=smudge')
  //   writePacketText('capability=delay')
  //   flushPacket()
  //   capabilityChecked = true
  //   return true
  // }

  // /** process data packets from git */
  // async function handleReceive() {
  //   if (!packetBuffers.length) {
  //     return
  //   }
  //   const command = /^command=(.+)$/.exec(readPacketText())?.[1] || ''
  //   const pathname = /^pathname=(.+)$/.exec(readPacketText())?.[1] || ''

  //   if (!pathname) {
  //     throw new Error(`bad pathname '${pathname}'`)
  //   }

  //   if (readPacketBin().length !== 0) {
  //     throw new Error('bad content start')
  //   }

  //   // read all input real data
  //   let input = Buffer.from([])
  //   let done = false
  //   while (!done) {
  //     const buffer = readPacketBin()
  //     if (buffer.length === 0) {
  //       done = true
  //     }
  //     input = Buffer.concat([input, buffer])
  //   }

  //   let output = Buffer.from([])
  //   if (['clean', 'smudge'].includes(command)) {
  //     // filter input into output
  //     if (command === 'clean') {
  //       output = await clean(input, pathname, lfsd)
  //     } else if (command === 'smudge') {
  //       output = await smudge(input, lfsd)
  //     }
  //   } else {
  //     throw new Error(`bad command ${command}`)
  //   }

  //   writePacketText('status=success')
  //   flushPacket()

  //   // if output is too long, split it into several packets
  //   for (let i = 0; i < output.length; i += MAX_PACKET_CONTENT_SIZE) {
  //     writePacketBin(output.slice(i, i + MAX_PACKET_CONTENT_SIZE))
  //   }
  //   flushPacket()
  //   flushPacket()
  // }

  // process.stdin.on('data', (chunk) => {
  //   readChunk(chunk)
  //   while (packetBuffers.length) {
  //     checkInit()
  //     checkCapability()
  //     handleReceive()
  //   }
  // })

  // process.stdin.on('error', (err) => {
  //   throw err
  // })
}
