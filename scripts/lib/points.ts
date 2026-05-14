import fs from 'node:fs'
import {TtFile} from './tt-file.js'
import {Font} from 'fontkit'

export class Point {
  constructor(public readonly value: number) {
  }
}

export class Points {

  private points: Point[]

  constructor(codePoints: Point[]) {
    this.points = codePoints.sort((a, b) => a.value - b.value)
  }

  static fromTtFile(path: string): Points {
    const file = new TtFile(path)
    const points: Point[] = []

    file.fonts.forEach((font: Font) => {
      font.characterSet.forEach((p: number) => {
        points.push(new Point(p))
      })
    })

    return new Points(points)
  }

  static fromCompositeFontSubtypes(path: string): Points {

    const json = JSON.parse(fs.readFileSync(path, 'utf8'))
    const CompositeFont = json.pop().Properties.CompositeFont

    const parsedSubtypes = CompositeFont.SubTypefaces.map((SubTypeface: any) => {
      const CharacterRanges = SubTypeface.CharacterRanges

      const ranges = CharacterRanges.map((range: any) => {

        if (range.LowerBound.Type !== 'ERangeBoundTypes::Inclusive' || range.UpperBound.Type !== 'ERangeBoundTypes::Inclusive') {
          throw new Error('Range is not inclusive')
        }


        return [range.LowerBound.Value, range.UpperBound.Value]
      }).sort((a: [number, number], b: [number, number]) => a[0] - b[0])


      const fonts = SubTypeface.Typeface.Fonts.map((o: any) => o.Font.LocalFontFaceAsset.ObjectPath).join(', ')

      return {
        fonts,
        ranges,
      }
    })

    console.dir(parsedSubtypes, {depth: null, colors: true})

    const pts: number[] = []

    parsedSubtypes
      //exclude the CJK since thats the fallback font - dont see why they're re-defining it as an override
      .filter((t: any) => {
        return !t.fonts.includes('CJK')
      })
      //only include the NotoSans-Regular, NotoSansDisplay -  for now - other overrides point to ranges not supported in the fonts
      .filter((t: any) => {
        return t.fonts.includes('NotoSans-Regular') || t.fonts.includes('NotoSansDisplay')
      })
      .forEach((subtype: any) => {
        pts.push(...subtype.ranges.flatMap((range: [number, number]) => {
          return Array.from({length: range[1] - range[0] + 1}, (_, i) => range[0] + i)
        }))
      })

    const filtered = [...new Set(pts)].filter(p => {
      return [
        //NotoSansDisplay manual exclusions
        8306,
        8307,
        8335,
        8349,
        8350,
        8351,
      ].indexOf(p) === -1
    })


    return new Points(filtered.map(p => new Point(p)))
  }

  public forEach(callback: (p: Point) => void): void {
    this.points.forEach(callback)
  }

  public merge(other: Points): Points {
    return new Points([...this.points, ...other.points])
  }

  public unique(): Points {
    const map = new Map<number, Point>()

    for (const p of this.points) {
      map.set(p.value, p)
    }

    return new Points(Array.from(map.values()))
  }
}
