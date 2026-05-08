import {ListGenerator} from './lib/list-generator.js'
import {Block} from './lib/blocks.js'

const inputDir: string = 'input-fonts'

new ListGenerator(
  inputDir,
  'public/generated/all.json'
).run()


new ListGenerator(
  inputDir,
  'public/generated/novas-picks.json'
).withBlockFilter((block: Block) => {
  const exclude = [
    ''
  ]
  return !exclude.includes(block.name.toLowerCase())
}).run()


