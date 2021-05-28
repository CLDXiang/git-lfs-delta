import lfsdCwd from '../lfsd'
import { logger } from '../utils'

export function setServer(url: string) {
  lfsdCwd.setServerURL(url)
  logger.success(`succeed set server: ${url}`)
}

export function viewServer() {
  const url = lfsdCwd.getServerURL()
  if (!url) {
    logger.warn(
      'no server found, please set it with "git lfsd server <server url>"',
      false,
    )
  } else {
    console.log(url)
  }
}
