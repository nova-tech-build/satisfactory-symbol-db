import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import {CompositeFontResolver, FontLoader} from './composite-font.js'
import {readDescriptionText} from './description-text.js'
import {ListGenerator} from './list-generator.js'
import {Points} from './points.js'

type FakeFont = {
  characterSet: number[]
  glyphForCodePoint(codePoint: number): {id: number}
}

type FakeOpenedFont = FakeFont | {fonts: FakeFont[]}

type TypefaceFontFixture = {
  name: string
  asset: string
  subFaceIndex?: number
}

type SubtypeFixture = {
  ranges: [number, number][]
  culture?: string
  fonts: TypefaceFontFixture[]
}

function fakeFont(glyphIds: Record<number, number>): FakeFont {
  const glyphs = new Map(Object.entries(glyphIds).map(([codePoint, glyphId]) => [Number(codePoint), glyphId]))
  return {
    characterSet: [...glyphs.keys()],
    glyphForCodePoint: codePoint => ({id: glyphs.get(codePoint) ?? 0}),
  }
}

function fontFixture(
  files: Record<string, FakeOpenedFont>,
  subtypes: SubtypeFixture[] = [],
  subtypeFonts: TypefaceFontFixture[] = [],
  fontLoader?: FontLoader,
) {
  const directory = fs.mkdtempSync(path.join(process.cwd(), 'tmp', 'composite-font-test-'))
  const defaultFonts = [
    {name: 'Regular', asset: 'default-regular'},
    {name: 'SemiBold', asset: 'missing-default-semibold'},
    {name: 'Bold', asset: 'missing-default-bold'},
  ]
  const fallbackFonts = [{name: 'Regular', asset: 'fallback-regular'}]

  for (const asset of Object.keys(files)) {
    fs.writeFileSync(path.join(directory, `${asset}.uasset`), 'test font')
  }

  const toFontDefinition = ({name, asset, subFaceIndex = 0}: TypefaceFontFixture) => ({
    Name: name,
    Font: {
      LocalFontFaceAsset: {ObjectPath: `/Game/Font/${asset}.0`},
      SubFaceIndex: subFaceIndex,
    },
  })
  const toTypeface = (fonts: TypefaceFontFixture[]) => ({Fonts: fonts.map(toFontDefinition)})
  const descriptionPath = path.join(directory, 'DescriptionText.json')
  fs.writeFileSync(descriptionPath, JSON.stringify([
    {Name: 'OtherAsset', Properties: {}},
    {
      Name: 'DescriptionText',
      Properties: {
        CompositeFont: {
          DefaultTypeface: toTypeface(defaultFonts),
          FallbackTypeface: {Typeface: toTypeface(fallbackFonts)},
          SubTypefaces: subtypes.map(subtype => ({
            Cultures: subtype.culture ?? '',
            CharacterRanges: subtype.ranges.map(([lower, upper]) => ({
              LowerBound: {Type: 'ERangeBoundTypes::Inclusive', Value: lower},
              UpperBound: {Type: 'ERangeBoundTypes::Inclusive', Value: upper},
            })),
            Typeface: toTypeface(subtype.fonts ?? subtypeFonts),
          })),
        },
      },
    },
  ]))

  const loader: FontLoader = fontLoader ?? (fontPath => {
    const asset = path.basename(fontPath, path.extname(fontPath))
    return files[asset]
  })

  return {
    descriptionPath,
    resolver: () => new CompositeFontResolver(descriptionPath, directory, loader),
    cleanup: () => fs.rmSync(directory, {recursive: true, force: true}),
  }
}

const emptyFiles = () => ({
  'default-regular': fakeFont({}),
  'fallback-regular': fakeFont({}),
})

const regularSubtype = (asset: string, subFaceIndex = 0): TypefaceFontFixture[] => [
  {name: 'Regular', asset, subFaceIndex},
]

function pointSet(points: ReturnType<CompositeFontResolver['renderablePoints']>) {
  return new Set(points)
}

test('description wrapper exposes validated font definitions and ranges', t => {
  const fixture = fontFixture({
    ...emptyFiles(),
    collection: {fonts: [fakeFont({}), fakeFont({})]},
  }, [{ranges: [[100, 102]], fonts: regularSubtype('collection', 1)}])
  t.after(fixture.cleanup)

  const description = readDescriptionText(fixture.descriptionPath)
  assert.deepEqual(description.fallbackTypeface, {
    assetPath: '/Game/Font/fallback-regular.0',
    subFaceIndex: 0,
  })
  assert.deepEqual(description.subtypes, [{
    ranges: [{lower: 100, upper: 102}],
    fonts: {assetPath: '/Game/Font/collection.0', subFaceIndex: 1},
  }])
  assert.deepEqual(description.defaultTypeface, {
    assetPath: '/Game/Font/default-regular.0',
    subFaceIndex: 0,
  })
})

test('description wrapper rejects malformed fallback definitions and unsupported bounds', t => {
  const fixture = fontFixture(emptyFiles(), [{ranges: [[100, 102]], fonts: regularSubtype('fallback-regular')}])
  t.after(fixture.cleanup)

  const assets = JSON.parse(fs.readFileSync(fixture.descriptionPath, 'utf8'))
  const composite = assets[1].Properties.CompositeFont
  const fallback = composite.FallbackTypeface
  composite.FallbackTypeface = null
  fs.writeFileSync(fixture.descriptionPath, JSON.stringify(assets))
  assert.throws(() => readDescriptionText(fixture.descriptionPath), /FallbackTypeface must be an object/)

  composite.FallbackTypeface = fallback
  composite.SubTypefaces[0].CharacterRanges[0].LowerBound.Type = 'ERangeBoundTypes::Exclusive'
  fs.writeFileSync(fixture.descriptionPath, JSON.stringify(assets))
  assert.throws(() => readDescriptionText(fixture.descriptionPath), /must use inclusive bounds/)
})

test('composite font includes the supported Bengali and Hebrew glyphs and excludes phantom points', () => {
  const points = Points.fromCompositeFont('input/assets/DescriptionText.json')
  const values = new Set<number>()
  points.forEach(point => values.add(point.value))

  assert.ok(values.has(0x0985))
  assert.ok(values.has(0x09E6))
  assert.ok(values.has(0x05D0))
  assert.ok(values.has(0x05BE))
  for (const phantom of [0xFFFF, 0x02D7, 0x0331, 0x200C, 0x200D, 0x200E, 0x200F]) {
    assert.ok(!values.has(phantom), `U+${phantom.toString(16).toUpperCase()} should not render`)
  }
})

test('inclusive subtype range endpoints are checked against real glyph coverage', t => {
  const fixture = fontFixture({
    ...emptyFiles(),
    subtype: fakeFont({99: 1, 100: 1, 101: 1, 102: 1, 103: 1}),
  }, [{ranges: [[100, 102]], fonts: regularSubtype('subtype')}])
  t.after(fixture.cleanup)

  const values = pointSet(fixture.resolver().renderablePoints())
  assert.deepEqual([...values.keys()], [100, 101, 102])
})

test('the first matching subtype owns an overlapping range; a missing glyph does not try the next subtype', t => {
  const fixture = fontFixture({
    ...emptyFiles(),
    first: fakeFont({100: 1}),
    second: fakeFont({101: 1, 102: 1}),
  }, [
    {ranges: [[100, 101]], fonts: regularSubtype('first')},
    {ranges: [[101, 102]], fonts: regularSubtype('second')},
  ])
  t.after(fixture.cleanup)

  const values = pointSet(fixture.resolver().renderablePoints())
  assert.ok(values.has(100))
  assert.ok(!values.has(101))
  assert.ok(values.has(102))
})

test('subtypeface selection uses ranges regardless of declared culture', t => {
  const fixture = fontFixture({
    ...emptyFiles(),
    japanese: fakeFont({200: 1}),
  }, [{ranges: [[200, 200]], culture: 'ja', fonts: regularSubtype('japanese')}])
  t.after(fixture.cleanup)

  assert.ok(pointSet(fixture.resolver().renderablePoints()).has(200))
})

test('only Regular faces are loaded and checked', t => {
  const fixture = fontFixture({
    ...emptyFiles(),
    subtype: fakeFont({300: 1}),
  }, [{ranges: [[300, 301]], fonts: [
    ...regularSubtype('subtype'),
    {name: 'SemiBold', asset: 'missing-subtype-semibold'},
    {name: 'Bold', asset: 'missing-subtype-bold'},
  ]}])
  t.after(fixture.cleanup)

  const values = pointSet(fixture.resolver().renderablePoints())
  assert.ok(values.has(300))
  assert.ok(!values.has(301))
})

test('fallback supplies glyphs missing from the primary Regular face', t => {
  const files = {
    ...emptyFiles(),
    'default-regular': fakeFont({400: 1}),
    'fallback-regular': fakeFont({400: 2}),
  }
  const fixture = fontFixture(files)
  t.after(fixture.cleanup)

  assert.ok(pointSet(fixture.resolver().renderablePoints()).has(400))
})

test('collection coverage comes only from the declared subface index', t => {
  const collection = {
    fonts: [fakeFont({401: 1}), fakeFont({}), fakeFont({}), fakeFont({400: 1})],
  }
  const fixture = fontFixture({
    ...emptyFiles(),
    collection,
  }, [{ranges: [[400, 401]], fonts: regularSubtype('collection', 3)}])
  t.after(fixture.cleanup)

  const values = pointSet(fixture.resolver().renderablePoints())
  assert.ok(values.has(400))
  assert.ok(!values.has(401))
})

test('glyph-zero mappings and the U+FFFF sentinel are excluded', t => {
  const fixture = fontFixture({
    'default-regular': fakeFont({500: 0, 0xFFFF: 1}),
    'fallback-regular': fakeFont({}),
  })
  t.after(fixture.cleanup)

  const values = pointSet(fixture.resolver().renderablePoints())
  assert.ok(!values.has(500))
  assert.ok(!values.has(0xFFFF))
})

test('missing assets and unavailable collection faces fail with actionable errors', t => {
  const missingAsset = fontFixture(emptyFiles(), [{
    ranges: [[600, 600]],
    fonts: regularSubtype('not-installed'),
  }])
  t.after(missingAsset.cleanup)
  assert.throws(missingAsset.resolver, /Font asset .* was not found/)

  const missingFace = fontFixture({
    ...emptyFiles(),
    collection: {fonts: [fakeFont({})]},
  }, [{ranges: [[601, 601]], fonts: regularSubtype('collection', 3)}])
  t.after(missingFace.cleanup)
  assert.throws(missingFace.resolver, /has no face at index 3/)
})

test('font lookup ignores files in nested directories', t => {
  const nestedOnly = fontFixture({
    ...emptyFiles(),
  }, [{ranges: [[650, 650]], fonts: regularSubtype('nested-font')}])
  t.after(nestedOnly.cleanup)
  const excludedDirectory = path.join(path.dirname(nestedOnly.descriptionPath), 'exclude')
  fs.mkdirSync(excludedDirectory)
  fs.writeFileSync(path.join(excludedDirectory, 'nested-font.uasset'), 'test font')
  assert.throws(nestedOnly.resolver, /Font asset .* was not found/)

  const duplicate = fontFixture({
    ...emptyFiles(),
    subtype: fakeFont({651: 1}),
  }, [{ranges: [[651, 651]], fonts: regularSubtype('subtype')}])
  t.after(duplicate.cleanup)
  const duplicateExcludeDirectory = path.join(path.dirname(duplicate.descriptionPath), 'exclude')
  fs.mkdirSync(duplicateExcludeDirectory)
  fs.writeFileSync(path.join(duplicateExcludeDirectory, 'subtype.uasset'), 'duplicate font')
  assert.ok(pointSet(duplicate.resolver().renderablePoints()).has(651))
})

test('font directory and loader errors are not wrapped', t => {
  const missingDirectory = fontFixture(emptyFiles())
  t.after(missingDirectory.cleanup)
  assert.throws(
    () => new CompositeFontResolver(
      missingDirectory.descriptionPath,
      path.join(path.dirname(missingDirectory.descriptionPath), 'missing'),
    ),
    error => error instanceof Error && 'code' in error && error.code === 'ENOENT',
  )

  const loaderError = new Error('font loader failed')
  const failedLoader = fontFixture(emptyFiles(), [], [], () => {
    throw loaderError
  })
  t.after(failedLoader.cleanup)
  assert.throws(failedLoader.resolver, error => error === loaderError)
})

test('font lookup uses only uasset files', t => {
  const missingUfont = fontFixture(emptyFiles(), [{
    ranges: [[652, 652]],
    fonts: regularSubtype('missing-ufont'),
  }])
  t.after(missingUfont.cleanup)
  for (const extension of ['ufont', 'ttf', 'ttc', 'otf']) {
    fs.writeFileSync(path.join(path.dirname(missingUfont.descriptionPath), `missing-ufont.${extension}`), 'not a font')
  }
  assert.throws(missingUfont.resolver, /Font asset .* was not found/)

  const withAlternatives = fontFixture({
    ...emptyFiles(),
    subtype: fakeFont({653: 1}),
  }, [{ranges: [[653, 653]], fonts: regularSubtype('subtype')}])
  t.after(withAlternatives.cleanup)
  for (const extension of ['ufont', 'ttf', 'ttc', 'otf']) {
    fs.writeFileSync(path.join(path.dirname(withAlternatives.descriptionPath), `subtype.${extension}`), 'not a font')
  }
  assert.ok(pointSet(withAlternatives.resolver().renderablePoints()).has(653))
})

test('missing style definitions without a Regular face are rejected', t => {
  const files = {
    ...emptyFiles(),
    subtype: fakeFont({700: 1}),
  }
  const fixture = fontFixture(files, [{
    ranges: [[700, 700]],
    fonts: [{name: 'SemiBold', asset: 'subtype'}],
  }])
  t.after(fixture.cleanup)

  assert.throws(fixture.resolver, /must define a Regular font/)
})

test('list generator includes known-good points once and still applies block filters', () => {
  const generated = new ListGenerator('input/fonts').generateBlocks().unwrap()
  const counts = new Map<number, number>()
  generated.forEach(block => block.pointsAsNumbers.forEach(value => {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }))

  for (const value of [0x2044, 0x2120, 0xFEFF]) {
    assert.equal(counts.get(value), 1, `U+${value.toString(16).toUpperCase()} should occur once`)
  }

  const filtered = new ListGenerator('input/fonts')
    .withBlockFilter(block => block.name !== 'Letterlike Symbols')
    .generateBlocks().unwrap()
  const filteredValues = new Set<number>()
  filtered.forEach(block => block.pointsAsNumbers.forEach(value => filteredValues.add(value)))

  assert.ok(!filteredValues.has(0x2120))
  assert.ok(filteredValues.has(0x2044))
  assert.ok(filteredValues.has(0xFEFF))
})

test('generated block contents match the checked-in lists without depending on timestamps', () => {
  const generated = new ListGenerator('input/fonts').generateBlocks().unwrap().map(block => ({
    name: block.name,
    block: {name: block.name, start: block.start, end: block.end},
    points: block.pointsAsNumbers,
  }))
  const all = JSON.parse(fs.readFileSync('public/generated/all.json', 'utf8'))
  assert.deepEqual(generated, all.subsets)

  const generatedByName = new Map(generated.map(block => [block.name, block]))
  const nova = JSON.parse(fs.readFileSync('public/generated/nova.json', 'utf8'))
  for (const subset of nova.subsets) {
    assert.deepEqual(generatedByName.get(subset.name), subset)
  }
})