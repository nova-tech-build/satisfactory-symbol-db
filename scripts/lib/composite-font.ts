import fs from 'node:fs'
import path from 'node:path'
import * as fontkit from 'fontkit'
import {DescriptionFont, readDescriptionText} from './description-text.js'

type FontFace = {
  characterSet: readonly number[]
  glyphForCodePoint(codePoint: number): {id: number} | null
}

type OpenedFont = FontFace | {fonts: readonly FontFace[]}

export type FontLoader = (fontPath: string) => OpenedFont

type LoadedFace = ReadonlySet<number>

type CharacterRange = {
  lower: number
  upper: number
}

type SubTypeface = {
  ranges: CharacterRange[]
  face: LoadedFace
}

const openFont: FontLoader = fontPath => fontkit.openSync(fontPath) as unknown as OpenedFont

function isFontCollection(font: OpenedFont): font is {fonts: readonly FontFace[]} {
  return 'fonts' in font
}

function isUnicodeScalar(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 0x10FFFF &&
    (value < 0xD800 || value > 0xDFFF) && value !== 0xFFFF
}

export class CompositeFontResolver {
  private readonly fontFiles: string[]
  private readonly faceCache = new Map<string, LoadedFace>()
  private readonly defaultTypeface: LoadedFace
  private readonly fallbackTypeface: LoadedFace
  private readonly subtypes: SubTypeface[]

  constructor(
    descriptionPath: string,
    private readonly fontDirectory: string,
    private readonly fontLoader: FontLoader = openFont,
  ) {
    this.fontFiles = this.listFontFiles(fontDirectory)

    const description = readDescriptionText(descriptionPath)
    this.defaultTypeface = this.parseTypeface(description.defaultTypeface)
    this.fallbackTypeface = this.parseTypeface(description.fallbackTypeface)
    this.subtypes = description.subtypes.map(subtype => ({
      ranges: subtype.ranges,
      face: this.parseTypeface(subtype.fonts),
    }))
  }

  renderablePoints(): number[] {
    const candidates = new Set<number>()
    for (const face of this.faceCache.values()) {
      face.forEach(value => candidates.add(value))
    }

    const points: number[] = []
    for (const value of [...candidates].sort((a, b) => a - b)) {
      if (!isUnicodeScalar(value)) {
        continue
      }

      const subtype = this.subtypes.find(candidate =>
        candidate.ranges.some(range => value >= range.lower && value <= range.upper),
      )
      const primaryFace = subtype?.face ?? this.defaultTypeface
      if (primaryFace.has(value) || this.fallbackTypeface.has(value)) {
        points.push(value)
      }
    }

    return points
  }

  private parseTypeface(font: DescriptionFont): LoadedFace {
    return this.loadFace(font.assetPath, font.subFaceIndex)
  }

  private loadFace(assetPath: string, subFaceIndex: number): LoadedFace {
    const fontPath = this.resolveFontPath(assetPath)
    const cacheKey = `${fontPath.toLowerCase()}#${subFaceIndex}`
    const cached = this.faceCache.get(cacheKey)
    if (cached) {
      return cached
    }

    const opened = this.fontLoader(fontPath)

    const face = isFontCollection(opened)
      ? opened.fonts[subFaceIndex]
      : subFaceIndex === 0 ? opened : undefined
    if (!face) {
      throw new Error(`Font asset ${assetPath} at ${fontPath} has no face at index ${subFaceIndex}`)
    }
    const glyphs = new Set<number>()
    for (const value of face.characterSet) {
      const glyph = face.glyphForCodePoint(value)
      if (glyph && glyph.id !== 0) {
        glyphs.add(value)
      }
    }

    this.faceCache.set(cacheKey, glyphs)
    return glyphs
  }

  private resolveFontPath(assetPath: string): string {
    const objectName = assetPath.split('/').pop()?.replace(/\.\d+$/, '')
    if (!objectName) {
      throw new Error(`Invalid font asset path: ${assetPath}`)
    }

    const expectedFileName = `${objectName}.uasset`.toLowerCase()
    const matchingFiles = this.fontFiles.filter(file => path.basename(file).toLowerCase() === expectedFileName)
    if (matchingFiles.length === 0) {
      throw new Error(`Font asset ${assetPath} was not found under ${this.fontDirectory}`)
    }
    if (matchingFiles.length > 1) {
      throw new Error(`Font asset ${assetPath} is ambiguous: ${matchingFiles.join(', ')}`)
    }

    return matchingFiles[0]
  }

  private listFontFiles(directory: string): string[] {
    return fs.readdirSync(directory, {withFileTypes: true})
      .filter(entry => entry.isFile() && path.extname(entry.name).toLowerCase() === '.uasset')
      .map(entry => path.resolve(directory, entry.name))
  }
}