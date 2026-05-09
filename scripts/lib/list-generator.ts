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
  private blockFilter: (block: Block) => boolean = () => true;
  private blockSort: (a: Block, b: Block) => number = (a, b) => a.start - b.start;

  constructor(
    private readonly inputDir: string,
    private readonly outputPath: string,
  ) {
  }

  withBlockFilter(filter: (block: Block) => boolean): ListGenerator {
    const me = this.clone()
    me.blockFilter = filter
    return me
  }

  withBlockSort(sort: (a: Block, b: Block) => number) {
    const me = this.clone()
    me.blockSort = sort
    return me
  }

  private clone(): ListGenerator {
    const me =  new ListGenerator(this.inputDir, this.outputPath)
    me.blockFilter = this.blockFilter
    me.blockSort = this.blockSort
    return me
  }

  run(): void {
    const points =
      this.getFontFiles()
      .map(file => Points.fromTtFile(file))
      .reduce(
        (all, points) => all.merge(points),
        new Points([]),
      )
    const blocks = Blocks.fromPoints(points.unique())
      .filter(this.blockFilter)
      .sort(this.blockSort)

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
      `---\nWriting ${output.subsets.length} blocks to ${this.outputPath}\n---`
    )

    blocks.forEach((block: Block) => {
      console.log(`${block.name} (${block.start} - ${block.end}) points: ${block.pointsAsNumbers.length}`)
    })

    fs.writeFileSync(this.outputPath, JSON.stringify(output))
  }

  private getFontFiles(): string[] {
    return fs.readdirSync(this.inputDir)
      .filter(file => /\.(ttc|ttf|ufont)$/i.test(file))
      .map(file => path.join(this.inputDir, file))
  }
}
