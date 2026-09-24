import { DOC_PAGES } from './doc-pages';
import { renderDoc, rewriteDocHref } from './markdown.helpers';

const SLUGS = new Set(DOC_PAGES.map((page) => page.slug));

describe('rewriteDocHref', () => {
  it('turns a sibling user document into a route', () => {
    expect(rewriteDocHref('user/theming.md', SLUGS)).toEqual({ href: '#/docs/theming', external: false });
    expect(rewriteDocHref('theming.md', SLUGS)).toEqual({ href: '#/docs/theming', external: false });
  });

  it('drops a fragment, because the portal already routes on the hash', () => {
    expect(rewriteDocHref('theming.md#4-five-things', SLUGS).href).toBe('#/docs/theming');
  });

  it('sends a maintainer document to the repository, since the portal does not mirror it', () => {
    const result = rewriteDocHref('tech/layering.md', SLUGS);

    expect(result.external).toBe(true);
    expect(result.href).toContain('/tech/layering.md');
  });

  it('leaves an in-page anchor and an absolute URL alone', () => {
    expect(rewriteDocHref('#underline', SLUGS)).toEqual({ href: '#underline', external: false });
    expect(rewriteDocHref('https://angular.dev', SLUGS)).toEqual({ href: 'https://angular.dev', external: true });
  });

  it('leaves a document it does not mirror as written', () => {
    expect(rewriteDocHref('user/not-a-page.md', SLUGS).href).toBe('user/not-a-page.md');
  });
});

describe('renderDoc', () => {
  it('renders the tables the references are made of', () => {
    const { html } = renderDoc('| A | B |\n| :-- | :-- |\n| one | two |', SLUGS);

    expect(html).toContain('<table>');
    expect(html).toContain('>one<');
    expect(html).toContain('>A<');
  });

  it('collects the second-level headings for the contents', () => {
    const { headings } = renderDoc('# Title\n\n## First\n\ntext\n\n## Second', SLUGS);

    expect(headings).toEqual([
      { id: 'first', text: 'First' },
      { id: 'second', text: 'Second' }
    ]);
  });

  it('gives two headings of the same name distinct ids', () => {
    const { headings } = renderDoc('## Slider\n\n## Slider', SLUGS);

    expect(headings.map((heading) => heading.id)).toEqual(['slider', 'slider-2']);
  });

  it('drops the document title, which the page renders itself', () => {
    expect(renderDoc('# Theming\n\n## How', SLUGS).html).not.toContain('<h1>');
  });

  it('marks an outbound link so it opens away from the portal', () => {
    const { html } = renderDoc('[Angular](https://angular.dev)', SLUGS);

    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer noopener"');
  });

  // The documents cite each other in backticks, per the documentation guide, so without this the mirrored
  // pages have no way to reach one another except through the navigation.
  it('makes a backticked file reference clickable', () => {
    const { html } = renderDoc('See `user/theming.md` for the rest.', SLUGS);

    expect(html).toContain('<a href="#/docs/theming"><code>user/theming.md</code></a>');
  });

  it('sends a backticked maintainer document to the repository', () => {
    const { html } = renderDoc('See `tech/layering.md`.', SLUGS);

    expect(html).toContain('/tech/layering.md');
    expect(html).toContain('target="_blank"');
  });

  it('leaves code samples and other spans alone', () => {
    expect(renderDoc('```\nuser/theming.md\n```', SLUGS).html).not.toContain('<a ');
    expect(renderDoc('The `placeholder` input.', SLUGS).html).not.toContain('<a ');
    expect(renderDoc('A `user/nope.md` nobody mirrors.', SLUGS).html).not.toContain('<a ');
  });

  it('renders every checked-in document without throwing', () => {
    for (const page of DOC_PAGES) {
      const { html } = renderDoc(page.markdown, SLUGS);

      expect(html.length).withContext(page.slug).toBeGreaterThan(200);
    }
  });

  // A code sample is rendered verbatim, so whatever indents the markdown indents the page. Two spaces per
  // level, like the source the samples are drawn from — `.editorconfig` sets it, this notices if it stops.
  it('indents its code samples the way the repository indents code', () => {
    for (const page of DOC_PAGES) {
      expect(page.markdown).withContext(page.slug).not.toContain('\t');
    }
  });

  // The markdown is imported as text by the builder's `.md` loader. If that ever stops working the import
  // is a path string rather than a document, and every page would render as one short line.
  it('has the real documents behind it, not their paths', () => {
    for (const page of DOC_PAGES) {
      expect(page.markdown.length).withContext(page.slug).toBeGreaterThan(1000);
      expect(page.markdown).withContext(page.slug).toContain('#');
    }
  });
});
