import { marked } from 'marked';
import { highlightCode } from '../helpers/highlight.helpers';
import { slugify } from '../helpers/slug.helpers';
import { COPY_SVG } from './doc-icons';

/** Where the maintainer-facing buckets live, since the portal only mirrors `user/`. */
const REPOSITORY_DOCS = 'https://github.com/Cynthion/ngx-formidable/blob/main/.documentation';

// Seeds the id Mermaid gives each drawing, which has to be unique across the page.
let nextDiagramId = 0;

/** One heading the in-page contents lists. */
interface DocHeading {
  readonly id: string;
  readonly text: string;
}

interface RenderedDoc {
  readonly html: string;
  readonly headings: readonly DocHeading[];
}

/**
 * Where a link in the documentation should point once it is rendered inside the portal.
 *
 * The documents link each other by relative path, which is right on GitHub and meaningless here. A `user/` document is a route; a `tech/` or `impl/` one is not mirrored at all, so it
 * goes to the repository rather than nowhere.
 */
export function rewriteDocHref(
  href: string,
  knownSlugs: ReadonlySet<string>,
  currentSlug?: string
): { href: string; external: boolean } {
  const trimmed = href.trim();

  if (/^(https?:|mailto:)/i.test(trimmed)) return { href: trimmed, external: true };
  // An anchor in the same document is a route to it: a bare fragment would replace the route the portal holds
  // on the hash.
  if (trimmed.startsWith('#')) {
    return { href: currentSlug ? `#/docs/${currentSlug}/${trimmed.slice(1)}` : trimmed, external: false };
  }

  const path = trimmed.split('#')[0] ?? '';
  const match = path.match(/(?:^|\/)([a-z0-9-]+)\.md$/i);

  if (!match) return { href: trimmed, external: false };

  const slug = match[1]!;
  const bucket = path.includes('tech/') ? 'tech' : path.includes('impl/') ? 'impl' : 'user';

  if (bucket !== 'user') return { href: `${REPOSITORY_DOCS}/${bucket}/${slug}.md`, external: true };

  // A fragment is dropped rather than carried: the portal routes on the hash, so a second `#` in the URL
  // would be ambiguous. `tech/portal.md` states the rule.
  return knownSlugs.has(slug) ? { href: `#/docs/${slug}`, external: false } : { href: trimmed, external: false };
}

/**
 * Renders one of the checked-in documents.
 *
 * The markdown is the repository's own, imported as text, so this is a rendering of the source rather than
 * a transcription of it. It is post-processed as a DOM rather than through the renderer's own hooks: what is
 * needed — rewritten links, heading ids for the contents, highlighted code blocks — is easier to state against
 * the output than against a token stream.
 */
export function renderDoc(markdown: string, knownSlugs: ReadonlySet<string>, slug?: string): RenderedDoc {
  const html = marked.parse(markdown, { async: false, gfm: true }) as string;
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const headings: DocHeading[] = [];
  const taken = new Set<string>();

  for (const anchor of Array.from(parsed.querySelectorAll('a[href]'))) {
    const { href, external } = rewriteDocHref(anchor.getAttribute('href') ?? '', knownSlugs, slug);

    anchor.setAttribute('href', href);
    if (external) {
      anchor.setAttribute('target', '_blank');
      anchor.setAttribute('rel', 'noreferrer noopener');
    }
  }

  const claim = (element: Element, text: string): string => {
    let id = slugify(text);
    let suffix = 2;

    while (taken.has(id)) id = `${slugify(text)}-${suffix++}`;
    taken.add(id);
    element.setAttribute('id', id);
    return id;
  };

  for (const heading of Array.from(parsed.querySelectorAll('h2'))) {
    const text = (heading.textContent ?? '').trim();

    headings.push({ id: claim(heading, text), text });
  }

  // Only the `##` headings are listed in the contents, but a `###` one and a variable's row are both linked to:
  // a component's entry in the catalogue, and a variable's line in the Theme Reference.
  for (const heading of Array.from(parsed.querySelectorAll('h3'))) claim(heading, (heading.textContent ?? '').trim());

  for (const row of Array.from(parsed.querySelectorAll('tr'))) {
    const name = row.querySelector('td')?.textContent?.trim() ?? '';

    if (/^--formidable-[a-z0-9-]+$/.test(name)) claim(row, name);
  }

  // A Mermaid block keeps its source for `drawDiagrams`, and stays the code block it was written as until it
  // is drawn, which is what shows while Mermaid loads.
  for (const code of Array.from(parsed.querySelectorAll('pre > code.language-mermaid'))) {
    const block = code.parentElement!;
    const diagram = parsed.createElement('div');

    diagram.className = 'doc-diagram';
    diagram.dataset['diagram'] = code.textContent ?? '';
    block.replaceWith(diagram);
    diagram.append(block);
  }

  // Every other code block is highlighted, under a bar naming its language and copying it. The page wires the
  // copy up, because this is markup rather than a component.
  for (const code of Array.from(parsed.querySelectorAll('pre > code:not(.language-mermaid)'))) {
    const block = code.parentElement!;
    const language = code.className.match(/language-([\w-]+)/)?.[1] ?? '';
    const frame = parsed.createElement('div');

    frame.className = 'doc-code';
    frame.innerHTML = `<div class="doc-code-bar">${language}<button type="button" class="doc-code-copy" aria-label="Copy" title="Copy">${COPY_SVG}</button></div>`;
    block.replaceWith(frame);
    frame.append(block);
    code.innerHTML = highlightCode(code.textContent ?? '', language);
  }

  // The document's own `# Title` is rendered by the page around it, so it would otherwise appear twice.
  parsed.querySelector('h1')?.remove();

  return { html: parsed.body.innerHTML, headings };
}

/**
 * Draws every diagram `renderDoc` marked inside `host`, in Mermaid's theme for the portal's appearance.
 *
 * Mermaid is imported here rather than at the top, so only a document with a diagram loads it. It bakes the
 * theme into the drawing, so an appearance change draws the diagram again from the source it keeps.
 */
export async function drawDiagrams(host: HTMLElement, dark: boolean): Promise<void> {
  const diagrams = Array.from(host.querySelectorAll<HTMLElement>('.doc-diagram'));
  if (!diagrams.length) return;

  const { default: mermaid } = await import('mermaid');

  // SVG labels rather than HTML ones: the document's own styles reach into HTML, and Mermaid measures a label
  // outside the document before placing it inside.
  mermaid.initialize({ startOnLoad: false, htmlLabels: false, theme: dark ? 'dark' : 'default' });

  for (const diagram of diagrams) {
    const { svg } = await mermaid.render(`doc-diagram-${nextDiagramId++}`, diagram.dataset['diagram'] ?? '');

    diagram.innerHTML = svg;
  }
}
