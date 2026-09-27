import { Component, inject, signal, viewChild } from '@angular/core';
import { Accordion } from '../../chrome/accordion/accordion';
import { InspectorStore, ThemeSubTab } from '../../state/inspector.store';
import { SubTab, SubTabs } from '../sub-tabs/sub-tabs';
import { AllVariables } from './all-variables';
import { BrandStep } from './brand-step';
import { FontsStep } from './fonts-step';
import { PresetGallery } from './preset-gallery';
import { SeedsStep } from './seeds-step';
import { ShapeStep } from './shape-step';
import { SurfaceStep } from './surface-step';

/** The sections of the ladder, in the order `user/theming.md` puts them. */
type ThemeSection = 'presets' | 'brand' | 'repaint' | 'reshape' | 'surface' | 'fonts';

const SUB_TABS: readonly SubTab[] = [
  { id: 'design', label: 'Design' },
  { id: 'variables', label: 'Variables' }
];

const STRAPLINES: Readonly<Record<ThemeSubTab, string>> = {
  design: 'Pick a look, then work down the steps. Stop whenever it looks right.',
  variables: 'Every themeable variable, grouped as the reference groups them.'
};

/**
 * How the fields look.
 *
 * Two halves, because the ladder and the full variable surface in one scroll are longer than the panel and
 * a user cannot see where they are in it. The ladder itself stays one column of numbered steps — collapsed,
 * its headers are the table of contents that says what the order is and how far down it you are.
 */
@Component({
  selector: 'portal-theme-tab',
  templateUrl: './theme-tab.html',
  styleUrl: './theme-tab.scss',
  imports: [SubTabs, Accordion, PresetGallery, BrandStep, SeedsStep, ShapeStep, SurfaceStep, FontsStep, AllVariables]
})
export class ThemeTab {
  protected readonly inspector = inject(InspectorStore);
  protected readonly subTabs = SUB_TABS;
  protected readonly straplines = STRAPLINES;

  private readonly allVariables = viewChild(AllVariables);

  /** One section open at a time: a section cannot know about its siblings, so the area owns which. */
  protected readonly openSection = signal<ThemeSection | null>('presets');

  protected toggle(section: ThemeSection): void {
    this.openSection.update((current) => (current === section ? null : section));
  }

  protected isOpen(section: ThemeSection): boolean {
    return this.openSection() === section;
  }

  protected select(id: string): void {
    this.inspector.themeTab.set(id as ThemeSubTab);
  }

  /** A derived variable links to its base, which lives in the full list on the Variables half. */
  protected reveal(name: string): void {
    this.inspector.openVariables();

    queueMicrotask(() => this.allVariables()?.reveal(name));
  }
}
