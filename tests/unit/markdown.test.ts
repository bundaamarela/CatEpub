import { describe, expect, it } from 'vitest';

import { renderMarkdown } from '@/lib/utils/markdown';

describe('renderMarkdown', () => {
  it('converte negrito e itálico', () => {
    const html = renderMarkdown('**forte** e *fraco*');
    expect(html).toContain('<strong>forte</strong>');
    expect(html).toContain('<em>fraco</em>');
  });

  it('converte listas', () => {
    const html = renderMarkdown('- um\n- dois');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>um</li>');
    expect(html).toContain('<li>dois</li>');
  });

  it('converte links preservando href', () => {
    const html = renderMarkdown('[Anthropic](https://anthropic.com)');
    expect(html).toContain('href="https://anthropic.com"');
    expect(html).toContain('Anthropic</a>');
  });

  it('remove tags <script> via DOMPurify', () => {
    const html = renderMarkdown('hello <script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('alert(1)');
  });

  it('remove handlers de evento inline', () => {
    const html = renderMarkdown('<a href="x" onclick="alert(1)">click</a>');
    expect(html).not.toContain('onclick');
  });

  it('preserva blockquote', () => {
    const html = renderMarkdown('> citação');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('citação');
  });
});
