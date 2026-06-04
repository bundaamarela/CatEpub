/** Fraction of characters to bold at the start of each word. */
const BOLD_RATIO = 0.4;

const boldWord = (word: string): string => {
  if (word.length <= 1) return `<b>${word}</b>`;
  const n = Math.max(1, Math.ceil(word.length * BOLD_RATIO));
  return `<b>${word.slice(0, n)}</b>${word.slice(n)}`;
};

/**
 * Wraps the first ~40% of every whitespace-delimited token in `<b>`.
 * Input may contain HTML; only bare word tokens are touched (no tag insides).
 */
export const applyBionicToText = (text: string): string =>
  text.replace(/\S+/g, boldWord);

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'KBD', 'SAMP', 'B', 'STRONG']);

/**
 * Walks all text nodes inside `root` and applies bionic bolding in-place.
 * Operates on the document that owns `root` (works inside iframes when called
 * from that iframe's context).
 */
export const applyBionicToElement = (root: Element): void => {
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let node = walker.nextNode();
  while (node) {
    nodes.push(node as Text);
    node = walker.nextNode();
  }
  for (const textNode of nodes) {
    const parent = textNode.parentElement;
    if (!parent) continue;
    if (parent.closest([...SKIP_TAGS].map((t) => t.toLowerCase()).join(','))) continue;
    if (!textNode.data.trim()) continue;
    const span = root.ownerDocument.createElement('span');
    span.dataset['bionic'] = '';
    span.innerHTML = applyBionicToText(textNode.data);
    parent.replaceChild(span, textNode);
  }
};

/**
 * Reverses `applyBionicToElement` by replacing `[data-bionic]` spans with
 * their plain-text equivalent.
 */
export const removeBionicFromElement = (root: Element): void => {
  for (const span of Array.from(root.querySelectorAll<HTMLElement>('[data-bionic]'))) {
    const parent = span.parentElement;
    if (!parent) continue;
    parent.replaceChild(root.ownerDocument.createTextNode(span.textContent ?? ''), span);
  }
};
