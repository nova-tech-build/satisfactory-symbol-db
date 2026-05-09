import {type Blueprint, Parser, type SaveEntity} from '@etothepii/satisfactory-file-parser'
import {Sign} from '../../scripts/lib/buildable.ts'

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

export class BpGenerator {
  private readonly SIGN_HEIGHT = 50
  private readonly SIGN_WIDTH = 400
  private readonly SIGNS_PER_BP = 100
  private readonly SIGNS_PER_BP_ROW = 4

  public constructor(private readonly templateBlueprint: Blueprint) {
  }

  static async create(): Promise<BpGenerator> {
    return new BpGenerator(await fetchTemplateBlueprint())
  }

  public* blueprints(points: number[]): Generator<Blueprint, void, unknown> {

    let blueprint: Blueprint | null = null
    let keySign: Sign | null = null
    let index: number = 0

    const rows = this.pointsToRows(points)

    while (rows.length > 0) {
      const row1 = rows.shift() || []
      const row2 = rows.shift() || []

      if (!blueprint || !keySign) {
        blueprint = JSON.parse(JSON.stringify(this.templateBlueprint)) as Blueprint
        keySign = new Sign(blueprint.objects[0] as SaveEntity)
        index = 0
      }

      const z = Math.floor(index / this.SIGNS_PER_BP_ROW)

      const sign = keySign
        .withShiftZ(this.SIGN_HEIGHT * z)
        .withShiftX(this.SIGN_WIDTH * (index % this.SIGNS_PER_BP_ROW))
        .withText(
          row1.map(p => String.fromCodePoint(p)).join('') + '\n' +
          row2.map(p => String.fromCodePoint(p)).join(''),
        )

      blueprint.objects.push(sign.entity)

      if (blueprint.objects.length > this.SIGNS_PER_BP) {
        yield blueprint
        blueprint = keySign = null
      }

      index++
    }

    if (blueprint) {
      yield blueprint
    }
  }

  pointsToRows(points: number[]): number[][] {
    // trivial chunking for now
    const result: number[][] = []
    const maxPerRow = 18

    for (let i = 0; i < points.length; i += maxPerRow) {
      result.push(points.slice(i, i + maxPerRow))
    }
    return result
  }

}
