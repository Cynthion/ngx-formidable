import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { TopBarComponent } from '../chrome/top-bar/top-bar.component';
import { DEFAULT_DOC_SLUG, DOC_PAGES, DOC_PAGES_BY_SLUG } from './doc-pages';
import { renderDoc } from './markdown.helpers';

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
  templateUrl: './docs-page.component.html',
  styleUrl: './docs-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TopBarComponent],
  host: { class: 'portal-chrome' }
})
export class DocsPageComponent {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly sanitizer = inject(DomSanitizer);

  /** Bound from the route parameter by `withComponentInputBinding()`. */
  public readonly topic = input<string | undefined>(undefined);

  /** A heading or a variable's row to open the document at, bound the same way. */
  public readonly anchor = input<string | undefined>(undefined);

  protected readonly pages = DOC_PAGES;

  protected readonly page = computed(() => DOC_PAGES_BY_SLUG.get(this.topic() ?? DEFAULT_DOC_SLUG) ?? DOC_PAGES[0]!);

  private readonly rendered = computed(() => renderDoc(this.page().markdown, KNOWN_SLUGS));

  protected readonly body = computed<SafeHtml>(() => this.sanitizer.bypassSecurityTrustHtml(this.rendered().html));

  protected readonly headings = computed(() => this.rendered().headings);

  protected readonly guides = computed(() => this.pages.filter((page) => page.kind === 'Guide'));
  protected readonly references = computed(() => this.pages.filter((page) => page.kind === 'Reference'));

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
  }

  protected scrollTo(id: string): void {
    this.elementRef.nativeElement
      .querySelector(`#${CSS.escape(id)}`)
      ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
}
