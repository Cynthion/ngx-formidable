import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** One choice in a sub-tab strip. */
export interface SubTab {
  readonly id: string;
  readonly label: string;
}

/**
 * The second level of the sidebar's navigation, shared by the areas that have two halves.
 *
 * Controlled rather than self-managing: the area owns which half is showing, because the store outside it
 * moves that too — a field chip opens Fields, a derived variable's link opens Variables.
 *
 * Sticky, because the halves are long and a user scrolled down one of them has to be able to see which it is.
 */
@Component({
  selector: 'portal-sub-tabs',
  templateUrl: './sub-tabs.component.html',
  styleUrl: './sub-tabs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubTabsComponent {
  public readonly tabs = input.required<readonly SubTab[]>();
  public readonly active = input.required<string>();
  /** One line saying what this half is for, shown under the strip. */
  public readonly strapline = input('');
  public readonly ariaLabel = input('Sections');

  public readonly selected = output<string>();
}
