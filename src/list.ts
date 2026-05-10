import './common.css'
import './list.css'
import {html, render} from 'lit-html'
import type {CharacterList, Subset} from '../scripts/lib/list-generator.ts'
import {BpGenerator, BpZip} from './lib/bp-generator.ts'

async function fetchData(path: string): Promise<CharacterList> {
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

function createCharacterGrid(subset: Subset) {
  return html`
    <div class="character-grid">
      ${subset.points.map(codePoint => createCharacterItem(codePoint))}
    </div>
  `
}

function createSubsetElement(subset: Subset) {
  const block = subset.block
  const isLargeSubset = subset.points.length >= 275

  let gridCreated = false
  let isExpanded = !isLargeSubset

  const handleToggle = () => {
    isExpanded = !isExpanded

    const subsetEl = document.querySelector(`[data-subset="${subset.name}"]`) as HTMLElement
    const contentEl = subsetEl.querySelector('.subset-content') as HTMLElement
    const toggleIcon = subsetEl.querySelector('.toggle-icon') as HTMLElement

    subsetEl.classList.toggle('expanded', isExpanded)
    subsetEl.classList.toggle('collapsed', !isExpanded)

    toggleIcon.textContent = isExpanded ? '▼' : '▶'
    contentEl.style.display = isExpanded ? 'block' : 'none'

    if (isExpanded && !gridCreated) {
      render(createCharacterGrid(subset), contentEl)
      gridCreated = true
    }
  }

  const handleDownloadBlueprints = async (event: Event) => {
    const button = event.target as HTMLButtonElement
    const originalText = button.textContent
    button.disabled = true
    button.innerHTML = '<span class="progress-icon">⏳</span>'

    try {
      const generator = await BpGenerator.create()
      const zip = new BpZip()
      let bpIndex = 1

      for (const blueprint of generator.blueprints(subset.points)) {
        zip.add(`${subset.name}-${String(bpIndex).padStart(2, '0')}`, blueprint)
        bpIndex++
      }

      const buffer = await zip.generateAsyncBlob()

      const url = URL.createObjectURL(buffer)
      const link = document.createElement('a')
      link.href = url
      link.download = `${subset.name}-blueprints.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to generate blueprints:', err)
      button.textContent = 'Error'
    } finally {
      button.textContent = originalText
      button.disabled = false
    }
  }

  const defaultState = isExpanded ? 'expanded' : 'collapsed'
  const defaultIcon = isExpanded ? '▼' : '▶'
  const defaultDisplay = isExpanded ? 'block' : 'none'

  if (isExpanded) {
    gridCreated = true
  }

  return html`
    <div class="subset ${defaultState} ${isLargeSubset ? 'large-subset' : ''}" data-subset="${subset.name}">
      <div class="subset-header-container">
        <h2 class="subset-header" @click="${handleToggle}" style="cursor: pointer;">
          <span class="toggle-icon">${defaultIcon}</span> ${subset.name} (${subset.points.length} characters)
        </h2>
        <button class="download-blueprint-btn" @click="${handleDownloadBlueprints}">
          Download Blueprint
        </button>
      </div>
      ${block ? html`
        <div class="block-info">
            Range: ${block.start}-${block.end} (${hexFormat(block.start)} to ${hexFormat(block.end)}) | 
            Populated: ${(((subset.points.length / (block.end - block.start + 1)) * 100).toFixed(1))}% | 
            <em>${block.name}</em>:
            <a 
              href="https://www.unicode.org/charts/PDF/U${toHex(block.start)}.pdf" 
              target="_blank" 
              rel="noopener noreferrer" 
              class="unicode-chart-link"
            >
              https://www.unicode.org/charts/PDF/U${toHex(block.start)}.pdf
            </a>
        </div>
      ` : ''}
      <div class="subset-content" style="display: ${defaultDisplay};">
        ${isExpanded ? createCharacterGrid(subset) : ''}
      </div>
    </div>
  `
}

function createPageHeader(generated: string, label: string, description: string) {
  return html`
    <div class="page-header">
      <h1>Satisfactory Symbol DB: ${label}</h1>
      <p><em>${description}</em></p>
      <p><a href="../">Back to all lists</a></p>
      <p>Click to copy.</p>
      <p>Large blocks are in outlined in pink.</p>
      <p class="generated-info">Generated: ${new Date(generated).toISOString()}</p>
    </div>
  `
}

export async function createList(name: string, label: string, description: string): Promise<void> {
  const appContainer = document.getElementById('app')!
  const data = await fetchData(`${import.meta.env.BASE_URL}/generated/${name}.json`)

  const template = html`
    ${createPageHeader(data.generatedAt, label, description)}
    ${data.subsets.map(subset => createSubsetElement(subset))}
  `

  render(template, appContainer)
}


const n = new URLSearchParams(location.search).get('name')

const lists: Record<string, [string, string, string]> = {
  nova: ['nova', 'Nova\'s Picks', 'Based on feels. Mostly for testing purposes.'],
}

const [name, label, description] = lists[n ?? ''] ?? ['all', 'All Characters', 'All characters in the database.']

document.addEventListener('DOMContentLoaded', () => {
  createList(name, label, description)
    .catch(console.error)
})
