import './common.css'
import './all.css'

interface CodePoint {
  value: number;
}

interface UnicodeBlock {
  name: string;
  start: number;
  end: number;
  points: CodePoint[];
}

interface AllData {
  generated: string;
  blocks: UnicodeBlock[];
}

async function fetchData(): Promise<AllData> {
  const response = await fetch('/generated/all.json');
  if (!response.ok) {
    throw new Error(`Failed to fetch all.json: ${response.statusText}`);
  }
  return response.json();
}

function renderCodePoint(codePoint: number): string {
  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return '?';
  }
}

function hexFormat(value: number): string {
  return `U+${value.toString(16).toUpperCase().padStart(4, '0')}`;
}

function getUnicodeChartUrl(blockStart: number): string {
  const blockCode = blockStart.toString(16).toUpperCase().padStart(4, '0');
  return `https://www.unicode.org/charts/PDF/U${blockCode}.pdf`;
}

function createCharacterGrid(block: UnicodeBlock): HTMLElement {
  const charGrid = document.createElement('div');
  charGrid.className = 'character-grid';
  const fragment = document.createDocumentFragment();

  block.points.forEach(point => {
    const charDiv = document.createElement('div');
    charDiv.className = 'character-item';
    charDiv.title = `${hexFormat(point.value)} (${point.value})`;
    charDiv.style.cursor = 'pointer';

    charDiv.innerHTML = `
      <span class="character">${renderCodePoint(point.value)}</span>
      <span class="code">${hexFormat(point.value)}</span>
    `;

    charDiv.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(renderCodePoint(point.value));
        charDiv.classList.add('copied');
        setTimeout(() => charDiv.classList.remove('copied'), 200);
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
      }
    });

    fragment.appendChild(charDiv);
  });

  charGrid.appendChild(fragment);
  return charGrid;
}

function createInfoElement(className: string, content: string): HTMLElement {
  const el = document.createElement('p');
  el.className = className;
  el.textContent = content;
  return el;
}

function createPageHeader(generated: string): HTMLElement {
  const header = document.createElement('div');
  header.className = 'page-header';

  const title = document.createElement('h1');
  title.textContent = 'Unicode Blocks';

  const subtitle = document.createElement('p');
  subtitle.className = 'generated-info';
  subtitle.textContent = `Generated: ${new Date(generated).toLocaleString()}`;

  header.appendChild(title);
  header.appendChild(subtitle);

  return header;
}

function createBlockElement(block: UnicodeBlock): HTMLElement {
  const blockDiv = document.createElement('div');
  blockDiv.className = 'unicode-block collapsed';

  const header = document.createElement('h2');
  header.className = 'block-header';
  header.style.cursor = 'pointer';
  header.innerHTML = `<span class="toggle-icon">▶</span> ${block.name} (${block.points.length} characters)`;
  blockDiv.appendChild(header);

  const infoContainer = document.createElement('div');
  infoContainer.className = 'block-info';

  const statsText = `Range: ${block.start}-${block.end} (${hexFormat(block.start)} to ${hexFormat(block.end)}) | Populated: ${((block.points.length / (block.end - block.start + 1)) * 100).toFixed(1)}% | `;

  const stats = createInfoElement('block-stats', statsText);

  const chartLink = document.createElement('a');
  chartLink.href = getUnicodeChartUrl(block.start);
  chartLink.target = '_blank';
  chartLink.rel = 'noopener noreferrer';
  chartLink.className = 'unicode-chart-link';
  chartLink.textContent = getUnicodeChartUrl(block.start);

  stats.appendChild(chartLink);
  infoContainer.appendChild(stats);
  blockDiv.appendChild(infoContainer);

  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'block-content';
  contentWrapper.style.display = 'none';
  blockDiv.appendChild(contentWrapper);

  let gridCreated = false;

  header.addEventListener('click', () => {
  const isCollapsed = blockDiv.classList.contains('collapsed');
  const toggleIcon = header.querySelector('.toggle-icon')!;

  if (isCollapsed) {
    toggleClasses(blockDiv, 'collapsed', 'expanded');
    toggleIcon.textContent = '▼';
    if (!gridCreated) {
      contentWrapper.appendChild(createCharacterGrid(block));
      gridCreated = true;
    }
    contentWrapper.style.display = 'block';
  } else {
    toggleClasses(blockDiv, 'expanded', 'collapsed');
    toggleIcon.textContent = '▶';
    contentWrapper.style.display = 'none';
  }
});

  return blockDiv;
}

async function init(): Promise<void> {
  const appContainer = document.getElementById('app')!;

  const data = await fetchData();

  appContainer.appendChild(createPageHeader(data.generated));

  const fragment = document.createDocumentFragment();
  data.blocks.forEach(block => {
    fragment.appendChild(createBlockElement(block));
  });

  appContainer.appendChild(fragment);
}

function toggleClasses(element: HTMLElement, remove: string, add: string): void {
  element.classList.remove(remove);
  element.classList.add(add);
}

document.addEventListener('DOMContentLoaded', init);
