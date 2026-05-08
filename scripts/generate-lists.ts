import {ListGenerator} from './lib/list-generator.js'
import {Block} from './lib/blocks.js'

const inputDir: string = 'input-fonts'

new ListGenerator(
  inputDir,
  'public/generated/all.json',
)//.run()


new ListGenerator(
  inputDir,
  'public/generated/nova.json',
).withBlockFilter((block: Block) => {
  const exclude: string[] = [
    'Arabic Supplement',
    'Arabick Presentation Forms-A',
    'Arabick Presentation Forms-B',
    'Basic Latin',
    'Bopomofo',
    'Bopomofo Extended',
    'CJK Compatibility Ideographs',
    'CJK Compatibility Ideographs Supplement',
    'CJK Radicles Supplement',
    'CJK Strokes',
    'CJK Unified Ideographs',
    'CJK Unified Ideographs Extension A',
    'CJK Unified Ideographs Extension B',
    'CJK Unified Ideographs Extension C',
    'CJK Unified Ideographs Extension D',
    'CJK Unified Ideographs Extension E',
    'Enclosed Ideographic Supplement',
    'Hangul Jamo',
    'Hangul Jamo',
    'Hangul Jamo Extended-A',
    'Hangul Jamo Extended-B',
    'Hangul Syllables',
    'Hiragana',
    'Kanbun',
    'Kangxi Radicals',
    'Katakana',
  ]
  return !exclude.includes(block.name)
}).withBlockSort((a: Block, b: Block) => {
  const explicit: string[] = [
    'Arrows',
    'Block Elements',
    'Box Drawing',
    'CJK Compatibility',
    'CJK Compatibility Forms',
    'CJK Symbols and Punctuation',
    'Combining Diacritical Marks for Symbols',
    'Control Pictures',
    'Currency Symbols',
    'Dingbats',
    'Enclosed Alphanumerics',
    'Enclosed Alphanumerics Supplement',
    'Enclosed CJK Letters and Months',
    'General Punctuation',
    'Geometric Shapes',
    'Halfwidth and Fullwidth Forms',
    'Ideographic Description Characters',
    'Letterlike Symbols',
    'Mathematical Operators',
    'Miscellaneous Mathematical Symbols-B',
    'Miscellaneous Symbols',
    'Miscellaneous Symbols and Arrows',
    'Miscellaneous Technical',
    'Number Forms',
    'Small Form Variants',
    'Specials',
    'Supplemental Arrows-B',
    'Superscripts and Subscripts',
  ]

  const ai = explicit.indexOf(a.name)
  const bi = explicit.indexOf(b.name)

  return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi) || a.start - b.start
}).run()


