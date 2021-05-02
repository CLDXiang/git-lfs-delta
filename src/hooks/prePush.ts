import fs from 'fs'
import path from 'path'
import { logger } from '../utils'
import { Ref, RevListObject } from '../git'
import AttributesParser from '../AttributesParser'
import lfsdCwd from '../lfsd'
import { checkNotExist, uploadFile } from '../server'

export async function prePush(args: string[], lfsd = lfsdCwd) {
  /** decode a line in pre-push hook's STDIN to two Ref objects */
  function decodeRefs(line: string): [Ref, Ref] {
    const refs = line.trim().split(' ')
    while (refs.length < 4) {
      refs.push('')
    }
    return [
      lfsd.git.parseRef(refs[0], refs[1]),
      lfsd.git.parseRef(refs[2], refs[3]),
    ]
  }

  /** parse pre-push hooks's STDIN to an Array of [local Ref, remote Ref] */
  // eslint-disable-next-line consistent-return
  function prePushRefs() {
    try {
      const stdin = fs.readFileSync(0, 'utf-8')
      return stdin
        .trim() // trim whole input text
        .split('\n') // split to lines
        .map((line) => line.trim()) // trim each line
        .filter((line) => line) // filter empty lines
        .map(decodeRefs) // decode line string to [Ref, Ref]
        .filter(([localRef, _]) => lfsd.git.isZeroObjectID(localRef.sha)) // filter lines where local Ref is zero object
    } catch (e) {
      if (e.code === 'EOF') {
        process.exit(0)
      } else {
        throw e
      }
    }
  }

  /** filter objects, return those with file name and are filtered by .gitattributes */
  function filterAttributesMatchedFilePaths(objects: RevListObject[]) {
    const attributesParser = new AttributesParser(
      lfsd.git.attributesFileContent,
    )
    return objects.filter(
      (obj) => obj.filePath && attributesParser.match(obj.filePath),
    )
  }

  if (!args.length) {
    logger.error("This should be run through Git's pre-push hook.")
  }

  // parse Refs to push
  const refPairs = prePushRefs()

  // find all LFSD objects ID to upload

  /** all blob objects, may has repeat */
  let revListObjects: RevListObject[] = []
  refPairs.forEach(([localRef, remoteRef]) => {
    if (lfsd.git.isZeroObjectID(remoteRef.sha)) {
      // remote ref is zero, should contain all objects in local Ref
      revListObjects = [
        ...revListObjects,
        ...lfsd.git.revListObjects([localRef.sha]),
      ]
    } else {
      // contain new objects only exists in local Ref
      revListObjects = [
        ...revListObjects,
        ...lfsd.git.revListObjects([localRef.sha, remoteRef.sha]),
      ]
    }
  })

  /** filter all LFSD object without repeat */
  const matchedObjects = filterAttributesMatchedFilePaths(
    revListObjects,
  ).filter(
    (obj, index, arr) => arr.findIndex((o) => o.sha === obj.sha) === index,
  )

  if (!matchedObjects.length) {
    // nothing to upload, exit
    return
  }
  console.log(`LFSD: objects to upload: ${matchedObjects.length}`)

  // resolve pointer to sha256
  const matchedLFSDObjects = matchedObjects.map((obj) => {
    const pointer = lfsd.git.catFile(obj.sha)
    const { sha256 } = lfsd.parsePointer(pointer)
    return {
      ...obj,
      sha256,
    }
  })

  // ask server which objects to upload
  const idsToUpload = (
    await checkNotExist(
      matchedLFSDObjects.map(({ sha256 }) =>
        path.join(sha256.slice(0, 2), sha256.slice(2, 4), sha256),
      ),
    )
  ).map((p) => path.basename(p))

  if (!idsToUpload.length) {
    console.log('LFSD: all objects have already been uploaded')
    return
  }

  const sha2FilePath: Record<string, string | undefined> = {}
  matchedLFSDObjects.forEach((obj) => {
    sha2FilePath[obj.sha256] = obj.filePath
  })

  // upload objects
  const uploadThreads = idsToUpload.map(async (sha256, index) => {
    console.log(
      `LFSD: uploading ${sha2FilePath[sha256]} (${index + 1}/${
        idsToUpload.length
      })`,
    )

    return uploadFile(
      lfsd.objectPath(sha256),
      path.join(sha256.slice(0, 2), sha256.slice(2, 4), sha256),
    )
  })

  await Promise.all(uploadThreads)
}
