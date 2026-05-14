import * as fontkit from 'fontkit'
import {Font} from 'fontkit'
import fs from 'fs'

const json = JSON.parse(fs.readFileSync('input/assets/DescriptionText.json', 'utf8'))

const CompositeFont = json.pop().Properties.CompositeFont
const {DefaultTypeface, FallbackTypeface, SubTypefaces} = CompositeFont

console.log('---DEFAULT TYPE FACE, REMOVED NON REGULAR WEIGHTS---')
console.dir(DefaultTypeface.Fonts[0], { depth: null, colors: true })

console.log('---FALLBACK TYPE FACE---')
console.dir(FallbackTypeface.Typeface.Fonts[0], { depth: null, colors: true })

console.log('---SUB TYPE FACES---')

const parsedSubtypes = SubTypefaces.map((SubTypeface: any) => {
  const CharacterRanges = SubTypeface.CharacterRanges

  const ranges = CharacterRanges.map((range: any) => {

      if(range.LowerBound.Type !=='ERangeBoundTypes::Inclusive' || range.UpperBound.Type !=='ERangeBoundTypes::Inclusive') {
        throw new Error('Range is not inclusive')
      }


      return [range.LowerBound.Value, range.UpperBound.Value]
  }).sort((a: [number, number], b: [number, number]) => a[0] - b[0])


  const fonts = SubTypeface.Typeface.Fonts.map((o: any) => o.Font.LocalFontFaceAsset.ObjectPath).join(', ')
  console.log(fonts)
  console.log(ranges)

  return {
    fonts,
    ranges,
  }
})

console.log(parsedSubtypes)
