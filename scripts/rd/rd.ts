import * as fs from 'node:fs'
import * as path from 'node:path'
import * as fontkit from 'fontkit'
import blocks from 'unicode-blocks'

interface CodePointRecord {
  codePoint: number
  hex: string
  char: string
  block?: string
  fonts?: string[]
}

interface CombinedOutput {
  totalCount: number
  codePoints: CodePointRecord[]
}

class UnicodeBlockManager {
  static hex(cp: number): string {
    return cp.toString(16).toUpperCase().padStart(cp <= 0xFFFF ? 4 : 6, '0')
  }

  static getBlockName(codePoint: number): string {
    for (const { start, end, name } of blocks) {
      if (codePoint >= start && codePoint <= end) {
        return name || 'Unknown Block'
      }
    }
    return 'Unknown Block'
  }
}

class FontProcessor {
  private static getFaces(fontOrCollection: any): any[] {
    return Array.isArray(fontOrCollection.fonts) ? fontOrCollection.fonts : [fontOrCollection]
  }

  processFontFace(font: any, faceIndex: number, codePointsMap: Map<number, Set<string>>): void {
    const postscriptName = font.postscriptName || `face_${faceIndex}`
    const fullName = font.fullName || postscriptName
    const codePoints = [...font.characterSet].sort((a: number, b: number) => a - b)

    codePoints.forEach((cp: number) => {
      if (!codePointsMap.has(cp)) {
        codePointsMap.set(cp, new Set<string>())
      }
      codePointsMap.get(cp)!.add(fullName)
    })

    console.log(
      `  [${faceIndex}] ${fullName} (${postscriptName}) -> ${codePoints.length} code points`
    )
  }

  processFontFile(filePath: string, codePointsMap: Map<number, Set<string>>): void {
    console.log(`\nProcessing: ${filePath}`)
    try {
      const opened = fontkit.openSync(filePath)
      const faces = FontProcessor.getFaces(opened)

      faces.forEach((font: any, i: number) => {
        this.processFontFace(font, i, codePointsMap)
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`  Error processing ${filePath}:`, errorMessage)
    }
  }
}

class CodePointManager {
  private codePointsMap = new Map<number, Set<string>>()

  addCodePoint(codePoint: number, fontName: string): void {
    if (!this.codePointsMap.has(codePoint)) {
      this.codePointsMap.set(codePoint, new Set<string>())
    }
    this.codePointsMap.get(codePoint)!.add(fontName)
  }

  getCodePointsMap(): Map<number, Set<string>> {
    return this.codePointsMap
  }

  getAllCodePoints(): number[] {
    return Array.from(this.codePointsMap.keys()).sort((a, b) => a - b)
  }

  createCodePointRecord(cp: number): CodePointRecord {
    const fonts = this.codePointsMap.get(cp) || new Set<string>()
    return {
      codePoint: cp,
      hex: `U+${UnicodeBlockManager.hex(cp)}`,
      char: String.fromCodePoint(cp),
      block: UnicodeBlockManager.getBlockName(cp),
      fonts: Array.from(fonts).sort()
    }
  }

  getAllRecords(): CodePointRecord[] {
    return this.getAllCodePoints().map(cp => this.createCodePointRecord(cp))
  }

  readCodePointsFromWiki(filePath: string): Set<number> {
    const codePointsSet = new Set<number>()
    for (const char of fs.readFileSync(filePath, 'utf8')) {
      const codePoint = char.codePointAt(0)
      if (codePoint !== undefined) {
        codePointsSet.add(codePoint)
      }
    }
    return codePointsSet
  }

  groupCodePointsByBlock(records: CodePointRecord[]): Map<string, CodePointRecord[]> {
    const blockMap = new Map<string, CodePointRecord[]>()

    records.forEach(record => {
      const block = record.block || 'Unknown Block'
      if (!blockMap.has(block)) {
        blockMap.set(block, [])
      }
      blockMap.get(block)!.push(record)
    })

    return blockMap
  }
}

class FileManager {
  static writeFile(filePath: string, content: string): void {
    fs.writeFileSync(filePath, content, 'utf8')
  }

  static formatCodePoints(records: CodePointRecord[]): string {
    return records.map(r => {
      const fontInfo = r.fonts && r.fonts.length > 0 ? `\t${r.fonts.join(', ')}` : ''
      return `${r.hex}\t${r.codePoint}\t${r.char}\t${r.block}${fontInfo}`
    }).join('\n')
  }

  static formatAllByBlock(records: CodePointRecord[], codePointManager: CodePointManager): string {
    const blockMap = codePointManager.groupCodePointsByBlock(records)
    const sortedBlocks = Array.from(blockMap.entries()).sort(
      (a, b) => a[0].localeCompare(b[0])
    )

    return sortedBlocks.map(([block, chars]) => {
      const charString = chars.map(r => r.char).join('')
      const wrapped = charString.match(/.{1,120}/g)?.join('\n') || ''
      return `${block} (${chars.length} characters):\n${wrapped}`
    }).join('\n\n')
  }

  writeCodePointsFiles(
    outDir: string,
    combinedRecords: CodePointRecord[],
    codePointManager: CodePointManager
  ): void {
    const combinedOutput: CombinedOutput = {
      totalCount: combinedRecords.length,
      codePoints: combinedRecords
    }

    FileManager.writeFile(
      path.join(outDir, 'all-codepoints.json'),
      JSON.stringify(combinedOutput, null, 2)
    )
    FileManager.writeFile(
      path.join(outDir, 'all-codepoints.txt'),
      FileManager.formatCodePoints(combinedRecords)
    )
    FileManager.writeFile(
      path.join(outDir, 'all-codepoints-by-block.txt'),
      FileManager.formatAllByBlock(combinedRecords, codePointManager)
    )
  }
}

class RdParse {
  private fontProcessor: FontProcessor
  private codePointManager: CodePointManager
  private fileManager: FileManager

  constructor() {
    this.fontProcessor = new FontProcessor()
    this.codePointManager = new CodePointManager()
    this.fileManager = new FileManager()
  }

  private logResults(combinedRecords: CodePointRecord[], outDir: string): void {
    console.log('\nResults:')
    console.log(`  Total unique code points: ${combinedRecords.length}`)
    console.log(`  Files saved to ${outDir}/`)
  }

  run(): void {
    const inputFontDir = 'input/fonts'
    const outDir = 'tmp'

    const files = fs.readdirSync(inputFontDir)
      .filter(f => /\.(ttc|ttf|ufont)$/i.test(f))
      .map(file => path.join(inputFontDir, file))

    console.log(`Found ${files.length} font file(s) in ${inputFontDir}`)

    // Process all font files
    files.forEach(filePath => {
      this.fontProcessor.processFontFile(filePath, this.codePointManager.getCodePointsMap())
    })

    // Get all records
    const combinedRecords = this.codePointManager.getAllRecords()

    // Write output files
    this.fileManager.writeCodePointsFiles(outDir, combinedRecords, this.codePointManager)

    // Log results
    this.logResults(combinedRecords, outDir)
  }
}

// Main execution
const parser = new RdParse()
parser.run()
