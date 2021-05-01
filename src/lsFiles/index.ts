import { RevListObject } from '../git'
import lfsdCwd from '../lfsd'
import AttributesParser from '../AttributesParser'
import { formatBytes } from '../utils'

interface LsFilesOptions {
  /** Show the entire 64 character OID, instead of just first 10. */
  long?: boolean
  /** Show the size of the LFS object between parenthesis at the end of a line. */
  size?: boolean
  /** Show as much information as possible about a LFS file. */
  debug?: boolean
  /** Inspects the full history of the repository, not the current HEAD (or other provided reference). This will include previous versions of LFS objects that are no longer found in the current tree. */
  all?: boolean
  /** Show only the lfs tracked file names. */
  nameOnly?: boolean
}

export function lsFiles(
  refs: string[],
  options: LsFilesOptions = {},
  lfsd = lfsdCwd,
) {
  /** filter objects, return those with file name and are filtered by .gitattributes */
  function filterAttributesMatchedFilePaths(objects: RevListObject[]) {
    const attributesParser = new AttributesParser(
      lfsd.git.attributesFileContent,
    )
    return objects.filter(
      (obj) => obj.filePath && attributesParser.match(obj.filePath),
    )
  }

  function printObjInfo(obj: RevListObject) {
    const pointer = lfsd.git.catFile(obj.sha)
    const { version, sha256, size } = lfsd.parsePointer(pointer)
    const objInfo = options.debug
      ? `filepath: ${obj.filePath}\nsize: ${size}\ndownload: ${lfsd.existsLocal(
          sha256,
        )}\noid: sha256 ${sha256}\nversion: ${version}\n`
      : `${options.long ? sha256 : sha256.slice(0, 10)} ${
          lfsd.existsLocal(sha256) ? '*' : '-'
        } ${obj.filePath}${options.size ? ` (${formatBytes(size)})` : ''}`

    console.log(objInfo)
    return objInfo
  }

  const objects = (() => {
    if (refs.length === 0) {
      return lfsd.git.revListObjects([lfsd.git.currentRef.name], options.all)
    }
    if (refs.length === 1) {
      return lfsd.git.revListObjects([refs[0]], options.all)
    }
    if (refs.length === 2) {
      return lfsd.git.revListObjects([refs[1], refs[0]], options.all)
    }
    throw new Error(
      `refs params number should less than three, receive: ${refs}}`,
    )
  })()
  /** all file objects, should be pointers */
  const matchedObjects = filterAttributesMatchedFilePaths(objects)
  return matchedObjects.map((obj) => printObjInfo(obj))
}
