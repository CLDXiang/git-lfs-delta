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

foo/**

/*.ext
  `).rules,
  ).toEqual([
    /^somethingInRoot$/,
    /^(?:.*\/)?backslash space in the end should not be trimmed $/,
    /^(?:.*\/)?[^/]*\.ext$/,
    /^foo\/[^/]*\.bar$/,
    /^(?:.*\/)?foo\/[^/]*\.bar$/,
    /^foo(?:(?:\/.*\/)|\/)bar$/,
    /^(?:.*\/)?foo$/,
    /^(?:.*\/)?foo(?:(?:\/.*\/)|\/)[^/]*\.bar$/,
    /^(?:.*\/)?foo(?:(?:\/.*\/)|\/)bar\/[^/]*\.ext$/,
    /^(?:.*\/)?foo\/.*$/,
    /^[^/]*\.ext$/,
  ])
})

test('file names are matched', () => {
  const attributesParser = new AttributesParser(`
  *.txt
  
  data/**/*.csv
  
  data2/**/*
  
  /*.ext`)

  expect(
    [
      'a.txt',
      'foo/a.txt',
      'data/a.csv',
      'data/a/b.csv',
      'data/a/b/c.csv',
      'data2/a.txt',
      'a.csv',
      't.ext',
      'data/a/b/c.ext',
      'data2/a/b/c.ext',
    ].filter(attributesParser.match),
  ).toEqual([
    'a.txt',
    'foo/a.txt',
    'data/a.csv',
    'data/a/b.csv',
    'data/a/b/c.csv',
    'data2/a.txt',
    't.ext',
    'data2/a/b/c.ext',
  ])
})
