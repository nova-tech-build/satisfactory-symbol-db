import fs from 'node:fs'
import path from 'node:path'
import * as fontkit from 'fontkit'
import {DescriptionFont, readDescriptionText} from './description-text.js'

const FONT_STYLES = ['Regular', 'SemiBold', 'Bold'] as const

type FontStyle = typeof FONT_STYLES[number]

type FontFace = {
  characterSet: readonly number[]
  glyphForCodePoint(codePoint: number): {id: number} | null
}

type OpenedFont = FontFace | {fonts: readonly FontFace[]}

export type FontLoader = (fontPath: string) => OpenedFont

type LoadedFace = ReadonlySet<number>

type TypefaceFont = {
  name: string
  face: LoadedFace
}

type CharacterRange = {
  lower: number
  upper: number
}

type SubTypeface = {
  ranges: CharacterRange[]
  fonts: TypefaceFont[]
}

const supportedFontExtensions = new Set(['.ufont', '.ttf', '.ttc', '.otf'])

const openFont: FontLoader = fontPath => fontkit.openSync(fontPath) as unknown as OpenedFont

function isFontCollection(font: OpenedFont): font is {fonts: readonly FontFace[]} {
  return 'fonts' in font && Array.isArray(font.fonts)
}

function isUnicodeScalar(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 0x10FFFF &&
    (value < 0xD800 || value > 0xDFFF) && value !== 0xFFFF
}

export class CompositeFontResolver {
  private readonly fontFiles: string[]
  private readonly faceCache = new Map<string, LoadedFace>()
  private readonly defaultTypeface: TypefaceFont[]
  private readonly fallbackTypeface: TypefaceFont[]
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
      fonts: this.parseTypeface(subtype.fonts),
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
      const primaryTypeface = subtype?.fonts ?? this.defaultTypeface
      let renderable = true

      for (const style of FONT_STYLES) {
        const primary = this.getFontForStyle(primaryTypeface, style)
        const fallback = this.getFontForStyle(this.fallbackTypeface, style)
        if (!primary.face.has(value) && !fallback.face.has(value)) {
          renderable = false
          break
        }
      }

      if (renderable) {
        points.push(value)
      }
    }

    return points
  }

  private parseTypeface(fonts: DescriptionFont[]): TypefaceFont[] {
    return fonts.map(font => ({
      name: font.name,
      face: this.loadFace(font.assetPath, font.subFaceIndex),
    }))
  }

  private getFontForStyle(typeface: TypefaceFont[], style: FontStyle): TypefaceFont {
    const font = typeface.find(candidate => candidate.name === style) ??
      typeface.find(candidate => candidate.name === 'Regular')
    if (!font) {
      throw new Error(`Typeface has no font for ${style} and no Regular font`)
    }
    return font
  }

  private loadFace(assetPath: string, subFaceIndex: number): LoadedFace {
    const fontPath = this.resolveFontPath(assetPath)
    const cacheKey = `${fontPath.toLowerCase()}#${subFaceIndex}`
    const cached = this.faceCache.get(cacheKey)
    if (cached) {
      return cached
    }

    let opened: OpenedFont
    try {
      opened = this.fontLoader(fontPath)
    } catch (error) {
      throw new Error(`Unable to open font asset ${assetPath} at ${fontPath}: ${String(error)}`)
    }

    const face = isFontCollection(opened)
      ? opened.fonts[subFaceIndex]
      : subFaceIndex === 0 ? opened : undefined
    if (!face) {
      throw new Error(`Font asset ${assetPath} at ${fontPath} has no face at index ${subFaceIndex}`)
    }
    if (!Array.isArray(face.characterSet) || typeof face.glyphForCodePoint !== 'function') {
      throw new Error(`Font asset ${assetPath} at ${fontPath} has no readable cmap`)
    }

    const glyphs = new Set<number>()
    for (const value of face.characterSet) {
      if (!Number.isInteger(value)) {
        continue
      }
      const glyph = face.glyphForCodePoint(value)
      if (glyph && Number.isInteger(glyph.id) && glyph.id !== 0) {
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

    const matchingFiles = this.fontFiles.filter(file =>
      path.basename(file, path.extname(file)).toLowerCase() === objectName.toLowerCase(),
    )
    if (matchingFiles.length === 0) {
      throw new Error(`Font asset ${assetPath} was not found under ${this.fontDirectory}`)
    }
    if (matchingFiles.length > 1) {
      throw new Error(`Font asset ${assetPath} is ambiguous: ${matchingFiles.join(', ')}`)
    }

    return matchingFiles[0]
  }

  private listFontFiles(directory: string): string[] {
    if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
      throw new Error(`Font directory does not exist: ${directory}`)
    }

    const files: string[] = []
    const visit = (currentDirectory: string): void => {
      for (const entry of fs.readdirSync(currentDirectory, {withFileTypes: true})) {
        const entryPath = path.resolve(currentDirectory, entry.name)
        if (entry.isDirectory()) {
          visit(entryPath)
        } else if (entry.isFile() && supportedFontExtensions.has(path.extname(entry.name).toLowerCase())) {
          files.push(entryPath)
        }
      }
    }
    visit(path.resolve(directory))
    return files
  }
}