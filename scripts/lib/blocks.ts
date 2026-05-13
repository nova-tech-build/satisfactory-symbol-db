import blocks, {UnicodeBlock} from 'unicode-blocks'
import {Point, Points} from './points.js'

export class Block {
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

  public map<T>(callback: (p: Point) => T): T[] {
    return this.points.map(callback)
  }

  public add(point: Point): void {

    if (point.value < this.block.start || point.value > this.block.end) {
      throw new Error(`Point ${point.value} is not in block ${this.block.name}`)
    }

    this.points.push(point)
  }

  public removePointAsNumber(p: number): void {
    const i = this.points.findIndex((point: Point) => point.value === p)

    if(i !== -1) {
      this.points.splice(i, 1)
    }
  }
}

export class Blocks {
  constructor(private readonly blocks: Block[]) {
  }

  public unwrap(): Block[] {
    return this.blocks
  }

  public map(callback: (b: Block) => Block): Blocks {
    return new Blocks(this.blocks.map(callback))
  }

  public filter(callback: (b: Block) => boolean): Blocks {
    return new Blocks(this.blocks.filter(callback))
  }

  public sort(callback: (a: Block, b: Block) => number): Blocks {
    return new Blocks([...this.blocks].sort(callback))
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
