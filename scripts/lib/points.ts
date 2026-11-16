import {CompositeFontResolver} from './composite-font.js'

export class Point {
  constructor(public readonly value: number) {
  }
}

export class Points {

  private readonly points: Point[]

  constructor(codePoints: Point[]) {
    this.points = codePoints.sort((a, b) => a.value - b.value)
  }

  static fromCompositeFont(path: string, fontDirectory = 'input/fonts'): Points {
    const resolver = new CompositeFontResolver(path, fontDirectory)
    return new Points(resolver.renderablePoints().map(point => new Point(point)))
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
