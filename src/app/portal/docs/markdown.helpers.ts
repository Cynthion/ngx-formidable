import { marked } from 'marked';
import { slugify } from '../helpers/slug.helpers';

/** Where the maintainer-facing buckets live, since the portal only mirrors `user/`. */
const REPOSITORY_DOCS = 'https://github.com/Cynthion/ngx-formidable/blob/main/.documentation';

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
 * The documents reference each other by path relative to `.documentation/`, which is right on GitHub and
 * meaningless here. A `user/` document is a route; a `tech/` or `impl/` one is not mirrored at all, so it
 * goes to the repository rather than nowhere.
 */
export function rewriteDocHref(href: string, knownSlugs: ReadonlySet<string>): { href: string; external: boolean } {
  const trimmed = href.trim();

  if (/^(https?:|mailto:)/i.test(trimmed)) return { href: trimmed, external: true };
  if (trimmed.startsWith('#')) return { href: trimmed, external: false };

  const path = trimmed.split('#')[0] ?? '';
  const match = path.match(/(?:^|\/)([a-z0-9-]+)\.md$/i);

  if (!match) return { href: trimmed, external: false };

  const slug = match[1]!;
  const bucket = path.includes('tech/') ? 'tech' : path.includes('impl/') ? 'impl' : 'user';

  if (bucket !== 'user') return { href: `${REPOSITORY_DOCS}/${bucket}/${slug}.md`, external: true };

  // A fragment is dropped rather than carried: the portal routes on the hash, so a second `#` in the URL
  // would be ambiguous. `impl/portal.md` states the rule.
  return knownSlugs.has(slug) ? { href: `#/docs/${slug}`, external: false } : { href: trimmed, external: false };
}

/**
 * Makes the documents' file references clickable.
 *
 * They cite each other as code spans — `user/theming.md` — because the documentation guide asks for file
 * references in backticks rather than links. On GitHub that reads fine, since the reader is already in the
 * file tree. Here it is a dead end, so a span naming a document becomes a link to wherever that document
 * lives, while keeping its monospace look.
 */
function linkFileReferences(parsed: Document, knownSlugs: ReadonlySet<string>): void {
  for (const code of Array.from(parsed.querySelectorAll('code'))) {
    // A code block is a code sample, not a reference, and a span already inside a link needs nothing.
    if (code.closest('pre') || code.closest('a')) continue;

    const text = (code.textContent ?? '').trim();

    if (!/^[a-z0-9/-]+\.md$/i.test(text)) continue;

    const { href, external } = rewriteDocHref(text, knownSlugs);

    if (href === text) continue;

    const anchor = parsed.createElement('a');

    anchor.setAttribute('href', href);
    if (external) {
      anchor.setAttribute('target', '_blank');
      anchor.setAttribute('rel', 'noreferrer noopener');
    }

    code.replaceWith(anchor);
    anchor.append(code);
  }
}

/**
 * Renders one of the checked-in documents.
 *
 * The markdown is the repository's own, imported as text, so this is a rendering of the source rather than
 * a transcription of it. It is post-processed as a DOM rather than through the renderer's own hooks: the
 * two things needed — rewritten links and heading ids for the contents — are both easier to state against
 * the output than against a token stream.
 */
export function renderDoc(markdown: string, knownSlugs: ReadonlySet<string>): RenderedDoc {
  const html = marked.parse(markdown, { async: false, gfm: true }) as string;
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const headings: DocHeading[] = [];
  const taken = new Set<string>();

  for (const anchor of Array.from(parsed.querySelectorAll('a[href]'))) {
    const { href, external } = rewriteDocHref(anchor.getAttribute('href') ?? '', knownSlugs);

    anchor.setAttribute('href', href);
    if (external) {
      anchor.setAttribute('target', '_blank');
      anchor.setAttribute('rel', 'noreferrer noopener');
    }
  }

  linkFileReferences(parsed, knownSlugs);

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

  // The document's own `# Title` is rendered by the page around it, so it would otherwise appear twice.
  parsed.querySelector('h1')?.remove();

  return { html: parsed.body.innerHTML, headings };
}
