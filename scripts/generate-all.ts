import fs from 'node:fs'
import path from 'node:path'
import {Block, Blocks} from './lib/blocks.js'
import {Point, Points} from './lib/points.js'


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
