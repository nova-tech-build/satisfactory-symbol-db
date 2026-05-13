import {ListGenerator} from './lib/list-generator.js'
import {Block} from './lib/blocks.js'
import {parse} from 'node-html-parser'


const url = 'https://satisfactory.wiki.gg/wiki/Signs/Known_symbols'

const html = await fetch(url).then(r => {
  if (!r.ok) {
    throw new Error(`HTTP ${r.status}`)
  }
  return r.text()
})


const root = parse(html)

const wikiChars = [...root.querySelectorAll('td')]
  .map(td => {
    let content = String(td.textContent)

    content = content.replace(/U\+([0-9A-Fa-f]{4,6})/g, (_, hex: string) => {
      return String.fromCodePoint(parseInt(hex, 16))
    })

    return content
  })
  .join('')

const wikiPoints = Array
  .from(wikiChars)
  .map(c => c.codePointAt(0)!)
  .concat(...Array(256).keys())

const uniqueWikiPoints = [...new Set(wikiPoints)].sort((a, b) => a - b)

console.log(`Found ${uniqueWikiPoints.length} unique wiki points`)

const inputDir: string = 'input/fonts'

new ListGenerator(
  inputDir,
).withBlockMap((block: Block): Block => {
    uniqueWikiPoints.forEach((v: number) => {
      block.removePointAsNumber(v)
    })
    return block
  },
)
  .withBlockFilter((block: Block) => block.pointsAsNumbers.length > 0)
  .withBlockSort(
    ListGenerator.createExplicitSort([
      //'Alphabetic Presentation Forms',
      //'Arabic Presentation Forms-A',
      //'Arabic Presentation Forms-B',
      'Arrows',
      'Block Elements',
      'Box Drawing',
      'CJK Compatibility Forms',
      'CJK Symbols and Punctuation',
      //'Combining Diacritical Marks',
      //'Combining Diacritical Marks for Symbols',
      'Control Pictures',
      'Currency Symbols',
      'Dingbats',
      'Enclosed Alphanumeric Supplement',
      'Enclosed Alphanumerics',
      //'Enclosed CJK Letters and Months',
      //'Enclosed Ideographic Supplement',
      'General Punctuation',
      'Geometric Shapes',
      //'Halfwidth and Fullwidth Forms',
      'Letterlike Symbols',
      'Ideographic Description Characters',
      'Mathematical Operators',
      'Miscellaneous Mathematical Symbols-B',
      'Miscellaneous Symbols',
      'Miscellaneous Symbols and Arrows',
      'Miscellaneous Technical',
      'Number Forms',
      'Small Form Variants',
      'Spacing Modifier Letters',
      //'Specials',
      'Supplemental Arrows-B',
      'Supplemental Punctuation',
      'Superscripts and Subscripts',
      'Vertical Forms',
    ]),
  )
  .output('public/generated/ex-wiki.json')
  .outputAsText('public/generated/ex-wiki.txt')
