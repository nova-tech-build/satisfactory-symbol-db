import fs from 'node:fs'
import path from 'node:path'
import {Block, Blocks} from './blocks.js'
import {Point, Points} from './points.js'

export type Subset = {
  name: string
  block?: {
    name: string
    start: number
    end: number
  }
  points: number[]
}

export type CharacterList = {
  generatedAt: string
  subsets: Subset[]
}

export class ListGenerator {
  constructor(
    private readonly inputDir: string,
  ) {
  }

  withBlockFilter(filter: (block: Block) => boolean): ListGenerator {
    const me = this.clone()
    me.blockFilter = filter
    return me
  }

  withBlockSort(sort: (a: Block, b: Block) => number): ListGenerator {
    const me = this.clone()
    me.blockSort = sort
    return me
  }

  withBlockMap(map: (block: Block) => Block): ListGenerator {
    const me = this.clone()
    me.blockMap = map
    return me
  }

  generateBlocks(): Blocks {
    const points =
      this.getFontFiles()
        .map(file => Points.fromTtFile(file))
        .reduce(
          (all, points) => all.merge(points),
          new Points([]),
        ).merge(Points.fromCompositeFontSubtypes('input/assets/DescriptionText.json'))

    return Blocks.fromPoints(points.unique())
      .map(this.blockMap)
      .filter(this.blockFilter)
      .sort(this.blockSort)
  }

  output(outputPath: string): ListGenerator {
    const blocks = this.generateBlocks().unwrap()

    const output: CharacterList = {
      generatedAt: new Date().toISOString(),
      subsets: blocks.map((block: Block) => ({
        name: block.name,
        block: {
          name: block.name,
          start: block.start,
          end: block.end,
        },
        points: block.map((point: Point) => point.value),
      })),
    }

    console.log(
      `---\nWriting ${output.subsets.length} blocks to ${outputPath}\n---`,
    )

    let total = 0

    blocks.forEach((block: Block) => {
      total += block.pointsAsNumbers.length
      console.log(`${block.name} (${block.start} - ${block.end}) points: ${block.pointsAsNumbers.length}`)
    })
    console.log(`Total points: ${total}`)

    fs.writeFileSync(outputPath, JSON.stringify(output))

    return this
  }

  outputAsText(outputPath: string): ListGenerator {
    const blocks = this.generateBlocks().unwrap()
    const output = blocks.map((block: Block) => {
      const chars = block.map((point: Point) => String.fromCodePoint(point.value)).join('')
      const truncated = chars.length > 255 ? ' (truncated)' : ''
      const truncChars = chars.substring(0, 255)
      return `${block.name}${truncated} (${chars.length})\n${truncChars}\n\n`
    })

    fs.writeFileSync(outputPath, output.join('\n'))

    return this
  }

  static createExplicitSort(explicit: string[]): (a: Block, b: Block) => number {
    return (a: Block, b: Block) => {
      const ai = explicit.indexOf(a.name)
      const bi = explicit.indexOf(b.name)
      return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi) || a.start - b.start
    }
  }

  static createExplicitRemoveFilter(explicit: string[]): (block: Block) => boolean {
    return (block: Block) => !explicit.includes(block.name)
  }

  private blockFilter: (block: Block) => boolean = () => true

  private blockSort: (a: Block, b: Block) => number = (a, b) => a.start - b.start

  private blockMap: (block: Block) => Block = (block: Block) => block

  private clone(): ListGenerator {
    const me = new ListGenerator(this.inputDir)
    me.blockFilter = this.blockFilter
    me.blockSort = this.blockSort
    me.blockMap = this.blockMap
    return me
  }

  private getFontFiles(): string[] {
    return fs.readdirSync(this.inputDir)
      .filter(file => /\.(ttc|ttf|ufont)$/i.test(file))
      .map(file => path.join(this.inputDir, file))
  }
}
