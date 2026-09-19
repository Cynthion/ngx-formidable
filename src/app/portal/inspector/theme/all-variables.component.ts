import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, signal } from '@angular/core';
import { AccordionComponent } from '../../chrome/accordion/accordion.component';
import { LIBRARY_WRITTEN_TOKENS, THEME_TOKEN_GROUPS, THEME_TOKENS } from '../../model/token-manifest';
import { ThemeToken } from '../../model/token-manifest.model';
import { ThemeStore } from '../../state/theme.store';
import { TokenControlComponent } from './token-control.component';

/** One manifest group with the tokens that survived the filters. */
interface TokenGroup {
  readonly name: string;
  readonly slug: string;
  readonly tokens: readonly ThemeToken[];
  readonly changed: number;
}

/**
 * Every themeable variable, grouped by the sections of `user/theme-reference.md`.
 *
 * "Only what I changed" collapses the list to the user's own theme, which is the export preview.
 */
@Component({
  selector: 'portal-all-variables',
  templateUrl: './all-variables.component.html',
  styleUrl: './all-variables.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AccordionComponent, TokenControlComponent]
})
export class AllVariablesComponent {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly theme = inject(ThemeStore);

  protected readonly query = signal('');
  protected readonly openGroup = signal<string | null>(null);
  protected readonly writtenOpen = signal(false);
  protected readonly writtenTokens = LIBRARY_WRITTEN_TOKENS;

  protected readonly groups = computed<TokenGroup[]>(() => {
    const query = this.query().trim().toLowerCase();
    const onlyChanged = this.theme.showOnlyChanged();

    const matching = THEME_TOKENS.filter((token) => {
      if (onlyChanged && !this.theme.isChanged(token.name)) return false;
      if (!query) return true;

      return token.name.toLowerCase().includes(query) || token.description.toLowerCase().includes(query);
    });

    return THEME_TOKEN_GROUPS.map((name) => {
      const tokens = matching.filter((token) => token.group === name);

      return {
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        tokens,
        changed: tokens.filter((token) => this.theme.isChanged(token.name)).length
      };
    }).filter((group) => group.tokens.length > 0);
  });

  protected readonly total = computed(() => this.groups().reduce((sum, group) => sum + group.tokens.length, 0));

  protected toggle(name: string): void {
    this.openGroup.update((current) => (current === name ? null : name));
  }

  protected hintFor(group: TokenGroup): string {
    return group.changed ? `${group.changed} of ${group.tokens.length} changed` : `${group.tokens.length}`;
  }

  /** Opens the group holding the named variable and scrolls it into view. */
  public reveal(name: string): void {
    this.theme.showOnlyChanged.set(false);
    this.query.set('');

    const group = THEME_TOKENS.find((token) => token.name === name)?.group;
    if (group) this.openGroup.set(group);

    queueMicrotask(() => {
      const target = this.elementRef.nativeElement.querySelector(`[data-token="${CSS.escape(name)}"]`);

      target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }
}
