import { errorExit } from '../utils'

export function addPath(newPath: string) {
  if (!newPath) {
    errorExit('Please provide a valid path')
  }
}
