import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { copyText } from '../../helpers/clipboard.helpers';
import { ExampleIconComponent } from '../../../example-icon/example-icon.component';
import { PortalAppearance, ThemeStore } from '../../state/theme.store';
import { GITHUB_SVG } from './top-bar-icons';

/** The repository the portal documents. */
const REPOSITORY_URL = 'https://github.com/Cynthion/ngx-formidable';

/**
 * The three places there are to be. They are routes, so the bar is the only way between them.
 *
 * There is no separate preview route: turning `Field Types` off leaves the Studio's stage showing the form
 * exactly as a consumer's page would, which is what a third route would have duplicated.
 */
const ROUTES: readonly { path: string; label: string; title: string; exact: boolean }[] = [
  // `/` has to match exactly or it would light up on every route; `/docs` must not, or it would go dark the
  // moment a document is open, which is the only way anyone ever sees it.
  { path: '/', label: 'Studio', title: 'Theme and configure the fields against a live form', exact: true },
  { path: '/specimen', label: 'Specimen', title: 'One field, one change at a time, under your theme', exact: false },
  { path: '/docs', label: 'Docs', title: 'The consumer documentation, as the repository writes it', exact: false }
];

const APPEARANCES: readonly { value: PortalAppearance; label: string; glyph: string }[] = [
  { value: 'system', label: 'Follow the system', glyph: '◐' },
  { value: 'light', label: 'Light', glyph: '☀' },
  { value: 'dark', label: 'Dark', glyph: '☾' }
];

/**
 * Fixed across the top on every route: what this is, the three places there are to be, the repository, the
 * portal's own appearance, and the theme's copy.
 *
 * One copy, not one per thing to take away: the theme is the only one that stands on its own. The template
 * binds names only its component defines, so a one-click copy of it alone hands the user code that does not
 * compile — it lives beside that component in Import & Export, whose tab is always in view on the Studio.
 *
 * The count is the number of variables the user has changed, never the size of the token surface: a number
 * that rises as they work says the library needs eight to twelve variables without a sentence of explanation.
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

  protected readonly repositoryUrl = REPOSITORY_URL;
  protected readonly routes = ROUTES;
  protected readonly githubSvg = GITHUB_SVG;

  protected readonly copiedTheme = signal(false);

  protected copyTheme(): Promise<void> {
    return copyText(this.theme.exportText(), this.copiedTheme);
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
