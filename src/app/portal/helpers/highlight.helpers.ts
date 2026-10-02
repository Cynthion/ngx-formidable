import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import scss from 'highlight.js/lib/languages/scss';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';

// The languages the documents' code blocks and the Studio's files are written in; `xml` is the one that answers
// to `html`, and `scss` reads plain CSS too. Code in any other language is shown as written.
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('scss', scss);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('xml', xml);

/** `code` as escaped markup, its tokens in the `hljs-*` spans `_code.scss` colours. */
export function highlightCode(code: string, language: string): string {
  return hljs.getLanguage(language)
    ? hljs.highlight(code, { language }).value
    : code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
