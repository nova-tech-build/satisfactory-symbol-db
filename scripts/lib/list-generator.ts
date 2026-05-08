import fs from 'node:fs'
import path from 'node:path'
import {Block, Blocks} from './blocks.js'
import {Point, Points} from './points.js'


export type GeneratedList = {
  generated: string
  blocks: {
    name: string
    start: number
    end: number
    points: number[]
  }[]
}

export class ListGenerator {
  constructor(
    private readonly inputDir: string,
    private readonly outputPath: string,
  ) {}

  run(): void {
    const points = this.loadAllPoints()
    const uniquePoints = points.unique()
    const blocks = Blocks.fromPoints(uniquePoints)

    this.logBlocks(blocks)
    this.writeOutput(blocks)
  }

  private loadAllPoints(): Points {
    return this.getFontFiles()
      .map(file => Points.fromTtFile(file))
      .reduce(
        (all, points) => all.merge(points),
        new Points([]),
      )
  }

  private getFontFiles(): string[] {
    return fs.readdirSync(this.inputDir)
      .filter(file => /\.(ttc|ttf|ufont)$/i.test(file))
      .map(file => path.join(this.inputDir, file))
  }

  private logBlocks(blocks: Blocks): void {
    blocks.forEach((block: Block) => {
      console.log(
        block.name,
        block.start,
        block.end,
        block.pointsAsNumbers.length,
      )
    })
  }

  private writeOutput(blocks: Blocks): void {
    const output: GeneratedList = {
      generated: new Date().toISOString(),
      blocks: blocks.map((block: Block) => ({
        name: block.name,
        start: block.start,
        end: block.end,
        points: block.map((point: Point) => point.value),
      })),
    }

    fs.writeFileSync(this.outputPath, JSON.stringify(output))
  }
}
