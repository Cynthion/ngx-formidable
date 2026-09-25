import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  AutocompleteFieldComponent,
  DateFieldComponent,
  DropdownFieldComponent,
  FieldDecoratorComponent,
  FieldHintDirective,
  FieldLabelDirective,
  FieldPrefixDirective,
  FieldToggleIconDirective,
  InputFieldComponent
} from '@cynthion/ngx-formidable';
import { ExampleIconComponent } from '../../example-icon/example-icon.component';
import { ThemeScopeDirective } from '../chrome/theme-scope.directive';
import { TopBarComponent } from '../chrome/top-bar/top-bar.component';
import { PortalFieldKind, PortalOptionSpec } from '../model/field-spec.model';
import { PREVIEW_FIELDS } from '../model/preview-form.definition';
import { FONT_FAMILY_TOKEN, PageSurface, PRESETS_BY_KEY, THEME_PRESETS, ThemePreset } from '../model/presets';
import { COLOR_SCHEMES, GEOMETRY_SCHEMES, USE_SITE_VARS } from '../model/schemes';
import {
  ADORNMENT_COLUMNS,
  ADORNMENT_FEATURED,
  ADORNMENT_KINDS,
  ANATOMY_PARTS,
  AnatomyGroup,
  anatomyGroup,
  AnatomyPart,
  LABEL_FEATURED,
  LABEL_POSITION_KINDS,
  labelColumns,
  LADDER_STEPS,
  sampleSpec,
  sampleValue,
  SPECIMEN_FORM_OPTIONS,
  SPECIMEN_KINDS,
  STATE_COLUMNS,
  STATE_FEATURED,
  variableLink
} from '../model/specimen';
import { THEME_TOKENS_BY_NAME } from '../model/token-manifest';
import { PreviewFieldComponent } from '../stage/preview-form/preview-field.component';
import { CALENDAR_SVG, MARKER_SVG } from '../stage/preview-form/preview-icons';
import { ThemeStore } from '../state/theme.store';
import { SpecimenMatrixComponent } from './specimen-matrix.component';

/** Whose theme the page wears: the Studio's, one preset's, or the ladder at one of its steps. */
type ThemeSource =
  | { readonly kind: 'studio' }
  | { readonly kind: 'preset'; readonly key: string }
  | { readonly kind: 'ladder'; readonly step: number };

/** One labelled part, laid out: where its line meets the field, and where its label sits. */
interface Callout {
  readonly part: AnatomyPart;
  readonly group: AnatomyGroup;
  readonly link: readonly string[];
  readonly value: string;
  readonly description: string;
  readonly anchorX: number;
  readonly anchorY: number;
  readonly lineX: number;
  readonly labelY: number;
}

/** The vertical distance between two callout labels on the same side. */
const CALLOUT_SPACING = 50;

/** Between a callout's label and the field it points into. */
const CALLOUT_GAP = 40;

/** The library's default theme assumes a light page, so the ladder gives it one. */
const LADDER_PAGE: PageSurface = { background: '#ffffff', text: '#1e293b' };

/** The fields the ladder restyles in view of its own code. The dropdown is last, so its panel has room. */
const LADDER_KINDS: readonly PortalFieldKind[] = ['input', 'date', 'toggle', 'dropdown'];

function optionsOf(id: string): PortalOptionSpec[] {
  return [...(PREVIEW_FIELDS.find((field) => field.id === id)?.options ?? [])];
}

/** The page's chapters, in reading order: what paints a field, then how it is decorated, then how it behaves. */
const PARTS = [
  {
    title: 'How A Field Is Painted',
    chapters: [
      { id: 'anatomy', title: 'What Paints What' },
      { id: 'ladder', title: 'One Variable At A Time' },
      { id: 'presets', title: 'Whole Themes' }
    ]
  },
  {
    title: 'How A Field Is Decorated',
    chapters: [
      { id: 'labels', title: 'Label Positions' },
      { id: 'adornments', title: 'Adornments' }
    ]
  },
  {
    title: 'How A Field Behaves',
    chapters: [
      { id: 'states', title: 'States' },
      { id: 'panels', title: 'Panels' }
    ]
  }
];

/**
 * Every field the library ships, taught in order: what paints a field, then how it is decorated, then how it
 * behaves, with one thing differing at a time in each. The theme picker repaints the whole page with the
 * Studio's theme, any preset, or a ladder step, so every chapter can be read under every look.
 *
 * Nothing here is exported and nothing is edited. The page is a set of fixed comparisons over the Studio's own
 * sample fields, rendered by the Studio's own field renderer.
 */
@Component({
  selector: 'portal-specimen-page',
  templateUrl: './specimen-page.component.html',
  styleUrl: './specimen-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    TopBarComponent,
    ThemeScopeDirective,
    ExampleIconComponent,
    SpecimenMatrixComponent,
    PreviewFieldComponent,
    FieldDecoratorComponent,
    FieldHintDirective,
    FieldLabelDirective,
    FieldPrefixDirective,
    FieldToggleIconDirective,
    InputFieldComponent,
    DropdownFieldComponent,
    AutocompleteFieldComponent,
    DateFieldComponent
  ]
})
export class SpecimenPageComponent {
  private readonly theme = inject(ThemeStore);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly parts = PARTS.map((part, index) => ({
    ...part,
    chapters: part.chapters.map((chapter) => ({
      ...chapter,
      number:
        PARTS.slice(0, index).reduce((count, earlier) => count + earlier.chapters.length, 0) +
        part.chapters.indexOf(chapter) +
        1
    }))
  }));

  /**
   * Each preset with the number of variables it changes, which is the point of showing it. Counted as the
   * Studio's copy button counts, so a declaration that restates a default is not a change.
   */
  protected readonly presets = THEME_PRESETS.map((preset) => ({
    preset,
    count: this.theme.changesIn(presetVars(preset))
  }));
  protected readonly steps = LADDER_STEPS;
  protected readonly stepNumbers = [0, ...LADDER_STEPS.map((_, index) => index + 1)];
  protected readonly variableLink = variableLink;

  protected readonly allKinds = SPECIMEN_KINDS;
  protected readonly stateColumns = STATE_COLUMNS;
  protected readonly stateFeatured = STATE_FEATURED;
  protected readonly labelKinds = LABEL_POSITION_KINDS;
  protected readonly labelFeatured = LABEL_FEATURED;
  protected readonly adornmentKinds = ADORNMENT_KINDS;
  protected readonly adornmentFeatured = ADORNMENT_FEATURED;
  protected readonly adornmentColumns = ADORNMENT_COLUMNS;

  protected readonly formOptions = SPECIMEN_FORM_OPTIONS;
  protected readonly ladderFields = LADDER_KINDS.map((kind) => ({
    kind,
    spec: sampleSpec(kind),
    value: sampleValue(kind)
  }));

  protected readonly pizzas = optionsOf('pizza');
  protected readonly addresses = optionsOf('address');
  protected readonly markerSvg = MARKER_SVG;
  protected readonly calendarSvg = CALENDAR_SVG;

  protected readonly source = signal<ThemeSource>({ kind: 'studio' });

  /** Whether the label positions are shown over a filled field or an empty one, which is where they differ. */
  protected readonly labelsFilled = signal(false);

  protected readonly labelColumns = computed(() => labelColumns(this.labelsFilled()));

  protected readonly presetKey = computed(() => {
    const source = this.source();

    return source.kind === 'preset' ? source.key : null;
  });

  /** The theme picker's value: `studio`, a preset's key, or `ladder`, which is only offered while it is on. */
  protected readonly themeValue = computed(() => {
    const source = this.source();

    return source.kind === 'preset' ? source.key : source.kind;
  });

  protected readonly ladderStep = computed(() => {
    const source = this.source();

    return source.kind === 'ladder' ? source.step : null;
  });

  /**
   * The variables the library declares nowhere, stated as `initial` first, so a preset or the ladder does not
   * inherit them from the Studio's `:root`. The page surface travels with the theme, as it does in the Studio.
   */
  protected readonly themeVars = computed<Readonly<Record<string, string>>>(() => {
    const source = this.source();
    const cleared = Object.fromEntries([...USE_SITE_VARS, FONT_FAMILY_TOKEN].map((name) => [name, 'initial']));

    if (source.kind === 'studio') return { ...cleared, ...this.theme.resolved(), ...pageVars(this.theme.page()) };

    if (source.kind === 'ladder') {
      const applied = LADDER_STEPS.slice(0, source.step).map((step) => [step.name, step.value]);

      return { ...cleared, ...Object.fromEntries(applied), ...pageVars(LADDER_PAGE) };
    }

    const preset = PRESETS_BY_KEY.get(source.key)!;

    return { ...cleared, ...presetVars(preset), ...pageVars(preset.page) };
  });

  protected readonly caption = computed(() => {
    const step = this.ladderStep();

    if (step === null) return 'Pick a step to repaint the whole page from the library’s defaults.';

    const current = LADDER_STEPS[step - 1];

    return current
      ? `Step ${step} of ${LADDER_STEPS.length}: ${describe(current.name)}`
      : 'The library’s defaults. Nothing is set yet.';
  });

  protected readonly callouts = signal<readonly Callout[]>([]);

  private readonly figure = viewChild.required<ElementRef<HTMLElement>>('figure');
  private readonly panelStage = viewChild.required<ElementRef<HTMLElement>>('panelStage');
  private readonly dropdown = viewChild.required(DropdownFieldComponent);
  private readonly autocomplete = viewChild.required(AutocompleteFieldComponent);
  private readonly date = viewChild.required(DateFieldComponent);

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const observer = new ResizeObserver(() => this.layOutCallouts());

      observer.observe(this.figure().nativeElement);

      // The panels open themselves once their chapter is fully in view, which is also when opening one cannot
      // scroll the page: a panel only scrolls itself into view when the viewport cuts it off.
      const arrival = new IntersectionObserver(([entry]) => entry?.isIntersecting && this.openPanels(), {
        threshold: 0.9
      });

      arrival.observe(this.panelStage().nativeElement);
      destroyRef.onDestroy(() => {
        observer.disconnect();
        arrival.disconnect();
      });
    });

    // A theme can change a value without changing a size, which the observer would not see.
    afterRenderEffect(() => {
      this.themeVars();
      this.layOutCallouts();
    });
  }

  protected scrollTo(id: string): void {
    this.elementRef.nativeElement.querySelector(`#${id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  protected pickTheme(value: string): void {
    if (value === 'studio') this.source.set({ kind: 'studio' });
    else if (value !== 'ladder') this.source.set({ kind: 'preset', key: value });
  }

  protected setStep(step: number): void {
    this.source.set({ kind: 'ladder', step });
  }

  /**
   * Opens all three at once. A visitor cannot, since each click is an outside click for the other two; the
   * public `togglePanel` is not one. Deferred, because the click that asked for it closes them first.
   */
  protected openPanels(): void {
    setTimeout(() => [this.dropdown(), this.autocomplete(), this.date()].forEach((field) => field.togglePanel(true)));
  }

  private layOutCallouts(): void {
    this.callouts.set(layOutCallouts(this.figure().nativeElement));
  }
}

function presetVars(preset: ThemePreset): Record<string, string> {
  return {
    ...GEOMETRY_SCHEMES[preset.geometry],
    ...COLOR_SCHEMES[preset.color],
    ...(preset.fontFamily ? { [FONT_FAMILY_TOKEN]: preset.fontFamily } : {})
  };
}

function pageVars(page: PageSurface): Record<string, string> {
  return { '--portal-page-background': page.background, '--portal-page-text': page.text };
}

function describe(name: string): string {
  return THEME_TOKENS_BY_NAME.get(name)?.description ?? '';
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/**
 * Measures each part and puts its label level with it, pushing the labels of one side apart only as far as they
 * need to be and then centring the group on its parts. Labels and parts keep the same order, so the lines of one
 * side stay close to horizontal and do not cross.
 */
function layOutCallouts(figure: HTMLElement): Callout[] {
  const origin = figure.getBoundingClientRect();
  const field = figure.querySelector('.anatomy-field')!.getBoundingClientRect();
  const decorator = figure.querySelector('formidable-field-decorator')!;

  const measured = ANATOMY_PARTS.map((part) => {
    const element = figure.querySelector(part.selector);

    if (!element) return undefined;

    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const inset = (side: 'left' | 'right' | 'top' | 'bottom') =>
      part.content ? parseFloat(style.getPropertyValue(`padding-${side}`)) : 0;
    const left = box.left + inset('left');
    const top = box.top + inset('top');
    const width = box.width - inset('left') - inset('right');
    const height = box.height - inset('top') - inset('bottom');

    return {
      part,
      group: anatomyGroup(part.variable),
      link: variableLink(part.variable),
      value: getComputedStyle(decorator).getPropertyValue(part.variable).trim(),
      description: describe(part.variable),
      anchorX: left + part.at[0] * width - origin.left,
      anchorY: top + part.at[1] * height - origin.top,
      lineX: part.side === 'left' ? field.left - origin.left - CALLOUT_GAP : field.right - origin.left + CALLOUT_GAP
    };
  }).filter((entry) => entry !== undefined);

  return (['left', 'right'] as const).flatMap((side) => {
    const ofSide = measured.filter((entry) => entry.part.side === side).sort((a, b) => a.anchorY - b.anchorY);
    const spread = ofSide.reduce<number[]>(
      (ys, entry) => [...ys, Math.max(entry.anchorY, (ys.at(-1) ?? -Infinity) + CALLOUT_SPACING)],
      []
    );
    const shift = (sum(ofSide.map((entry) => entry.anchorY)) - sum(spread)) / ofSide.length;

    return ofSide.map((entry, index) => ({ ...entry, labelY: spread[index]! + shift }));
  });
}
