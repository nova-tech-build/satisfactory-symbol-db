import fs from 'node:fs'

export type DescriptionFont = {
  name: string
  assetPath: string
  subFaceIndex: number
}

type DescriptionText = {
  defaultTypeface: DescriptionFont[]
  fallbackTypeface: DescriptionFont[]
  subtypes: {
    ranges: {lower: number, upper: number}[]
    fonts: DescriptionFont[]
  }[]
}

function asRecord(value: unknown, label: string): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`)
  }

  return value as Record<string, any>
}

function parseTypeface(value: unknown, label: string): DescriptionFont[] {
  const typeface = asRecord(value, label)
  if (!Array.isArray(typeface.Fonts) || typeface.Fonts.length === 0) {
    throw new Error(`${label}.Fonts must be a non-empty array`)
  }

  const names = new Set<string>()
  const fonts = typeface.Fonts.map((fontValue: unknown, index: number) => {
    const fontDefinition = asRecord(fontValue, `${label}.Fonts[${index}]`)
    if (typeof fontDefinition.Name !== 'string' || !fontDefinition.Name) {
      throw new Error(`${label}.Fonts[${index}].Name must be a non-empty string`)
    }
    if (names.has(fontDefinition.Name)) {
      throw new Error(`${label} contains duplicate font style ${fontDefinition.Name}`)
    }
    names.add(fontDefinition.Name)

    const font = asRecord(fontDefinition.Font, `${label}.Fonts[${index}].Font`)
    const localFont = asRecord(font.LocalFontFaceAsset, `${label}.Fonts[${index}].Font.LocalFontFaceAsset`)
    if (typeof localFont.ObjectPath !== 'string' || !localFont.ObjectPath) {
      throw new Error(`${label}.Fonts[${index}] is missing LocalFontFaceAsset.ObjectPath`)
    }
    if (!Number.isInteger(font.SubFaceIndex) || font.SubFaceIndex < 0) {
      throw new Error(`${label}.Fonts[${index}].Font.SubFaceIndex must be a non-negative integer`)
    }

    return {
      name: fontDefinition.Name,
      assetPath: localFont.ObjectPath,
      subFaceIndex: font.SubFaceIndex,
    }
  })

  if (!names.has('Regular')) {
    throw new Error(`${label} must define a Regular font for missing-style resolution`)
  }

  return fonts
}

export function readDescriptionText(descriptionPath: string): DescriptionText {
  const json = JSON.parse(fs.readFileSync(descriptionPath, 'utf8')) as unknown
  if (!Array.isArray(json)) {
    throw new Error(`${descriptionPath} must contain an asset array`)
  }

  const assets = json.map((asset, index) => asRecord(asset, `Asset[${index}]`))
    .filter(asset => asset.Name === 'DescriptionText')
  if (assets.length !== 1) {
    throw new Error(`Expected one DescriptionText asset in ${descriptionPath}; found ${assets.length}`)
  }

  const properties = asRecord(assets[0].Properties, 'DescriptionText.Properties')
  const compositeFont = asRecord(properties.CompositeFont, 'DescriptionText.Properties.CompositeFont')
  const defaultTypeface = parseTypeface(compositeFont.DefaultTypeface, 'DefaultTypeface')

  const fallbackTypeface = asRecord(compositeFont.FallbackTypeface, 'FallbackTypeface')
  const fallbackFonts = parseTypeface(fallbackTypeface.Typeface, 'FallbackTypeface.Typeface')

  if (!Array.isArray(compositeFont.SubTypefaces)) {
    throw new Error('DescriptionText.Properties.CompositeFont.SubTypefaces must be an array')
  }

  const subtypes = compositeFont.SubTypefaces.map((subtypeValue: unknown, index: number) => {
    const subtype = asRecord(subtypeValue, `SubTypefaces[${index}]`)
    if (!Array.isArray(subtype.CharacterRanges)) {
      throw new Error(`SubTypefaces[${index}].CharacterRanges must be an array`)
    }

    const ranges = subtype.CharacterRanges.map((rangeValue: unknown, rangeIndex: number) => {
      const range = asRecord(rangeValue, `SubTypefaces[${index}].CharacterRanges[${rangeIndex}]`)
      const lowerBound = asRecord(range.LowerBound, `SubTypefaces[${index}].CharacterRanges[${rangeIndex}].LowerBound`)
      const upperBound = asRecord(range.UpperBound, `SubTypefaces[${index}].CharacterRanges[${rangeIndex}].UpperBound`)

      if (lowerBound.Type !== 'ERangeBoundTypes::Inclusive' || upperBound.Type !== 'ERangeBoundTypes::Inclusive') {
        throw new Error(`SubTypefaces[${index}].CharacterRanges[${rangeIndex}] must use inclusive bounds`)
      }
      if (!Number.isInteger(lowerBound.Value) || !Number.isInteger(upperBound.Value) ||
        lowerBound.Value < 0 || upperBound.Value > 0x10FFFF || lowerBound.Value > upperBound.Value) {
        throw new Error(`SubTypefaces[${index}].CharacterRanges[${rangeIndex}] has invalid bounds`)
      }

      return {lower: lowerBound.Value, upper: upperBound.Value}
    })

    return {
      ranges,
      fonts: parseTypeface(subtype.Typeface, `SubTypefaces[${index}].Typeface`),
    }
  })

  return {defaultTypeface, fallbackTypeface: fallbackFonts, subtypes}
}