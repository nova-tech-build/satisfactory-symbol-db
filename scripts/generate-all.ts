import * as fontkit from 'fontkit'
import {Font} from 'fontkit'
import fs from 'node:fs'
import path from 'node:path'
import blocks, {UnicodeBlock} from 'unicode-blocks'

class TtFile {

  public readonly fonts: Font[]

  constructor(public readonly path: string) {

    const opened = fontkit.openSync(path)
    this.fonts = ('fonts' in opened) ? opened.fonts : [opened]
  }
}

class Point {
  constructor(public readonly value: number) {
  }
}

class Points {

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

class Block {
  private readonly points: Point[] = []

  constructor(private readonly block: UnicodeBlock) {

  }

  public get name(): string {
    return this.block.name
  }

  public get start(): number {
    return this.block.start
  }

  public get end(): number {
    return this.block.end
  }

  public get pointsAsNumbers(): number[] {
    return this.points.map(p => p.value)
  }

  public forEach(callback: (p: Point) => void): void {
    this.points.forEach(callback)
  }

  public add(point: Point): void {

    if (point.value < this.block.start || point.value > this.block.end) {
      throw new Error(`Point ${point.value} is not in block ${this.block.name}`)
    }

    this.points.push(point)
  }
}

class Blocks {
  private readonly blocks: Block[]

  constructor(blocks: Block[]) {
    this.blocks = blocks.sort((a, b) => a.start - b.start)
  }

  public static fromPoints(points: Points): Blocks {
    const blocks = new Map<number, Block>()

    points.forEach((p: Point) => {
      const uBlock = Blocks.findUnicodeBlock(p.value)

      if (uBlock === null) {
        throw new Error(`No block found for code point ${p.value}`)
      }

      const start = uBlock.start
      if (!blocks.has(start)) {
        blocks.set(start, new Block(uBlock))
      }

      blocks.get(start)!.add(p)
    })

    return new Blocks(Array.from(blocks.values()))
  }

  public static findUnicodeBlock(value: number): UnicodeBlock | null {
    return blocks.find(b =>
      value >= b.start &&
      value <= b.end,
    ) ?? null
  }

  public forEach(callback: (b: Block) => void): void {
    this.blocks.forEach(callback)
  }
}

function main(inputDir: string, outputPath: string) {

  const files = fs.readdirSync(inputDir)
    .filter(f => /\.(ttc|ttf|ufont)$/i.test(f))
    .map(file => path.join(inputDir, file))

  let all: Points = new Points([])
  files.forEach(file => {
    const points = Points.fromTtFile(file)
    all = all.merge(points)
  })

  const uni = all.unique()
  const blocks = Blocks.fromPoints(uni)

  blocks.forEach((b: Block) => {
    console.log(b.name, b.start, b.end, b.pointsAsNumbers.length)
  })

  const output: any = {
    generated: new Date().toISOString(),
    blocks: [],
  }

  blocks.forEach((block: Block) => {
    const points: any[] = []
    block.forEach((point: Point) => {
      points.push(point.value)
    })

    output.blocks.push({
      name: block.name,
      start: block.start,
      end: block.end,
      points: points,
    })
  })

  fs.writeFileSync(outputPath, JSON.stringify(output))
}

main('input-fonts', 'public/generated/all.json')
