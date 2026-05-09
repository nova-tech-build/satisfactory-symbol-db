import {type Blueprint, Parser} from '@etothepii/satisfactory-file-parser'

function estimateCharacterWidth(codePoint: number, fontSize: number): number {
  // CJK Unified Ideographs and variants
  const isWide =
    (codePoint >= 0x4E00 && codePoint <= 0x9FFF) ||
    (codePoint >= 0x3400 && codePoint <= 0x4DBF) ||
    (codePoint >= 0xF900 && codePoint <= 0xFAFF)

  const isNarrow =
    (codePoint >= 0x2000 && codePoint <= 0x206F) || // General Punctuation
    (codePoint >= 0x3000 && codePoint <= 0x303F) // CJK Symbols

  let widthRatio = 0.6

  if (isWide) {
    widthRatio = 0.9
  } else if (isNarrow) {
    widthRatio = 0.3
  }

  return fontSize * widthRatio
}

interface CharacterMetrics {
  codePoint: number
  char: string
  estimatedWidth: number
}

interface SignData {
  signIndex: number
  blueprintIndex: number
  characters: CharacterMetrics[]
  totalWidth: number
}

interface BlueprintData {
  blueprintIndex: number
  signs: SignData[]
  signCount: number
}

interface PrecomputedLayout {
  blueprints: BlueprintData[]
  totalBlueprints: number
  totalSigns: number
  totalCharacters: number
}

let blueprintCache: Blueprint | null = null

async function fetchTemplateBlueprint(): Promise<Blueprint> {
  if (!blueprintCache) {
    let response: Response

    response = await fetch('/public/bps/4m-label.sbp')

    if (!response.ok) {
      throw new Error(`Failed to fetch 4m-label.sbp: ${response.statusText}`)
    }
    const sbpBuffer = await response.arrayBuffer()

    response = await fetch('/public/bps/4m-label.sbpcfg')
    if (!response.ok) {
      throw new Error(`Failed to fetch 4m-label.sbp: ${response.statusText}`)
    }

    const sbpcfgBuffer = await response.arrayBuffer()

    blueprintCache = Parser.ParseBlueprintFiles(
      '4m-label',
      sbpBuffer,
      sbpcfgBuffer,
    )
  }

  return blueprintCache
}

export class BpGenerator
{
  private readonly SIGN_SIZE = 50 // Units in Satisfactory
  private readonly MAX_SIGNS_PER_BP = 100 // Limit to prevent blueprint from becoming too large
  private readonly SIGN_WIDTH = 400 // Assume 400 units of displayable width
  private readonly FONT_SIZE = 20 // Default font size in units
  private readonly PADDING = 10 // Padding around text in units

  private precomputedLayout: PrecomputedLayout | null = null

  private constructor(private readonly templateBlueprint: Blueprint) {
  }

  static async create(): Promise<BpGenerator> {
    return new BpGenerator(await fetchTemplateBlueprint())
  }

  /**
   * Calculate how many characters can fit on a single sign
   */
  private calculateCharsPerSign(codePoints: number[]): number {
    const availableWidth = this.SIGN_WIDTH - (2 * this.PADDING)
    let totalWidth = 0
    let charCount = 0

    for (const codePoint of codePoints) {
      const charWidth = estimateCharacterWidth(codePoint, this.FONT_SIZE)
      if (totalWidth + charWidth > availableWidth) {
        break
      }
      totalWidth += charWidth
      charCount++
    }

    return Math.max(1, charCount) // At least 1 character per sign
  }

  /**
   * Precompute the layout: blueprints → signs → characters
   */
  private precomputeLayout(codePoints: number[]): PrecomputedLayout {
    const blueprints: BlueprintData[] = []
    let blueprintIndex = 0
    let signIndex = 0
    let codePointIndex = 0

    while (codePointIndex < codePoints.length) {
      const blueprintData: BlueprintData = {
        blueprintIndex,
        signs: [],
        signCount: 0,
      }

      // Fill this blueprint with signs
      for (let i = 0; i < this.MAX_SIGNS_PER_BP && codePointIndex < codePoints.length; i++) {
        const signData: SignData = {
          signIndex,
          blueprintIndex,
          characters: [],
          totalWidth: 0,
        }

        let signWidth = 0

        // Fill this sign with characters
        while (codePointIndex < codePoints.length) {
          const codePoint = codePoints[codePointIndex]
          const charWidth = estimateCharacterWidth(codePoint, this.FONT_SIZE)

          if (signWidth + charWidth > this.SIGN_WIDTH - (2 * this.PADDING)) {
            break // Sign is full
          }

          signData.characters.push({
            codePoint,
            char: String.fromCodePoint(codePoint),
            estimatedWidth: charWidth,
          })

          signWidth += charWidth
          signData.totalWidth = signWidth
          codePointIndex++
        }

        blueprintData.signs.push(signData)
        signIndex++
        blueprintData.signCount++
      }

      blueprints.push(blueprintData)
      blueprintIndex++
    }

    return {
      blueprints,
      totalBlueprints: blueprintIndex,
      totalSigns: signIndex,
      totalCharacters: codePoints.length,
    }
  }

  /**
   * Get the precomputed layout data
   */
  getPrecomputedLayout(): PrecomputedLayout | null {
    return this.precomputedLayout
  }

  generate(codePoints: number[]): Blueprint[] {
    // Precompute the layout
    this.precomputedLayout = this.precomputeLayout(codePoints)
    const layout = this.precomputedLayout

    const blueprints: Blueprint[] = []

    for (const blueprintData of layout.blueprints) {
      const bp = this.cloneBlueprint(this.templateBlueprint)
      const templateSign = bp.objects[0]

      for (const signData of blueprintData.signs) {
        const positionInBp = signData.signIndex - blueprintData.blueprintIndex * this.MAX_SIGNS_PER_BP
        const currentX = -(positionInBp * this.SIGN_SIZE)

        // Combine all characters for this sign
        const signText = signData.characters.map(c => c.char).join('')
        const sign = this.createSignEntity(templateSign, 0, currentX, 0, 0, signText)
        bp.objects.push(sign)
      }

      blueprints.push(bp)
    }

    return blueprints
  }

  /**
   * Create a sign entity with the specified text at the given position
   */
  private createSignEntity(
    templateSign: any,
    codePoint: number,
    posX: number,
    posY: number,
    posZ: number,
    overrideText?: string,
  ): any {
    const sign = JSON.parse(JSON.stringify(templateSign))
    const text = overrideText || String.fromCodePoint(codePoint)

    sign.transform.translation.x = posX
    sign.transform.translation.y = posY
    sign.transform.translation.z = posZ

    // Set sign text
    // @ts-ignore
    if (sign.properties?.mPrefabTextElementSaveData?.values?.[0]?.properties?.Text) {
      // @ts-ignore
      sign.properties.mPrefabTextElementSaveData.values[0].properties.Text.value = text
    }

    // Update instance name to make it unique
    sign.instanceName += `_${Date.now()}_${Math.random()}`

    return sign
  }

  private cloneBlueprint(template: Blueprint): Blueprint {
    const cloned = JSON.parse(JSON.stringify(template))
    return cloned
  }
}
