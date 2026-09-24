import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { slugify } from '../../helpers/slug.helpers';

/**
 * One collapsible section of an inspector panel.
 *
 * Controlled rather than self-managing: the panel around it owns which section is open, because only one is
 * at a time and a section cannot know about its siblings. Collapsed, the run of headers is the panel's
 * table of contents — which is what makes a long tab navigable instead of merely scrollable.
 */
@Component({
  selector: 'portal-accordion',
  templateUrl: './accordion.component.html',
  styleUrl: './accordion.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.is-open]': 'open()' }
})
export class AccordionComponent {
  public readonly heading = input.required<string>();
  /** The step number in a numbered ladder. Omitted for a section that is not one of the steps. */
  public readonly step = input<number | null>(null);
  /** What the section costs or covers — "8 seeds", "195 variables". */
  public readonly hint = input('');
  /** Text under the heading, shown only while the section is open. */
  public readonly lede = input('');
  public readonly open = input(false);
  /** Marks the section a cold visitor should start at. */
  public readonly startHere = input(false);

  public readonly toggled = output<void>();

  protected readonly headingId = computed(() => `acc-${slugify(this.heading())}`);
}
