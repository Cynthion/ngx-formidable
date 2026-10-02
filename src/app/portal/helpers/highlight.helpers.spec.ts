import fc from 'fast-check';
import { highlightCode } from './highlight.helpers';

/** The text the markup shows once it is set as `innerHTML`, which is what the docs and the Studio do with it. */
function shown(markup: string): string {
  const pre = document.createElement('pre');

  pre.innerHTML = markup;
  return pre.textContent ?? '';
}

describe('highlightCode', () => {
  it('marks up the tokens of a registered language', () => {
    expect(highlightCode(`const name = 'x';`, 'typescript')).toContain('<span class="hljs-keyword">const</span>');
  });

  it('shows code in any other language as written, markup included', () => {
    expect(highlightCode('<b>&amp;</b>', 'cobol')).toBe('&lt;b&gt;&amp;amp;&lt;/b&gt;');
  });

  it('shows exactly the code it was given, in every language', () => {
    fc.assert(
      fc.property(fc.string(), fc.constantFrom('json', 'scss', 'typescript', 'xml', 'cobol'), (code, language) => {
        expect(shown(highlightCode(code, language))).toBe(code);
      })
    );
  });
});
