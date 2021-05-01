import { preZero } from './utils'
import { clean, smudge } from './commands'
import lfsdCwd from '../../lfsd'

const MAX_PACKET_CONTENT_SIZE = 65516

/** implement filter.process, see https://www.git-scm.com/docs/gitattributes#_long_running_filter_process
 *
 * to debug, set environment variable GIT_TRACE_PACKET = 1
 */
export async function filterProcess(lfsd = lfsdCwd) {
  /** all packet line buffers  */
  const packetBuffers: Buffer[] = []

  /** process a complete chunk, read each line according to its size and push it into packetBuffers */
  function readChunk(chunk: Buffer) {
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
        packetBuffers.push(Buffer.from([]))
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
        packetBuffers.push(contentBuffer)
      } else {
        throw new Error(`invalid packet size: ${packetSize}`)
      }
    }
  }

  /** read an element(a line) from packetBuffers */
  function readPacketBin() {
    if (packetBuffers.length === 0) {
      throw new Error('unexpected empty buffer')
    }
    return packetBuffers.shift() as Buffer
  }

  /** read an element(a line) from packetBuffers, and parse it as string(UTF-8), check LF */
  function readPacketText() {
    const content = packetBuffers.shift()?.toString() || ''
    if (!/\n$/.test(content)) {
      throw new Error(
        `A non-binary line MUST be terminated by an LF. Line content: ${content}`,
      )
    }
    return content.trim()
  }

  /** write a Buffer line to STDOUT with its size */
  function writePacketBin(buffer: Buffer) {
    /** size to write, bytes of content + 4 bytes size */
    const size = buffer.byteLength + 4
    process.stdout.write(`${preZero(size.toString(16))}`)
    process.stdout.write(buffer)
  }

  /** write a text line to STDOUT with its size, with LF */
  function writePacketText(content: string) {
    /** size to write, bytes of content + 4 bytes size + 1 byte LF */
    const size = Buffer.from(content).byteLength + 5
    console.log(`${preZero(size.toString(16))}${content}`)
  }

  /** send a flush packet to STDOUT */
  function flushPacket() {
    process.stdout.write('0000')
  }

  /** is initialize and version check finished? */
  let initChecked = false

  /** check initialize and version from git and response to it
   *
   * this process only happen once after a handshake is open
   */
  function checkInit() {
    if (initChecked || !packetBuffers.length) {
      return false
    }
    if (readPacketText() !== 'git-filter-client') {
      throw new Error('bad initialize')
    }
    if (readPacketText() !== 'version=2') {
      throw new Error('bad version')
    }
    if (readPacketBin().length !== 0) {
      throw new Error('bad version end')
    }
    writePacketText('git-filter-server')
    writePacketText('version=2')
    flushPacket()
    initChecked = true
    return true
  }

  /** is capability check finished? */
  let capabilityChecked = false

  /** check capabilities from git and response to it
   *
   * this process only happen once after initialize and version check
   */
  function checkCapability() {
    if (capabilityChecked || !packetBuffers.length) {
      return false
    }
    if (readPacketText() !== 'capability=clean') {
      throw new Error('bad capability')
    }
    if (readPacketText() !== 'capability=smudge') {
      throw new Error('bad capability')
    }
    if (readPacketText() !== 'capability=delay') {
      throw new Error('bad capability')
    }
    if (readPacketBin().length !== 0) {
      throw new Error('bad capability end')
    }
    writePacketText('capability=clean')
    writePacketText('capability=smudge')
    writePacketText('capability=delay')
    flushPacket()
    capabilityChecked = true
    return true
  }

  /** process data packets from git */
  async function handleReceive() {
    if (!packetBuffers.length) {
      return
    }
    const command = /^command=(.+)$/.exec(readPacketText())?.[1] || ''
    const pathname = /^pathname=(.+)$/.exec(readPacketText())?.[1] || ''

    if (!pathname) {
      throw new Error(`bad pathname '${pathname}'`)
    }

    if (readPacketBin().length !== 0) {
      throw new Error('bad content start')
    }

    // read all input real data
    let input = Buffer.from([])
    let done = false
    while (!done) {
      const buffer = readPacketBin()
      if (buffer.length === 0) {
        done = true
      }
      input = Buffer.concat([input, buffer])
    }

    let output = Buffer.from([])
    if (['clean', 'smudge'].includes(command)) {
      // filter input into output
      if (command === 'clean') {
        output = await clean(input, lfsd)
      } else if (command === 'smudge') {
        output = await smudge(input, lfsd)
      }
    } else {
      throw new Error(`bad command ${command}`)
    }

    writePacketText('status=success')
    flushPacket()

    // if output is too long, split it into several packets
    for (let i = 0; i < output.length; i += MAX_PACKET_CONTENT_SIZE) {
      writePacketBin(output.slice(i, i + MAX_PACKET_CONTENT_SIZE))
    }
    flushPacket()
    flushPacket()
  }

  process.stdin.on('data', (chunk) => {
    readChunk(chunk)
    while (packetBuffers.length) {
      checkInit()
      checkCapability()
      handleReceive()
    }
  })

  process.stdin.on('error', (err) => {
    throw err
  })
}
