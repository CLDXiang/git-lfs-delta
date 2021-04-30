const GIT_LFSD_SPACING = '#GIT_LFSD_SPACING#'
const GIT_LFSD_CONSECUTIVE_ASTERISKS = '#GIT_LFSD_CONSECUTIVE_ASTERISKS#'
const GIT_LFSD_CONSECUTIVE_ASTERISKS_TWO_SLASH =
  '#GIT_LFSD_CONSECUTIVE_ASTERISKS_TWO_SLASH#'
const GIT_LFSD_CONSECUTIVE_ASTERISKS_LEFT_SLASH =
  '#GIT_LFSD_CONSECUTIVE_ASTERISKS_LEFT_SLASH#'
const GIT_LFSD_CONSECUTIVE_ASTERISKS_RIGHT_SLASH =
  '#GIT_LFSD_CONSECUTIVE_ASTERISKS_RIGHT_SLASH#'

/** An util parser to check whether some patterns match the .gitattributes config
 *
 * using rules according to [.gitignore spec 2.31.1](https://www.git-scm.com/docs/gitignore)
 *
 * as [.gitattributes spec](https://www.git-scm.com/docs/gitattributes) states, ignore following pattern:
 *
 * - negative patterns
 * - trailing-slash pattern which represents a directory
 */
export default class AttributesParser {
  constructor(attributesFileContent: string) {
    // init rules
    this.rules = attributesFileContent
      .split('\n')
      .map((line) =>
        line
          .replace(/\\ /g, GIT_LFSD_SPACING)
          .trim()
          .split(' ')[0]
          .replace(new RegExp(GIT_LFSD_SPACING, 'g'), ' '),
      ) // trim trailing spaces, replace all '\ ' to a marker temporarily so that they won't be trimmed
      .filter(
        (line) =>
          line && // remove empty lines
          !line.startsWith('#') && // remove comment lines
          !line.startsWith('!') && // remove negative patterns
          !line.endsWith('/'), // remove trailing-slash patterns which represents a directory
      )
      .map((line) =>
        !line.startsWith('/') && !line.startsWith('**/') ? `**/${line}` : line,
      )
      .map(
        (line) =>
          line
            .replace(/\/\*\*\//g, GIT_LFSD_CONSECUTIVE_ASTERISKS_TWO_SLASH)
            .replace(/\/\*\*/g, GIT_LFSD_CONSECUTIVE_ASTERISKS_LEFT_SLASH)
            .replace(/\*\*\//g, GIT_LFSD_CONSECUTIVE_ASTERISKS_RIGHT_SLASH)
            .replace(/\*\*/g, GIT_LFSD_CONSECUTIVE_ASTERISKS)
            .replace(/\*/g, '[^/]*')
            .replace(/\./g, '\\.')
            .replace(/\?/g, '[^/]')
            .replace(
              new RegExp(GIT_LFSD_CONSECUTIVE_ASTERISKS_LEFT_SLASH, 'g'),
              '\\/.*',
            )
            .replace(
              new RegExp(GIT_LFSD_CONSECUTIVE_ASTERISKS_RIGHT_SLASH, 'g'),
              '(?:.*\\/)?',
            )
            .replace(
              new RegExp(GIT_LFSD_CONSECUTIVE_ASTERISKS_TWO_SLASH, 'g'),
              '(?:(?:\\/.*\\/)|\\/)',
            )
            .replace(new RegExp(GIT_LFSD_CONSECUTIVE_ASTERISKS, 'g'), '[^/]*'), // to regexp
      )
      .map((line) => (line.startsWith('/') ? line.slice(1) : line)) // remove prefix '/', because all input represent relative path to the root
      .map((line) => new RegExp(`^${line}$`))
  }

  /** rules regexp */
  rules: RegExp[]

  /** check whether a file path match the rules, should be the relative path to git repo root */
  match = (filePath: string) => {
    const slashFilePath = filePath.replace(/\\\\/g, '/') // for windows, '\\' -> '/'
    return this.rules.some(
      (rule) =>
        rule.test(filePath.startsWith('/') ? filePath.slice(1) : filePath) ||
        rule.test(
          slashFilePath.startsWith('/')
            ? slashFilePath.slice(1)
            : slashFilePath,
        ),
    )
  }
}
