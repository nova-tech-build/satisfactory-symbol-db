
import './all.css';

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

function createBlockElement(block: UnicodeBlock): HTMLElement {
  const blockDiv = document.createElement('div');
  blockDiv.className = 'unicode-block';

  const header = document.createElement('h2');
  header.className = 'block-header';
  header.textContent = `${block.name} (${block.points.length} characters)`;
  blockDiv.appendChild(header);

  const info = document.createElement('p');
  info.className = 'block-info';
  info.textContent = `Range: ${hexFormat(block.start)} to ${hexFormat(block.end)}`;
  blockDiv.appendChild(info);

  const charGrid = document.createElement('div');
  charGrid.className = 'character-grid';

  block.points.forEach(point => {
    const charDiv = document.createElement('div');
    charDiv.className = 'character-item';
    charDiv.title = `${hexFormat(point.value)} (${point.value})`;

    const charSpan = document.createElement('span');
    charSpan.className = 'character';
    charSpan.textContent = renderCodePoint(point.value);
    charDiv.appendChild(charSpan);

    const codeSpan = document.createElement('span');
    codeSpan.className = 'code';
    codeSpan.textContent = hexFormat(point.value);
    charDiv.appendChild(codeSpan);

    charGrid.appendChild(charDiv);
  });

  blockDiv.appendChild(charGrid);
  return blockDiv;
}

async function init(): Promise<void> {
  const appContainer = document.getElementById('app');
  if (!appContainer) {
    console.error('App container not found');
    return;
  }

  try {
    const data = await fetchData();

    const header = document.createElement('div');
    header.className = 'page-header';

    const title = document.createElement('h1');
    title.textContent = 'Unicode Blocks';
    header.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'generated-info';
    subtitle.textContent = `Generated: ${new Date(data.generated).toLocaleString()}`;
    header.appendChild(subtitle);

    appContainer.appendChild(header);

    data.blocks.forEach(block => {
      const blockElement = createBlockElement(block);
      appContainer.appendChild(blockElement);
    });
  } catch (error) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    appContainer.appendChild(errorDiv);
    console.error('Error loading data:', error);
  }
}

document.addEventListener('DOMContentLoaded', init);
