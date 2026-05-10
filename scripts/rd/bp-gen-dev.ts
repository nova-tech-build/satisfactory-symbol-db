import {BpGenerator, BpZip} from '../../src/lib/bp-generator.js'
import {Blueprint, Parser} from '@etothepii/satisfactory-file-parser'
import fs from 'fs'
import {ListGenerator} from '../lib/list-generator.js'


function writeBlueprintFiles(path: string, blueprint: Blueprint): void {
  let fileHeader: Uint8Array = new Uint8Array(0)
  const fileBodyChunks: Uint8Array[] = []

  const summary = Parser.WriteBlueprintFiles(blueprint,
    header => {
      fileHeader = header
    }, chunk => {
      fileBodyChunks.push(chunk)
    })

  console.log(summary);

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

console.log(points);

const gen = new BpGenerator(tpl)



const zip = new BpZip()
let i = 0
for (const bp of gen.blueprints(points)) {
  i++
  zip.add(`bp-gen-dev-${String(i).padStart(2, '0')}`, bp)

}

const buffer = await zip.jsZip.generateAsync({
  type: 'nodebuffer'
})
fs.writeFileSync('tmp/bp.zip', buffer)
