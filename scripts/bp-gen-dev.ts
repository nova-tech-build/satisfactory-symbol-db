import {BpGenerator} from '../src/lib/bp-generator.js'
import {Blueprint, Parser} from '@etothepii/satisfactory-file-parser'
import fs from 'fs'
import {ListGenerator} from './lib/list-generator.js'


function writeBlueprintFiles(path: string, blueprint: Blueprint): void {
  let fileHeader: Uint8Array = new Uint8Array(0)
  const fileBodyChunks: Uint8Array[] = []

  const summary = Parser.WriteBlueprintFiles(blueprint,
    header => {
      fileHeader = header
    }, chunk => {
      fileBodyChunks.push(chunk)
    })

  let p = `${path}.sbp`
  fs.writeFileSync(p, new Uint8Array(Buffer.concat([fileHeader, ...fileBodyChunks])))
  console.log(`Wrote ${p}`)

  p = `${path}.sbpcfg`
  fs.writeFileSync(p, new Uint8Array(summary.configFileBinary))
  console.log(`Wrote ${p}`)
}


const path = 'public/bps/4m-label'

const tpl = Parser.ParseBlueprintFiles(
  '4m-label',
  new Uint8Array(fs.readFileSync(path + '.sbp')).buffer,
  new Uint8Array(fs.readFileSync(path + '.sbpcfg')).buffer,
)

const blocks = new ListGenerator('input/fonts').generateBlocks()

const points = blocks
  .map(block => block.pointsAsNumbers)
  .flatMap(x => x)

  //.sort(() => Math.random() - 0.5)
  //.slice(0, 10000)

console.log(points);

const gen = new BpGenerator(tpl)

let i = 0

for (const bp of gen.blueprints(points)) {
  writeBlueprintFiles(`tmp/bp-gen-dev-${i++}`, bp)
}
