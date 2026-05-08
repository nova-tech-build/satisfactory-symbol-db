import {ListGenerator} from './lib/list-generator.js'
import {Block} from './lib/blocks.js'

const inputDir: string = 'input-fonts'

new ListGenerator(
  inputDir,
  'public/generated/all.json',
).run()


new ListGenerator(
  inputDir,
  'public/generated/nova.json',
).withBlockFilter((block: Block) => {
  const exclude: string[] = [
    'Alphabetic Presentation Forms',
    'Arabic',
    'Arabic Presentation Forms-A',
    'Arabic Presentation Forms-A',
    'Arabic Presentation Forms-B',
    'Arabic Supplement',
    'Basic Latin',
    'Bopomofo',
    'Bopomofo Extended',
    'CJK Compatibility Ideographs',
    'CJK Compatibility Ideographs Supplement',
    'CJK Radicals Supplement',
    'CJK Strokes',
    'CJK Unified Ideographs',
    'CJK Unified Ideographs Extension A',
    'CJK Unified Ideographs Extension B',
    'CJK Unified Ideographs Extension C',
    'CJK Unified Ideographs Extension D',
    'CJK Unified Ideographs Extension E',
    'Combining Diacritical Marks',
    'Combining Diacritical Marks for Symbols',
    'Cyrillic',
    'Cyrillic Supplement',
    'Enclosed Ideographic Supplement',
    'Greek Extended',
    'Hangul Compatibility Jamo',
    'Hangul Jamo',
    'Hangul Jamo',
    'Hangul Jamo Extended-A',
    'Hangul Jamo Extended-B',
    'Hangul Syllables',
    'Hiragana',
    'IPA Extensions',
    'Kanbun',
    'Kangxi Radicals',
    'Katakana',
    'Katakana Phonetic Extensions',
    'Latin Extended-A',
    'Latin Extended-B',
    'Latin Extended Additional',
    'Supplemental Punctuation',
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
    'Enclosed Alphanumeric Supplement',
    'Enclosed Alphanumerics',
    'Enclosed CJK Letters and Months',
    'General Punctuation',
    'Geometric Shapes',
    'Greek and Coptic',
    'Halfwidth and Fullwidth Forms',
    'Ideographic Description Characters',
    'Latin-1 Supplement',
    'Letterlike Symbols',
    'Mathematical Operators',
    'Miscellaneous Mathematical Symbols-B',
    'Miscellaneous Symbols',
    'Miscellaneous Symbols and Arrows',
    'Miscellaneous Technical',
    'Number Forms',
    'Small Form Variants',
    'Spacing Modifier Letters',
    'Specials',
    'Supplemental Arrows-B',
    'Superscripts and Subscripts',
    'Vertical Forms',
  ]

  const ai = explicit.indexOf(a.name)
  const bi = explicit.indexOf(b.name)

  return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi) || a.start - b.start
}).run()


