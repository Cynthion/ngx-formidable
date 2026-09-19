import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { serializeDefinition } from '../../export/markup-serializer';
import { copyText } from '../../helpers/clipboard.helpers';
import { ExampleIconComponent } from '../../../example-icon/example-icon.component';
import { FormDefinitionStore } from '../../state/form-definition.store';
import { ExportSection, InspectorStore } from '../../state/inspector.store';
import { PortalAppearance, ThemeStore } from '../../state/theme.store';
import { GITHUB_SVG } from './top-bar-icons';

/** The repository the portal documents. */
const REPOSITORY_URL = 'https://github.com/Cynthion/ngx-formidable';

/**
 * The two places there are to be. They are routes, so the bar is the only way between them.
 *
 * There is no separate preview route: turning `Field Types` off leaves the Studio's stage showing the form
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
 * portal's own appearance, and one export group per thing there is to take away.
 *
 * Two groups rather than one, because the theme and the template are two round trips and a single control
 * could only land on one of them. Each states a count of its own: the theme's is the number of variables the
 * user has changed, never the size of the token surface — a number that rises as they work says the library
 * needs eight to twelve variables without a sentence of explanation — and the template's is the fields it
 * carries. The form's component has no copy here: it is the template's other half rather than a third thing
 * to take away, so it sits beside the template in Import & Export.
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

  private readonly definition = inject(FormDefinitionStore);
  private readonly inspector = inject(InspectorStore);
  private readonly router = inject(Router);

  protected readonly fields = this.definition.fields;

  protected readonly repositoryUrl = REPOSITORY_URL;
  protected readonly routes = ROUTES;
  protected readonly githubSvg = GITHUB_SVG;

  protected readonly copiedTheme = signal(false);
  protected readonly copiedMarkup = signal(false);

  protected copyTheme(): Promise<void> {
    return copyText(this.theme.exportText(), this.copiedTheme);
  }

  /** Serialized on demand rather than held: the definition is the source and this is a function of it. */
  protected copyMarkup(): Promise<void> {
    return copyText(serializeDefinition(this.definition.definition()), this.copiedMarkup);
  }

  /**
   * The control beside each copy button reaches the rest of that round trip — the same block to read before
   * copying, its options, and the box to paste one back into.
   *
   * It navigates as well as setting the area, because the bar is on the Docs route too and there is no
   * inspector there to open. Setting the area alone would look like the control had done nothing.
   */
  protected showExport(section: ExportSection): Promise<boolean> {
    this.inspector.openExport(section);

    return this.router.navigate(['/']);
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
