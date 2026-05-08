import './common.css'
import './all.css'
import {html, render} from 'lit-html'

interface Block {
  name: string;
  start: number;
  end: number;
  points: number[];
}

interface Data {
  generated: string;
  blocks: Block[];
}

async function fetchData(path: string): Promise<Data> {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`Failed to fetch all.json: ${response.statusText}`)
  }
  return response.json()
}

function toHex(value: number, padding: number = 4): string {
  return value.toString(16).toUpperCase().padStart(padding, '0')
}

function hexFormat(value: number): string {
  return `U+${toHex(value)}`
}

function altCodeFormat(codePoint: number): string {
  return `A+${codePoint.toString().padStart(4, '0')}`
}

function renderCodePoint(codePoint: number): string {
  try {
    return String.fromCodePoint(codePoint)
  } catch {
    return '?'
  }
}

function createCharacterItem(codePoint: number) {
  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(renderCodePoint(codePoint))
      const el = document.querySelector(`[data-code="${codePoint}"]`)
      if (el) {
        el.classList.add('copied')
        setTimeout(() => el.classList.remove('copied'), 200)
      }
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  return html`
    <div 
      class="character-item"
      data-code="${codePoint}"
      title="${hexFormat(codePoint)} (${codePoint})"
      @click="${handleClick}"
      style="cursor: pointer;"
    >
      <span class="character">${renderCodePoint(codePoint)}</span>
      <span class="code">${hexFormat(codePoint)}</span>
      <span class="code">${altCodeFormat(codePoint)}</span>
    </div>
  `
}

function createCharacterGrid(block: Block) {
  return html`
    <div class="character-grid">
      ${block.points.map(codePoint => createCharacterItem(codePoint))}
    </div>
  `
}

function createBlockElement(block: Block) {
  const isLargeBlock = block.points.length >= 275

  let gridCreated = false
  let isExpanded = !isLargeBlock

  const handleToggle = () => {
    isExpanded = !isExpanded

    const blockEl = document.querySelector(`[data-block="${block.start}"]`) as HTMLElement
    const contentEl = blockEl.querySelector('.block-content') as HTMLElement
    const toggleIcon = blockEl.querySelector('.toggle-icon') as HTMLElement

    blockEl.classList.toggle('expanded', isExpanded)
    blockEl.classList.toggle('collapsed', !isExpanded)

    toggleIcon.textContent = isExpanded ? '▼' : '▶'
    contentEl.style.display = isExpanded ? 'block' : 'none'

    if (isExpanded && !gridCreated) {
      render(createCharacterGrid(block), contentEl)
      gridCreated = true
    }
  }

  const populationPercent = ((block.points.length / (block.end - block.start + 1)) * 100).toFixed(1)
  const chartUrl = `https://www.unicode.org/charts/PDF/U${toHex(block.start)}.pdf`
  const defaultState = isExpanded ? 'expanded' : 'collapsed'
  const defaultIcon = isExpanded ? '▼' : '▶'
  const defaultDisplay = isExpanded ? 'block' : 'none'

  if (isExpanded) {
    gridCreated = true
  }

  return html`
    <div class="block ${defaultState} ${isLargeBlock ? 'large-block' : ''}" data-block="${block.start}">
      <h2 class="block-header" @click="${handleToggle}" style="cursor: pointer;">
        <span class="toggle-icon">${defaultIcon}</span> ${block.name} (${block.points.length} characters)
      </h2>
      <div class="block-info">
          Range: ${block.start}-${block.end} (${hexFormat(block.start)} to ${hexFormat(block.end)}) | 
          Populated: ${populationPercent}% | 
          <a 
            href="${chartUrl}" 
            target="_blank" 
            rel="noopener noreferrer" 
            class="unicode-chart-link"
          >
            ${chartUrl}
          </a>   
      </div>
      <div class="block-content" style="display: ${defaultDisplay};">
        ${isExpanded ? createCharacterGrid(block) : ''}
      </div>
    </div>
  `
}

function createPageHeader(generated: string) {
  const generatedDate = new Date(generated).toISOString()
  return html`
    <div class="page-header">
      <h1>Satisfactory Symbol Database: All Characters</h1>
      <p>Click to copy.</p>
      <p>Large blocks are in outlined in pink.</p>
      <p>Block names are defined by unicode standard.</p>
      <p class="generated-info">Generated: ${generatedDate}</p>
    </div>
  `
}

async function init(): Promise<void> {
  const appContainer = document.getElementById('app')!
  const data = await fetchData('/generated/all.json')

  const template = html`
    ${createPageHeader(data.generated)}
    ${data.blocks.map(block => createBlockElement(block))}
  `

  render(template, appContainer)
}


document.addEventListener('DOMContentLoaded', init)
