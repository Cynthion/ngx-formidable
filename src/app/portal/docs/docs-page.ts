import { afterRenderEffect, Component, computed, DOCUMENT, ElementRef, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { EMPTY, fromEvent, map } from 'rxjs';
import { ResizeHandle } from '../chrome/resize-handle';
import { TopBar } from '../chrome/top-bar/top-bar';
import { copyText } from '../helpers/clipboard.helpers';
import { LayoutStore } from '../state/layout.store';
import { ThemeStore } from '../state/theme.store';
import { COPIED_SVG, COPY_SVG } from './doc-icons';
import { DEFAULT_DOC_SLUG, DOC_PAGES, DOC_PAGES_BY_SLUG } from './doc-pages';
import { drawDiagrams, renderDoc } from './markdown.helpers';

const PREFERS_DARK = '(prefers-color-scheme: dark)';

const KNOWN_SLUGS = new Set(DOC_PAGES.map((page) => page.slug));

/**
 * The consumer documentation, rendered from the repository's own markdown.
 *
 * Nothing here is a second copy: `.documentation/user/*.md` is imported as text by the builder's `.md`
 * loader and rendered, so the page and the document a maintainer edits are the same bytes. That is also why
 * there is no generated variable table any more — `user/theme-reference.md` is the variable table.
 *
 * The HTML is trusted because its source is checked into this repository and is not user input; nothing on
 * this route renders anything a visitor supplied.
 */
@Component({
  selector: 'portal-docs-page',
  templateUrl: './docs-page.html',
  styleUrl: './docs-page.scss',
  imports: [RouterLink, ResizeHandle, TopBar],
  host: { class: 'portal-chrome' }
})
export class DocsPage {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly theme = inject(ThemeStore);
  private readonly doc = inject(DOCUMENT);

  protected readonly layout = inject(LayoutStore);

  private readonly darkQuery = this.doc.defaultView?.matchMedia(PREFERS_DARK) ?? null;

  // The operating system's preference, which the portal follows while its appearance toggle is on `system`.
  private readonly systemPrefersDark = toSignal(
    this.darkQuery
      ? fromEvent<MediaQueryListEvent>(this.darkQuery, 'change').pipe(map((event) => event.matches))
      : EMPTY,
    { initialValue: this.darkQuery?.matches ?? false }
  );

  /** Whether the portal is painted dark, which decides the theme its diagrams are drawn in. */
  private readonly isDark = computed(() => {
    const appearance = this.theme.appearance();

    return appearance === 'system' ? this.systemPrefersDark() : appearance === 'dark';
  });

  /** Bound from the route parameter by `withComponentInputBinding()`. */
  public readonly topic = input<string | undefined>(undefined);

  /** A heading or a variable's row to open the document at, bound the same way. */
  public readonly anchor = input<string | undefined>(undefined);

  protected readonly pages = DOC_PAGES;

  protected readonly page = computed(() => DOC_PAGES_BY_SLUG.get(this.topic() ?? DEFAULT_DOC_SLUG) ?? DOC_PAGES[0]!);

  private readonly rendered = computed(() => renderDoc(this.page().markdown, KNOWN_SLUGS, this.page().slug));

  protected readonly body = computed<SafeHtml>(() => this.sanitizer.bypassSecurityTrustHtml(this.rendered().html));

  protected readonly headings = computed(() => this.rendered().headings);

  protected readonly guides = this.pages.filter((page) => page.kind === 'Guide');
  protected readonly references = this.pages.filter((page) => page.kind === 'Reference');

  constructor() {
    // A new document starts at its anchor, or at its top rather than wherever the last one was scrolled to. After
    // the render, because the anchor is part of the document being rendered.
    afterRenderEffect(() => {
      this.page();

      const host = this.elementRef.nativeElement;
      const anchor = this.anchor();
      const target = anchor ? host.querySelector(`#${CSS.escape(anchor)}`) : null;

      host.querySelector('.is-anchored')?.classList.remove('is-anchored');
      if (!target) {
        host.querySelector('.content')?.scrollTo({ top: 0 });
        return;
      }
      target.classList.add('is-anchored');
      target.scrollIntoView({ block: 'center' });
    });

    // After the render too, because a diagram is part of the document being rendered, and again whenever the
    // appearance flips.
    afterRenderEffect(() => {
      this.page();

      void drawDiagrams(this.elementRef.nativeElement, this.isDark());
    });
  }

  /** The contents' divider sits on its left edge, so the width is what is left of the viewport. */
  protected onContentsDividerMoved(clientX: number): void {
    const viewport = this.doc.defaultView?.innerWidth ?? 0;

    this.layout.setDocsContentsWidth(viewport - clientX);
  }

  /** A code block's copy button is markup inside the rendered document, so one listener on it serves them all. */
  protected onBodyClick(event: MouseEvent): void {
    const button = (event.target as Element).closest('.doc-code-copy');
    const code = button?.closest('.doc-code')?.querySelector('code');

    if (!button || !code) return;

    void copyText((code.textContent ?? '').trimEnd(), {
      set: (copied) => {
        const label = copied ? 'Copied' : 'Copy';

        button.innerHTML = copied ? COPIED_SVG : COPY_SVG;
        button.setAttribute('aria-label', label);
        button.setAttribute('title', label);
        button.classList.toggle('is-copied', copied);
      }
    });
  }

  protected scrollTo(id: string): void {
    this.elementRef.nativeElement
      .querySelector(`#${CSS.escape(id)}`)
      ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
}
