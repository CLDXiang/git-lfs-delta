import AttributesParser from './AttributesParser'

test('empty attributesFile results empty rules array', () => {
  expect(new AttributesParser('').rules).toEqual([])
})

test('the init creates correct rules', () => {
  expect(
    new AttributesParser(`
# This is a comment in a .gitignore file!
/somethingInRoot

  backslash space in the end should not be trimmed\\ 

*.ext

!/this rule should be ignored

thisRuleShouldBeIgnored/ 

/foo/*.bar

foo/*.bar

/foo/**/bar

**/foo

foo/**/*.bar

foo/**/bar/*.ext
  `).rules,
  ).toEqual([
    /\/somethingInRoot/,
    /.*\/backslash space in the end should not be trimmed /,
    /.*\/[^/]*\.ext/,
    /\/foo\/[^/]*\.bar/,
    /.*\/foo\/[^/]*\.bar/,
    /\/foo\/.*\/bar/,
    /.*\/foo/,
    /.*\/foo\/.*\/[^/]*\.bar/,
    /.*\/foo\/.*\/bar\/[^/]*\.ext/,
  ])
})
