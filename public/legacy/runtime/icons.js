const SVG_NS = 'http://www.w3.org/2000/svg';

const iconNodes = {
  'alert-triangle': [['path',{d:'M8 3 1.8 14h12.4z'}],['path',{d:'M8 7v3M8 12.5h.01'}]],
  'arrow-down': [['path',{d:'M9 3v12M4 10l5 5 5-5'}]],
  'arrow-left': [['path',{d:'M15 9H3M8 4 3 9l5 5'}]],
  'arrow-right': [['path',{d:'M3 9h12M10 4l5 5-5 5'}]],
  'arrow-up': [['path',{d:'M9 15V3M4 8l5-5 5 5'}]],
  'arrow-up-right': [['path',{d:'M5 13 13 5M7 5h6v6'}]],
  'badge-check': [['path',{d:'M7.5 4.3 9 2l1.5 2.3 2.7-.3.3 2.7L16 8l-2.5 1.3-.3 2.7-2.7-.3L9 14l-1.5-2.3-2.7.3-.3-2.7L2 8l2.5-1.3.3-2.7z'}],['path',{d:'m6.5 8 1.5 1.5 3-3'}]],
  bug: [['path',{d:'M8 2v2M12 2v2M5 7H2M14 7h3M5 11H2M14 11h3'}],['rect',{x:'5',y:'4',width:'9',height:'11',rx:'4'}]],
  check: [['path',{d:'m3 9 3 3 7-7'}]],
  'chevron-down': [['path',{d:'m4 7 5 5 5-5'}]],
  close: [['path',{d:'m4 4 10 10M14 4 4 14'}]],
  idea: [['path',{d:'M6.5 13h5M7 16h4'}],['path',{d:'M5 9a4 4 0 1 1 8 0c0 2-2 2.5-2 4H7c0-1.5-2-2-2-4z'}]],
  flame: [['path',{d:'M9 16c3 0 5-2 5-5 0-2-1-4-3-6 0 2-1 3-2 4 0-3-1-5-2-6-1 3-3 5-3 8 0 3 2 5 5 5z'}]],
  link: [['path',{d:'M7 11 5.5 12.5a3 3 0 0 1-4-4L4 6a3 3 0 0 1 4 0M11 7l1.5-1.5a3 3 0 0 1 4 4L14 12a3 3 0 0 1-4 0M6 9h6'}]],
  plus: [['path',{d:'M9 3v12M3 9h12'}]],
  question: [['circle',{cx:'9',cy:'9',r:'7'}],['path',{d:'M7 7a2 2 0 1 1 3 1.7c-.8.5-1 .8-1 1.3M9 13h.01'}]],
  retry: [['path',{d:'M3 6V2M3 6h4M3.5 6a6 6 0 1 1-.2 6'}]],
  theme: [['path',{d:'M9 2a7 7 0 1 0 0 14z'}]],
  'thumbs-down': [['path',{d:'M6 3v9H3V3zM6 11h5l-1 4 1 1c2-2 3-5 3-8V5c0-1-1-2-2-2H6'}]],
  'thumbs-up': [['path',{d:'M6 15V6H3v9zM6 7h5l-1-4 1-1c2 2 3 5 3 8v3c0 1-1 2-2 2H6'}]],
  trash: [['path',{d:'M3 5h12M7 5V3h4v2M5 5l1 11h6l1-11M8 8v5M11 8v5'}]],
  zap: [['path',{d:'m10 2-6 9h5l-1 5 6-9H9z'}]],
};

const glyphIcons = new Map([
  ['×', 'close'], ['✕', 'close'], ['✓', 'check'], ['✔', 'check'], ['!', 'alert-triangle'], ['?', 'question'],
  ['→', 'arrow-right'], ['←', 'arrow-left'], ['↓', 'arrow-down'], ['↑', 'arrow-up'], ['↗', 'arrow-up-right'],
  ['⌄', 'chevron-down'], ['◐', 'theme'], ['◆', 'flame'], ['⚡', 'zap'], ['↻', 'retry'], ['↺', 'retry'], ['+', 'plus'], ['⌁', 'link'],
]);

const productIconSelector = [
  'button', 'a', '.streak', '.concept-icon', '.status-icon', '.complete-button span',
  '.inspector-empty > span', '.validation-summary [aria-hidden="true"]', '[role="status"] > span',
  '.pipeline-validation span', '.monolith-validation span', '.micro-validation span', '.final-design-validation > div > span',
].join(',');

function replaceGlyphText(textNode) {
  const value = textNode.nodeValue || '';
  const match = value.match(/^\s*([×✕✓✔!?→←↓↑↗⌄◐◆⚡↻↺+⌁])(?:\s+|$)|(?:^|\s+)([×✕✓✔!?→←↓↑↗⌄◐◆⚡↻↺+⌁])\s*$/u);
  const glyph = match?.[1] || match?.[2];
  const iconName = glyphIcons.get(glyph);
  if (!iconName || textNode.parentElement?.closest('code, pre, option, output, svg')) return;
  const fragment = document.createDocumentFragment();
  const before = value.slice(0, match.index).trimEnd();
  const after = value.slice((match.index || 0) + match[0].length).trimStart();
  if (before) fragment.append(document.createTextNode(`${before} `));
  fragment.append(createLegacyIcon(iconName));
  if (after) fragment.append(document.createTextNode(` ${after}`));
  textNode.replaceWith(fragment);
}

function upgradeProductIcons(root) {
  const candidates = [];
  if (root.nodeType === Node.ELEMENT_NODE && root.matches?.(productIconSelector)) candidates.push(root);
  if (root.querySelectorAll) candidates.push(...root.querySelectorAll(productIconSelector));
  candidates.forEach(candidate => {
    const walker = document.createTreeWalker(candidate, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach(replaceGlyphText);
  });
}

export function initializeLegacyIconSystem() {
  upgradeProductIcons(document);
  const observer = new MutationObserver(mutations => mutations.forEach(mutation => {
    if (mutation.type === 'characterData') {
      const owner = mutation.target.parentElement?.closest(productIconSelector);
      if (owner) upgradeProductIcons(owner);
      return;
    }
    mutation.addedNodes.forEach(node => {
      if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.TEXT_NODE) return;
      const owner = node.nodeType === Node.TEXT_NODE ? node.parentElement?.closest(productIconSelector) : node;
      if (owner) upgradeProductIcons(owner);
    });
  }));
  observer.observe(document.body, { childList: true, characterData: true, subtree: true });
}

export function createLegacyIcon(name, { label, className = '' } = {}) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 18 18');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', `legacy-icon ${className}`.trim());
  if (label) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', label); }
  else svg.setAttribute('aria-hidden', 'true');
  (iconNodes[name] || []).forEach(([tag, attributes]) => {
    const child = document.createElementNS(SVG_NS, tag);
    Object.entries(attributes).forEach(([key, value]) => child.setAttribute(key, value));
    svg.append(child);
  });
  return svg;
}

export function iconLabel(name, text) {
  return [createLegacyIcon(name), document.createTextNode(text)];
}
