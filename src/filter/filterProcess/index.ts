import { preZero } from './utils'
import { clean, smudge } from './commands'

const MAX_PACKET_CONTENT_SIZE = 65516

export async function filterProcess() {
  const packetBuffers: Buffer[] = []

  function readChunk(chunk: Buffer) {
    let offset = 0
    while (offset < chunk.length) {
      const sizeBuffer = chunk.slice(offset, offset + 4)
      offset += 4
      if (sizeBuffer.length !== 4) {
        throw new Error(`invalid packet: '${sizeBuffer}'`)
      }

      const packetSize = parseInt(sizeBuffer.toString(), 16)
      if (packetSize === 0) {
        packetBuffers.push(Buffer.from([]))
      } else if (packetSize > 4) {
        const contentSize = packetSize - 4
        const contentBuffer = chunk.slice(offset, offset + contentSize)
        offset += contentSize
        if (contentBuffer.length !== contentSize) {
          throw new Error(
            `invalid packet (${contentSize} bytes expected; ${contentBuffer.byteLength} bytes read)`,
          )
        }
        packetBuffers.push(contentBuffer)
      } else {
        throw new Error(`invalid packet size: ${packetSize}`)
      }
    }
  }

  function readPacketBin() {
    if (packetBuffers.length === 0) {
      throw new Error('unexpected empty buffer')
    }
    return packetBuffers.shift() as Buffer
  }

  function readPacketText() {
    const content = packetBuffers.shift()?.toString() || ''
    if (!/\n$/.test(content)) {
      throw new Error(
        `A non-binary line MUST be terminated by an LF. Line content: ${content}`,
      )
    }
    return content.trim()
  }

  function writePacketText(content: string) {
    /** size to write, bytes of content + 4 bytes size + 1 byte LF */
    const size = Buffer.from(content).byteLength + 5
    console.log(`${preZero(size.toString(16))}${content}`)
  }

  function writePacketBin(buffer: Buffer) {
    /** size to write, bytes of content + 4 bytes size */
    const size = buffer.byteLength + 4
    process.stdout.write(`${preZero(size.toString(16))}`)
    process.stdout.write(buffer)
  }

  function flushPacket() {
    process.stdout.write('0000')
  }

  let initChecked = false

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

  let capabilityChecked = false

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
      if (command === 'clean') {
        output = await clean(input)
      } else if (command === 'smudge') {
        output = await smudge(input)
      }
    } else {
      throw new Error(`bad command ${command}`)
    }

    writePacketText('status=success')
    flushPacket()

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
