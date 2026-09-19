import components from '../../../../.documentation/user/components.md';
import customFields from '../../../../.documentation/user/custom-fields.md';
import decoration from '../../../../.documentation/user/decoration.md';
import fields from '../../../../.documentation/user/fields.md';
import gettingStarted from '../../../../.documentation/user/getting-started.md';
import themeReference from '../../../../.documentation/user/theme-reference.md';
import studio from '../../../../.documentation/user/studio.md';
import theming from '../../../../.documentation/user/theming.md';
import validation from '../../../../.documentation/user/validation.md';

/** One document, as it is written in `.documentation/user/`. */
interface DocPage {
  /** The route parameter, and the file's own name without its extension. */
  readonly slug: string;
  readonly title: string;
  readonly kind: 'Guide' | 'Reference';
  /** The one-line purpose from `.documentation/README.md`. */
  readonly purpose: string;
  readonly markdown: string;
}

/**
 * The consumer documentation, mirrored rather than copied.
 *
 * Each entry is the markdown file itself, imported as text — so the page a visitor reads and the document a
 * maintainer edits are the same bytes, and there is no second copy to drift. The order is the one
 * `.documentation/README.md` puts them in: the guides in the order a consumer meets them, then the
 * references.
 */
export const DOC_PAGES: readonly DocPage[] = [
  {
    slug: 'getting-started',
    title: 'Getting Started',
    kind: 'Guide',
    purpose: 'Registry, install, wiring, the stylesheet, a first form',
    markdown: gettingStarted
  },
  {
    slug: 'fields',
    title: 'Fields',
    kind: 'Guide',
    purpose: 'Options, panels, keyboard, dates and times, masking, focus',
    markdown: fields
  },
  {
    slug: 'decoration',
    title: 'Decoration',
    kind: 'Guide',
    purpose: 'Labels, adornments, prefixes, suffixes, hints, required marker',
    markdown: decoration
  },
  {
    slug: 'validation',
    title: 'Validation',
    kind: 'Guide',
    purpose: 'How to connect a validator: Vest, Angular, zod or none',
    markdown: validation
  },
  {
    slug: 'theming',
    title: 'Theming',
    kind: 'Guide',
    purpose: 'The default theme, how theming works, and how to find your own',
    markdown: theming
  },
  {
    slug: 'studio',
    title: 'Studio',
    kind: 'Guide',
    purpose: 'The Studio: build a theme and a form, and take both away',
    markdown: studio
  },
  {
    slug: 'custom-fields',
    title: 'Custom Fields',
    kind: 'Guide',
    purpose: 'Building a field, an option or a validator of your own',
    markdown: customFields
  },
  {
    slug: 'components',
    title: 'Components',
    kind: 'Reference',
    purpose: 'Catalogue of every public component, directive, token and type',
    markdown: components
  },
  {
    slug: 'theme-reference',
    title: 'Theme Reference',
    kind: 'Reference',
    purpose: 'Every overridable --formidable-* custom property',
    markdown: themeReference
  }
];

export const DEFAULT_DOC_SLUG = DOC_PAGES[0]!.slug;

export const DOC_PAGES_BY_SLUG: ReadonlyMap<string, DocPage> = new Map(DOC_PAGES.map((page) => [page.slug, page]));
