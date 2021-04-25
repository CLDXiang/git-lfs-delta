/** fill string with 0 prefix */
export function preZero(str: string, size = 4) {
  let res = str
  while (res.length < size) {
    res = `0${res}`
  }
  return res
}
