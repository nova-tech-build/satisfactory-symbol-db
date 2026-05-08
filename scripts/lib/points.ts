import fs from 'node:fs'
import path from 'node:path'
import {TtFile} from './tt-file.js'
import {Font} from 'fontkit'

export class Point {
  constructor(public readonly value: number) {
  }
}

export class Points {

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
