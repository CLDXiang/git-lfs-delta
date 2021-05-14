import fs from 'fs'
import path from 'path'
import lfsdCwd from '../lfsd'
import { logger } from '../utils'
import { downloadFile, searchOid as SearchRemote } from '../server'

export async function catObject(oid: string, lfsd = lfsdCwd) {
  if (oid.length < 6) {
    logger.error('Length of object id prefix should be at least six', false)
  }

  const dirPath = lfsd.objectPath(oid, true)

  // /** search this object in remote server */
  // async function searchRemote() {
  //   console.log('Trying to search it from remote server...')
  //   const remoteRes = await searchOid(oid)
  //   if (!remoteRes.length) {
  //     console.log(`No such object with id prefixed by ${oid} in remote server`)
  //   }
  //   return remoteRes
  // }

  // if (!fs.existsSync(dirPath)) {
  //   console.log(`No such object with id prefixed by ${oid} in local storage`)
  //   await searchRemote()
  // }

  /** search prefix in local storage */
  function searchLocal() {
    if (!fs.existsSync(dirPath)) {
      return []
    }
    return fs.readdirSync(dirPath).filter((file) => file.startsWith(oid))
  }

  const searchLocalResult = searchLocal()
  if (!searchLocalResult.length) {
    // not found in local storage, try to search in remote server
    console.log(`No such object with prefix ${oid} found in local storage`)
    console.log('Trying to search it in remote server...')
    const searchRemoteResult = await SearchRemote(oid)
    if (!searchRemoteResult.length) {
      // can't find it in remote server
      console.log(`No such object with prefix ${oid} found`)
    } else if (searchRemoteResult.length > 1) {
      // more than one
      console.log(`Found more than one objects id match provided prefix:`)
      searchRemoteResult.forEach((id) => {
        console.log(id)
      })
      console.log(
        `Use this command with a more specific oid will output its content.\nexample: "git lfsd cat-object ${searchRemoteResult[0]}"`,
      )
    } else {
      // found one, download it and output its content
      const completeOid = searchLocalResult[0]
      console.log(
        (
          await downloadFile(
            path.join(
              completeOid.slice(0, 2),
              completeOid.slice(2, 4),
              completeOid,
            ),
            lfsd.objectPath(completeOid),
          )
        ).toString(),
      )
    }
  } else if (searchLocalResult.length > 1) {
    // found more than one objects match the prefix, output all matched oids
    console.log(`Found more than one objects id match provided prefix:`)
    searchLocalResult.forEach((id) => {
      console.log(id)
    })
    console.log(
      `Use this command with a more specific oid will output its content.\nexample: "git lfsd cat-object ${searchLocalResult[0]}"`,
    )
  } else {
    // found only one object, output its content
    console.log((await lfsd.getObjectByOid(searchLocalResult[0])).toString())
  }
}
