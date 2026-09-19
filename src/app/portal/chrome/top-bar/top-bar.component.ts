import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ExampleIconComponent } from '../../../example-icon/example-icon.component';
import { FormDefinitionStore } from '../../state/form-definition.store';
import { InspectorStore } from '../../state/inspector.store';
import { PortalAppearance, ThemeStore } from '../../state/theme.store';
import { GITHUB_SVG } from './top-bar-icons';

/** The repository the portal documents. */
const REPOSITORY_URL = 'https://github.com/Cynthion/ngx-formidable';

/**
 * The two places there are to be. They are routes, so the bar is the only way between them.
 *
 * There is no separate preview route: turning the captions off leaves the Studio's stage showing the form
 * exactly as a consumer's page would, which is what a third route would have duplicated.
 */
const ROUTES: readonly { path: string; label: string; title: string; exact: boolean }[] = [
  // `/` has to match exactly or it would light up on every route; `/docs` must not, or it would go dark the
  // moment a document is open, which is the only way anyone ever sees it.
  { path: '/', label: 'Studio', title: 'Theme and configure the fields against a live form', exact: true },
  { path: '/docs', label: 'Docs', title: 'The consumer documentation, as the repository writes it', exact: false }
];

const APPEARANCES: readonly { value: PortalAppearance; label: string; glyph: string }[] = [
  { value: 'system', label: 'Follow the system', glyph: '◐' },
  { value: 'light', label: 'Light', glyph: '☀' },
  { value: 'dark', label: 'Dark', glyph: '☾' }
];

/**
 * Fixed across the top on every route: what this is, the two places there are to be, the repository, the
 * portal's own appearance, and the export controls.
 *
 * The copy button states the number of variables the user has changed, never the size of the token surface —
 * a number that rises as they work says the library needs eight to twelve variables without a sentence of
 * explanation.
 */
@Component({
  selector: 'portal-top-bar',
  templateUrl: './top-bar.component.html',
  styleUrl: './top-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, ExampleIconComponent]
})
export class TopBarComponent {
  protected readonly theme = inject(ThemeStore);
  protected readonly fields = inject(FormDefinitionStore).fields;
  private readonly inspector = inject(InspectorStore);

  protected readonly repositoryUrl = REPOSITORY_URL;
  protected readonly routes = ROUTES;
  protected readonly appearances = APPEARANCES;
  protected readonly githubSvg = GITHUB_SVG;

  /**
   * Copying the theme is the common ending, so it stays the primary action. The second segment is the rest
   * of what there is to take away — the same CSS to read before copying, and the template beside it.
   */
  protected showExport(): void {
    this.inspector.openExport();
  }

  protected readonly justCopied = signal(false);

  protected async copyTheme(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.theme.exportText());
      this.justCopied.set(true);
      setTimeout(() => this.justCopied.set(false), 1600);
    } catch {
      // A denied clipboard is not a failure worth a dialog: the export panel shows the same text to select.
    }
  }

  protected cycleAppearance(): void {
    const current = this.theme.appearance();
    const index = APPEARANCES.findIndex((entry) => entry.value === current);

    this.theme.appearance.set(APPEARANCES[(index + 1) % APPEARANCES.length]!.value);
  }

  protected glyphFor(appearance: PortalAppearance): string {
    return APPEARANCES.find((entry) => entry.value === appearance)?.glyph ?? '◐';
  }

  protected labelFor(appearance: PortalAppearance): string {
    return APPEARANCES.find((entry) => entry.value === appearance)?.label ?? '';
  }
}
