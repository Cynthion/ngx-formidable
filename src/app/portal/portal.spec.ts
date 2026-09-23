import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNgxMask } from 'ngx-mask';
import { DEFAULT_EXPORT_OPTIONS } from './export/theme-export';
import { importTheme } from './export/theme-import';
import { FIELD_KIND_LABELS } from './model/field-capabilities';
import { PREVIEW_FIELDS } from './model/preview-form.definition';
import { THEME_PRESETS } from './model/presets';
import { PortalComponent } from './portal.component';
import { PORTAL_ROUTES } from './portal.routes';
import { FormDefinitionStore } from './state/form-definition.store';
import { FormValueStore } from './state/form-value.store';
import { FormSubTab, InspectorStore, InspectorTab, ThemeSubTab } from './state/inspector.store';
import { LayoutStore } from './state/layout.store';
import { ThemeStore } from './state/theme.store';

/**
 * The portal renders, the theme reaches the page, and the chrome does not follow it.
 *
 * The insulation check is the one that cannot be read off the code: a custom property's `var()` is
 * substituted where the property is **declared**, so a theme scoped to a subtree half-applies. This asserts
 * that the chrome's re-emitted block really does recompute the derived values against its own bases.
 */
describe('portal', () => {
  let fixture: ComponentFixture<PortalComponent>;
  let root: HTMLElement;
  let theme: ThemeStore;

  function settle(): void {
    for (let i = 0; i < 3; i++) {
      fixture.detectChanges();
      tick(100);
    }
    fixture.detectChanges();
  }

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideNgxMask(), provideRouter(PORTAL_ROUTES)]
    });

    theme = TestBed.inject(ThemeStore);
    theme.reset();

    fixture = TestBed.createComponent(PortalComponent);
    root = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    document.documentElement.removeAttribute('style');
    localStorage.clear();
  });

  it('renders the three regions', fakeAsync(() => {
    settle();

    expect(root.querySelector('portal-top-bar')).toBeTruthy();
    expect(root.querySelector('portal-stage')).toBeTruthy();
    expect(root.querySelector('portal-inspector')).toBeTruthy();
  }));

  // Every field except the one its condition is currently holding back. That field is not hidden but
  // destroyed, which is the whole point of the pair — see `user/validation.md`, Conditional Fields.
  it('renders every unconditional field of the preview form, each in a decorator', fakeAsync(() => {
    settle();

    const rendered = PREVIEW_FIELDS.length - 1;

    expect(root.querySelectorAll('portal-preview-field').length).toBe(rendered);
    expect(root.querySelectorAll('formidable-field-decorator').length).toBeGreaterThanOrEqual(rendered);
  }));

  // The rule the layout cannot trade away: a component reachable only by flipping a switch is a component a
  // visitor never finds. It is what decides that the branch dropdown has a second, unconditional sibling.
  it('has every field kind on screen in the form’s default state', fakeAsync(() => {
    settle();

    const onScreen = new Set(
      Array.from(root.querySelectorAll('portal-preview-field .chip-text')).map((element) =>
        (element.textContent ?? '').trim()
      )
    );

    expect(Array.from(onScreen).sort()).toEqual(Object.values(FIELD_KIND_LABELS).sort());
  }));

  // The group is the one place the model is not flat, and it is flat unless every field registers on the
  // group rather than on the form — which the per-field component's own `ControlContainer` decides.
  it('nests a grouped section’s fields under its group name in the model', fakeAsync(() => {
    settle();

    const model = TestBed.inject(FormValueStore).model() as Record<string, unknown>;
    const when = model['when'] as Record<string, unknown>;

    expect(when).toBeTruthy();
    expect(when['date'] instanceof Date).toBeTrue();
    expect(when['time'] instanceof Date).toBeTrue();
    expect(model['date']).toBeUndefined();
  }));

  // The group rule reads both members and reports on neither, so its message has to land on the group.
  it('reports a group rule under the group rather than under either field', fakeAsync(() => {
    settle();

    const values = TestBed.inject(FormValueStore);

    // 02:00 is outside the opening hours the group rule states; neither field is wrong on its own.
    const when = values.model()['when'] as Record<string, unknown>;
    values.setModel({ ...values.model(), when: { ...when, time: new Date(2000, 0, 1, 2, 0) } });
    settle();

    expect(values.errors()['when']).toEqual(['We are open from 11:00 to 23:00.']);
    expect(values.errors()['when.time']).toBeUndefined();
  }));

  // One toggle, two fields, one each way. The hidden one is destroyed with its control, so its key leaves
  // the model entirely — which is what the rules have to survive and what `omitWhen` is there for.
  it('swaps the two conditional fields when the toggle moves, and moves the key with them', fakeAsync(() => {
    settle();

    const values = TestBed.inject(FormValueStore);
    const names = (): string[] =>
      Array.from(root.querySelectorAll('portal-preview-field')).map(
        (element) => element.querySelector('[name]')?.getAttribute('name') ?? ''
      );

    expect(names()).toContain('address');
    expect(names()).not.toContain('branch');
    expect(values.model()['address']).toBe('langstrasse');
    expect(values.model()['branch']).toBeUndefined();

    values.setModel({ ...values.model(), pickup: true });
    settle();

    expect(names()).toContain('branch');
    expect(names()).not.toContain('address');
    expect(values.model()['address']).toBeUndefined();

    // The crust is the reason the swap is workable: the dropdown never leaves the form with the branch.
    expect(names()).toContain('crust');
  }));

  // The template picker: choosing a pizza writes the two fields it stands for and leaves every other alone,
  // and a later edit to one of those fields is not undone — a pizza is a starting point, not a lock.
  it('applies a pizza’s preset when the picker moves, and does not re-apply it afterwards', fakeAsync(() => {
    settle();

    const values = TestBed.inject(FormValueStore);

    expect(values.model()['sauce']).toBe('tomato');
    expect(values.model()['toppings']).toEqual(['mozzarella', 'basil']);

    values.setModel({ ...values.model(), pizza: 'diavola' });
    settle();

    expect(values.model()['sauce']).toBe('arrabbiata');
    expect(values.model()['toppings']).toEqual(['mozzarella', 'salami', 'chilli']);
    // Untouched by the preset, which patches only the keys it names.
    expect(values.model()['size']).toBe('large');

    values.setModel({ ...values.model(), sauce: 'pesto' });
    settle();

    expect(values.model()['sauce']).toBe('pesto');
  }));

  it('leaves the model alone for an option that carries no preset', fakeAsync(() => {
    settle();

    const values = TestBed.inject(FormValueStore);

    values.setModel({ ...values.model(), sauce: 'bbq', pizza: 'custom' });
    settle();

    expect(values.model()['sauce']).toBe('bbq');
    expect(values.model()['toppings']).toEqual(['mozzarella', 'basil']);
  }));

  // The second group, and a condition reading into it: `visibleWhen` names `method`, which the model holds
  // at `payment.method`.
  it('nests the payment group and resolves its conditional field through it', fakeAsync(() => {
    settle();

    const values = TestBed.inject(FormValueStore);
    const payment = (): Record<string, unknown> => values.model()['payment'] as Record<string, unknown>;
    const names = (): string[] =>
      Array.from(root.querySelectorAll('portal-preview-field')).map(
        (element) => element.querySelector('[name]')?.getAttribute('name') ?? ''
      );

    expect(payment()['method']).toBe('card');
    expect(payment()['cardNumber']).toBe('4242 4242 4242 4242');
    expect(names()).toContain('cardNumber');

    values.setModel({ ...values.model(), payment: { ...payment(), method: 'twint' } });
    settle();

    expect(names()).not.toContain('cardNumber');
    expect(payment()['cardNumber']).toBeUndefined();
  }));

  it('starts pre-filled, so the filled and floating-label states are on screen from the first frame', fakeAsync(() => {
    settle();

    const values = TestBed.inject(FormValueStore);

    expect(values.filledCount()).toBeGreaterThan(values.fieldCount() / 2);
  }));

  it('renders a live miniature of a real field for every preset', fakeAsync(() => {
    settle();

    const thumbnails = root.querySelectorAll('.portal-theme-scope');

    expect(thumbnails.length).toBe(THEME_PRESETS.length);
    expect(thumbnails[0]?.querySelector('formidable-input-field')).toBeTruthy();
  }));

  /**
   * The variables `USE_SITE_VARS` names are declared nowhere, so nothing masks them by inheritance and the
   * `:root` theme reaches straight into every thumbnail. Applying a preset that sets one used to repaint
   * the other eleven with it.
   */
  it('keeps every preset thumbnail on its own theme when another preset is applied', fakeAsync(() => {
    settle();

    const radius = (index: number): string => {
      const thumbnail = root.querySelectorAll('.portal-theme-scope')[index] as HTMLElement;
      const field = thumbnail.querySelector('formidable-input-field .field') as HTMLElement;

      return getComputedStyle(field).borderStartStartRadius;
    };

    // `outlined`, which says nothing about its corners, next to `tab`, which rounds the top two to 18px.
    const outlined = THEME_PRESETS.findIndex((preset) => preset.geometry === 'outlined');
    const tab = THEME_PRESETS.findIndex((preset) => preset.geometry === 'tab');

    theme.applyPreset(THEME_PRESETS.find((preset) => preset.geometry === 'pill')!);
    settle();
    const before = radius(outlined);

    theme.applyPreset(THEME_PRESETS[tab]!);
    settle();

    expect(radius(tab)).toBe('18px');
    expect(radius(outlined)).toBe(before);
    expect(radius(outlined)).not.toBe('18px');
  }));

  it('writes the theme to `:root`, where the derived variables are declared', fakeAsync(() => {
    settle();

    theme.setVariable('--formidable-field-height', '80px');
    settle();

    expect(document.documentElement.style.getPropertyValue('--formidable-field-height')).toBe('80px');
  }));

  it('recomputes a derived variable from the theme on the page', fakeAsync(() => {
    settle();

    theme.setVariable('--formidable-field-height', '80px');
    theme.setVariable('--formidable-field-border-thickness', '5px');
    settle();

    // Declared once in `:root` as `height - 2 * border`, so it only follows if the theme is written there.
    const inner = getComputedStyle(document.documentElement).getPropertyValue('--formidable-field-inner-height');

    expect(inner).toContain('80px');
    expect(inner).toContain('5px');
  }));

  it('insulates the chrome from the theme, derived variables included', fakeAsync(() => {
    settle();

    theme.setVariable('--formidable-field-height', '80px');
    settle();

    const chrome = root.querySelector('.portal-chrome') as HTMLElement;
    const chromeInner = getComputedStyle(chrome).getPropertyValue('--formidable-field-inner-height');

    expect(chrome).toBeTruthy();
    expect(getComputedStyle(chrome).getPropertyValue('--formidable-field-height')).not.toContain('80px');
    expect(chromeInner).not.toContain('80px');
  }));

  it('removes a variable that leaves the theme instead of leaving it applied', fakeAsync(() => {
    settle();

    theme.setVariable('--formidable-field-padding-x', '40px');
    settle();
    expect(document.documentElement.style.getPropertyValue('--formidable-field-padding-x')).toBe('40px');

    theme.clearVariable('--formidable-field-padding-x');
    settle();

    expect(document.documentElement.style.getPropertyValue('--formidable-field-padding-x')).not.toBe('40px');
  }));

  it('reads the library default at runtime rather than storing one', fakeAsync(() => {
    settle();

    // The shipped default, straight off the probe that re-emits the library's own block. The token is
    // authored in `rem`, so this is the value the stylesheet actually emits rather than a restatement of it.
    expect(theme.defaultOf('--formidable-field-height')).toBe('3.5rem');

    theme.setVariable('--formidable-field-height', '80px');
    settle();

    expect(theme.defaultOf('--formidable-field-height')).toBe('3.5rem');
    expect(theme.valueOf('--formidable-field-height')).toBe('80px');
  }));

  it('resolves the default of a variable that is declared nowhere through the one it follows', fakeAsync(() => {
    settle();

    expect(theme.defaultOf('--formidable-field-border-start-start-radius')).toBe(
      theme.defaultOf('--formidable-field-border-radius')
    );
  }));

  it('counts exactly the variables the export carries', fakeAsync(() => {
    settle();

    theme.applyPreset(THEME_PRESETS[2]!);
    settle();

    const exported = importTheme(theme.exportText());

    expect(Object.keys(exported.vars).length).toBe(Object.keys(theme.changedVars()).length);
    expect(theme.changeCount()).toBeGreaterThanOrEqual(Object.keys(exported.vars).length);
  }));

  /**
   * What the stage's own field paints. Measured rather than compared as declarations, because the export
   * drops what only restates a default and the two can say the same thing differently — `1px` against the
   * shipped `0.0625rem`, a hex against an `rgb()`. Those are not a difference in the view, and the view is
   * the claim.
   */
  function painted(): Record<string, string> {
    const field = root.querySelector('portal-stage formidable-input-field .field') as HTMLElement;
    const style = getComputedStyle(field);
    const properties = [
      'height',
      'backgroundColor',
      'color',
      'fontSize',
      'borderTopWidth',
      'borderTopColor',
      'borderStartStartRadius',
      'boxShadow',
      'paddingLeft'
    ];

    return Object.fromEntries(properties.map((property) => [property, String(style[property as never])]));
  }

  it('reproduces the theme when the delta is read back onto the defaults', fakeAsync(() => {
    settle();

    theme.exportOptions.set({ ...DEFAULT_EXPORT_OPTIONS, includePageSurface: true });
    theme.applyPreset(THEME_PRESETS.find((preset) => preset.key === 'consumer')!);
    settle();

    const block = theme.exportText();
    const before = painted();

    theme.applyPreset(THEME_PRESETS.find((preset) => preset.key === 'brutalist')!);
    settle();
    expect(painted()).not.toEqual(before);

    // The bug this pins: the delta states only what differs from the library's defaults, so merged onto
    // another scheme every value that scheme sets and the delta does not restate survives into the result.
    theme.importFrom(block, false);
    settle();
    expect(painted()).not.toEqual(before);

    theme.importFrom(block, true);
    settle();

    expect(painted()).toEqual(before);
    expect(theme.page()).toEqual(THEME_PRESETS.find((preset) => preset.key === 'consumer')!.page);
    expect(theme.fontFamily()).toBe(THEME_PRESETS.find((preset) => preset.key === 'consumer')!.fontFamily);
  }));

  // The other half of the pair: a block that states the defaults outright needs no help on the way in. Every
  // preset, because the hazard is per-variable — a scheme states a base and leaves what follows it unsaid,
  // and a default written over that base would contradict it.
  it('reproduces every preset when the block states the defaults and is merged in', fakeAsync(() => {
    settle();

    theme.exportOptions.set({ ...DEFAULT_EXPORT_OPTIONS, includeDefaults: true, includePageSurface: true });

    for (const preset of THEME_PRESETS) {
      theme.applyPreset(preset);
      settle();

      const block = theme.exportText();
      const before = painted();

      theme.applyPreset(THEME_PRESETS.find((other) => other.key !== preset.key)!);
      settle();

      theme.importFrom(block, false);
      settle();

      expect(painted()).withContext(preset.key).toEqual(before);
    }
  }));

  // The counter is the page's primary claim: eight to twelve variables are enough. It has to start at the
  // bottom, or it says the opposite the moment the page paints.
  it('counts nothing for a theme that only restates the library defaults', fakeAsync(() => {
    settle();

    const shipped = THEME_PRESETS.find((preset) => preset.key === 'enterprise')!;
    theme.applyPreset(shipped);
    settle();

    expect(theme.changedVars()).toEqual({});
    expect(theme.changeCount()).toBe(0);
  }));

  it('compares against the default through the browser, not as text', fakeAsync(() => {
    settle();

    // The shipped height is `3.5rem` in the stylesheet and `56px` in the scheme. Same length, same theme.
    theme.setVariable('--formidable-field-height', '56px');
    settle();
    expect(theme.changedVars()['--formidable-field-height']).toBeUndefined();

    theme.setVariable('--formidable-field-height', '57px');
    settle();
    expect(theme.changedVars()['--formidable-field-height']).toBe('57px');
  }));

  it('counts the page surface and the family alongside the variables', fakeAsync(() => {
    settle();

    theme.applyPreset(THEME_PRESETS.find((preset) => preset.key === 'enterprise')!);
    settle();
    expect(theme.changeCount()).toBe(0);

    theme.page.set({ background: '#101010', text: '#f0f0f0' });
    settle();

    expect(theme.changeCount()).toBe(1);
  }));

  it('measures contrast against what the page actually paints', fakeAsync(() => {
    settle();

    theme.setVariables({
      '--formidable-color-field-background': '#ffffff',
      '--formidable-color-field-text': '#000000'
    });
    settle();

    const text = theme.contrastChecks().find((check) => check.token === '--formidable-color-field-text');

    expect(text?.ratio).toBeGreaterThan(20);
    expect(text?.passes).toBe(true);
  }));

  it('fails the badge for a fill the text cannot be read on', fakeAsync(() => {
    settle();

    theme.setVariables({
      '--formidable-color-field-background': '#ffffff',
      '--formidable-color-field-text': '#f2f2f2'
    });
    settle();

    const text = theme.contrastChecks().find((check) => check.token === '--formidable-color-field-text');

    expect(text?.passes).toBe(false);
  }));

  // A chip names one field, so it has to land on that field's own scope — the two wider ones would answer
  // a question the chip did not ask.
  it('opens the editor panel at the Settings tab, at the field’s own scope, when a chip is used', fakeAsync(() => {
    settle();

    const inspector = TestBed.inject(InspectorStore);
    inspector.tab.set('theme');
    inspector.fieldScope.set('form');

    const chip = root.querySelector('portal-preview-field .chip') as HTMLElement;
    chip.click();
    settle();

    expect(inspector.tab()).toBe('form');
    expect(inspector.formTab()).toBe('settings');
    expect(inspector.fieldScope()).toBe('field');
    expect(root.querySelector('portal-field-editor')).toBeTruthy();
  }));

  // Tabbing through the sample form is the thing being tested; a chip between every two fields doubles the
  // presses it takes and puts portal chrome in the middle of the run.
  it('keeps the chips out of the tab order', fakeAsync(() => {
    settle();

    const chips = Array.from(root.querySelectorAll('portal-preview-field .chip'));

    expect(chips.length).toBeGreaterThan(0);
    expect(chips.every((chip) => chip.getAttribute('tabindex') === '-1')).toBeTrue();
  }));

  // Moving to a tab behind a collapsed panel changes nothing the user can see, so the move has to open it.
  it('expands a collapsed editor panel rather than moving a tab behind it', fakeAsync(() => {
    settle();

    const inspector = TestBed.inject(InspectorStore);
    const layout = TestBed.inject(LayoutStore);

    inspector.tab.set('theme');
    layout.inspectorCollapsed.set(true);
    settle();

    const chip = root.querySelector('portal-preview-field .chip') as HTMLElement;
    chip.click();
    settle();

    expect(layout.inspectorCollapsed()).toBeFalse();
    expect(inspector.formTab()).toBe('settings');
    expect(root.querySelector('portal-field-editor')).toBeTruthy();
  }));

  // The chip names the component rather than describing the configuration, because a description written
  // once cannot survive the field being edited — and says nothing at all about a field added later.
  it('names the component under every field, including one added in the structure editor', fakeAsync(() => {
    settle();

    const texts = Array.from(root.querySelectorAll('portal-preview-field .chip-text')).map((element) =>
      (element.textContent ?? '').trim()
    );

    expect(texts.length).toBe(PREVIEW_FIELDS.length - 1);
    expect(texts).toContain('Date');
    expect(texts.every((text) => Object.values(FIELD_KIND_LABELS).includes(text))).toBeTrue();

    TestBed.inject(FormDefinitionStore).addField('radio-group', 'pizza');
    settle();

    const added = Array.from(root.querySelectorAll('portal-preview-field .chip-text')).map((element) =>
      (element.textContent ?? '').trim()
    );

    expect(added.length).toBe(PREVIEW_FIELDS.length);
    expect(added.every((text) => Object.values(FIELD_KIND_LABELS).includes(text))).toBeTrue();
  }));

  // The defect this replaces: the chip held a string, so editing the field left it stating the old value.
  it('restates what a field is set to once the field has been edited', fakeAsync(() => {
    settle();

    const store = TestBed.inject(FormDefinitionStore);
    const tipFor = (id: string): string => {
      const tip = root.querySelector(`#chip-tip-${id}`) as HTMLElement;

      return (tip.textContent ?? '').trim();
    };

    // The chip names it as its accessible description, exactly as the `title` it replaced did. No `title`
    // anywhere on the run of them: the browser holds one back about a second, which is what this is not.
    const chip = root.querySelector('portal-preview-field .chip') as HTMLElement;
    expect(chip.getAttribute('aria-describedby')).toBe('chip-tip-pizza');
    expect(Array.from(root.querySelectorAll('portal-preview-field .chip[title]')).length).toBe(0);

    expect(tipFor('date')).toContain('panelPosition: right');

    store.updateField('date', { panelPosition: 'sheet' });
    settle();

    expect(tipFor('date')).toContain('panelPosition: sheet');
    expect(tipFor('date')).not.toContain('panelPosition: right');
  }));

  // The two column headers sit side by side, so a difference between them reads as a step in the rule under
  // them. Read off the rules rather than the layout: the runner's viewport is below the two-column
  // breakpoint, where the stage bar wraps to two rows and the columns are stacked, so measuring there would
  // be measuring the wrong mode.
  it('gives the two column headers one height', fakeAsync(() => {
    settle();

    const declaredHeights = (selector: string): string[] =>
      Array.from(document.styleSheets)
        .flatMap((sheet) => Array.from(sheet.cssRules))
        .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule)
        .filter((rule) => rule.selectorText.includes(selector))
        .map((rule) => rule.style.height)
        .filter(Boolean);

    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--portal-section-header-height').trim()
    ).toBeTruthy();

    for (const selector of ['.stage-bar', '.head']) {
      expect(declaredHeights(selector)).withContext(selector).toContain('var(--portal-section-header-height)');
    }
  }));

  // The tabs say what the panel is, so a title row over them would only add the word "Inspector" — which
  // names a panel that edits rather than inspects, and costs a row of the height the bottom sheet is short of.
  it('makes the tab strip the editor panel’s header', fakeAsync(() => {
    settle();

    const head = root.querySelector('portal-inspector .head') as HTMLElement;

    expect(head.querySelector('[role="tablist"]')).toBeTruthy();
    expect(head.textContent).not.toContain('Inspector');
    expect(head.querySelector('.collapse')).toBeTruthy();
  }));

  // Four tabs and three sub-tabs is the navigation a visitor has to learn, so every one of them has to
  // actually render something — an empty tab is worse than no tab.
  it('renders each inspector tab', fakeAsync(() => {
    settle();

    const inspector = TestBed.inject(InspectorStore);
    const expected: [InspectorTab, string][] = [
      ['theme', 'portal-theme-tab'],
      ['form', 'portal-form-tab'],
      ['export', 'portal-export-tab']
    ];

    for (const [tab, selector] of expected) {
      inspector.tab.set(tab);
      settle();

      expect(root.querySelector(selector)).withContext(tab).toBeTruthy();
    }
  }));

  it('renders each of the theme sub-tabs', fakeAsync(() => {
    settle();

    const inspector = TestBed.inject(InspectorStore);
    const expected: [ThemeSubTab, string][] = [
      ['design', 'portal-preset-gallery'],
      ['variables', 'portal-all-variables']
    ];

    for (const [subTab, selector] of expected) {
      inspector.tab.set('theme');
      inspector.themeTab.set(subTab);
      settle();

      expect(root.querySelector(selector)).withContext(subTab).toBeTruthy();
    }
  }));

  // Structure before Fields: which fields exist has to be settled before what one of them is is worth saying.
  it('offers the form sub-tabs in build order, starting on Structure', fakeAsync(() => {
    settle();

    TestBed.inject(InspectorStore).tab.set('form');
    settle();

    const labels = Array.from(root.querySelectorAll('portal-form-tab .sub-tab')).map((el) =>
      (el.textContent ?? '').trim()
    );

    expect(labels).toEqual(['Structure', 'Settings']);
    expect(root.querySelector('portal-structure-tab')).toBeTruthy();
  }));

  it('renders each of the form sub-tabs', fakeAsync(() => {
    settle();

    const inspector = TestBed.inject(InspectorStore);
    const expected: [FormSubTab, string][] = [
      ['settings', 'portal-settings-tab'],
      ['structure', 'portal-structure-tab']
    ];

    for (const [subTab, selector] of expected) {
      inspector.tab.set('form');
      inspector.formTab.set(subTab);
      settle();

      expect(root.querySelector(selector)).withContext(subTab).toBeTruthy();
    }
  }));

  /**
   * Scope is a control, not the wording of three headings. Each position has to render its own editor and
   * only its own — the defect the three sibling accordions had was the same Decoration group on screen
   * twice, under names that had to be read to be told apart.
   */
  it('gives the Settings half one editor per scope, and only one', fakeAsync(() => {
    settle();

    const inspector = TestBed.inject(InspectorStore);
    inspector.tab.set('form');
    inspector.formTab.set('settings');
    settle();

    const labels = Array.from(root.querySelectorAll('portal-settings-tab .scope-option-label')).map((el) =>
      (el.textContent ?? '').trim()
    );

    expect(labels).toEqual(['The Form', 'All Fields', 'This Field']);

    const panels = ['portal-form-settings', 'portal-all-fields', 'portal-field-editor'];

    for (const [index, scope] of (['form', 'all', 'field'] as const).entries()) {
      (root.querySelectorAll<HTMLElement>('portal-settings-tab .scope-option')[index] as HTMLElement).click();
      settle();

      expect(inspector.fieldScope()).withContext(scope).toBe(scope);
      expect(panels.filter((selector) => root.querySelector(selector)))
        .withContext(scope)
        .toEqual([panels[index]!]);
    }
  }));

  // The picker governs one scope, so it belongs inside it. Above the switch it was the first control on the
  // page and reached nothing a visitor could see.
  it('shows the field picker only at the field scope', fakeAsync(() => {
    settle();

    const inspector = TestBed.inject(InspectorStore);
    inspector.tab.set('form');
    inspector.formTab.set('settings');

    inspector.fieldScope.set('all');
    settle();
    expect(root.querySelector('#ft-select')).toBeNull();

    inspector.fieldScope.set('field');
    settle();
    expect(root.querySelector('#ft-select')).toBeTruthy();
  }));

  // The three steps are the answer to "how do I make my own form?", which the old one-accordion-per-section
  // list never asked, let alone answered.
  it('walks Structure from where a form starts to how it grows', fakeAsync(() => {
    settle();

    const inspector = TestBed.inject(InspectorStore);
    inspector.tab.set('form');
    inspector.formTab.set('structure');
    settle();

    const headings = Array.from(root.querySelectorAll('portal-structure-tab portal-accordion .title')).map((el) =>
      (el.textContent ?? '').trim()
    );

    expect(headings).toEqual(['Start', 'Sections And Fields', 'Add']);
  }));

  it('starts a blank form and lands on the step that can fill it', fakeAsync(() => {
    settle();

    const inspector = TestBed.inject(InspectorStore);
    const definition = TestBed.inject(FormDefinitionStore);
    inspector.tab.set('form');
    inspector.formTab.set('structure');
    settle();

    expect(definition.fields().length).toBe(PREVIEW_FIELDS.length);

    // Step 1 is closed on arrival, so open it the way a visitor would.
    (root.querySelectorAll<HTMLElement>('portal-structure-tab portal-accordion .trigger')[0] as HTMLElement).click();
    settle();
    (root.querySelector('portal-structure-tab .start') as HTMLElement).click();
    settle();

    expect(definition.fields()).toEqual([]);
    // One section, not none: every add needs somewhere to add into.
    expect(definition.sections().length).toBe(1);
    // Adding is the only thing left to do, so that is the step that is open.
    expect(root.querySelector('portal-structure-tab .add-row')).toBeTruthy();

    const addField = () =>
      (root.querySelectorAll<HTMLElement>('portal-structure-tab .add-row .pc-button')[0] as HTMLElement).click();

    // Twice: building a form is a run of adds, so the step has to survive the first one.
    addField();
    settle();
    addField();
    settle();

    expect(definition.fields().length).toBe(2);
    // The stage stops claiming to be the sample: heading, intro and submit label all come from the form.
    expect((root.querySelector('.form-header h1') as HTMLElement).textContent?.trim()).toBe('Your Form');
    expect(root.querySelector('.form-header p')).toBeNull();
    expect((root.querySelector('.submit') as HTMLElement).textContent?.trim()).toBe('Submit');
  }));

  it('sends the third way to start to the box a form is pasted into', fakeAsync(() => {
    settle();

    const inspector = TestBed.inject(InspectorStore);
    inspector.tab.set('form');
    inspector.formTab.set('structure');
    settle();

    (root.querySelectorAll<HTMLElement>('portal-structure-tab portal-accordion .trigger')[0] as HTMLElement).click();
    settle();
    (root.querySelectorAll<HTMLElement>('portal-structure-tab .start')[2] as HTMLElement).click();
    settle();

    // Not merely the form half: the box a form goes into, rather than the block that comes out of it.
    expect(inspector.tab()).toBe('export');
    expect(inspector.exportSection()).toBe('form');

    const open = Array.from(root.querySelectorAll('portal-export-tab portal-accordion .trigger')).filter(
      (el) => el.getAttribute('aria-expanded') === 'true'
    );

    expect(open.length).toBe(1);
    expect((open[0]?.textContent ?? '').trim()).toContain('Import');
    expect(root.querySelector('portal-markup-panel .pc-textarea')).toBeTruthy();
  }));

  it('names the tab for both directions it goes in', fakeAsync(() => {
    settle();

    const labels = Array.from(root.querySelectorAll('portal-inspector .tab')).map((el) =>
      (el.textContent ?? '').trim()
    );

    expect(labels).toEqual(['Theme', 'Form', 'Import & Export']);
  }));

  // Two halves, navigated the way the other two areas are: the same strip in the same place on all three.
  it('splits the two round trips into sub-tabs, one showing at a time', fakeAsync(() => {
    settle();

    const inspector = TestBed.inject(InspectorStore);
    inspector.tab.set('export');
    settle();

    const labels = Array.from(root.querySelectorAll('portal-export-tab .sub-tab')).map((el) =>
      (el.textContent ?? '').trim()
    );

    expect(labels).toEqual(['Theme', 'Form']);

    expect(root.querySelector('portal-theme-panel')).toBeTruthy();
    expect(root.querySelector('portal-markup-panel')).toBeNull();

    (root.querySelectorAll<HTMLElement>('portal-export-tab .sub-tab')[1] as HTMLElement).click();
    settle();

    expect(inspector.exportSection()).toBe('form');
    expect(root.querySelector('portal-markup-panel')).toBeTruthy();
    expect(root.querySelector('portal-theme-panel')).toBeNull();
  }));

  // Both halves are a round trip, so both say so the same way: the pair of headings is the same on each and
  // a reader who has learned one half has learned the other.
  it('gives both halves the same two directions', fakeAsync(() => {
    settle();

    const inspector = TestBed.inject(InspectorStore);
    const headings = () =>
      Array.from(root.querySelectorAll('portal-export-tab portal-accordion .title')).map((el) =>
        (el.textContent ?? '').trim()
      );

    inspector.openExport('theme');
    settle();
    expect(headings()).toEqual(['Export', 'Import']);

    inspector.openExport('form');
    settle();
    expect(headings()).toEqual(['Export', 'Import']);
  }));

  // The theme half can be put back to the shipped default; the form half needs the same way out of a form
  // the user has taken apart, or the two are only symmetric to look at.
  it('offers a reset beside the copy in both halves', fakeAsync(() => {
    settle();

    const inspector = TestBed.inject(InspectorStore);
    const definition = TestBed.inject(FormDefinitionStore);

    inspector.openExport('theme');
    settle();
    expect(root.querySelector('portal-theme-panel .pc-button.is-quiet')?.textContent?.trim()).toBe('Reset Theme');

    inspector.openExport('form');
    settle();

    definition.removeField(PREVIEW_FIELDS[0]!.id);
    settle();
    expect(definition.fields().length).toBe(PREVIEW_FIELDS.length - 1);

    const reset = root.querySelector('portal-markup-panel .pc-button.is-quiet') as HTMLElement;
    expect(reset.textContent?.trim()).toBe('Reset Form');

    reset.click();
    settle();

    expect(definition.fields().length).toBe(PREVIEW_FIELDS.length);
  }));

  // The template binds names only a component defines, so the component sits beside it rather than in a
  // third top-bar group of its own.
  it('offers the component beside the template', fakeAsync(() => {
    settle();

    TestBed.inject(InspectorStore).openExport('form');
    settle();

    const blocks = root.querySelectorAll('portal-markup-panel pre.markup');
    const buttons = Array.from(root.querySelectorAll('portal-markup-panel .pc-button')).map((el) =>
      (el.textContent ?? '').trim()
    );

    expect(blocks.length).toBe(2);
    expect(blocks[0]?.textContent).toContain('<form');
    expect(blocks[1]?.textContent).toContain('export class MyFormComponent');
    expect(buttons).toEqual(['Copy Template', 'Reset Form', 'Copy Component']);
  }));

  // All three areas carry the same second level, so the strip is learned once rather than per tab.
  it('gives every area the same two-half strip', fakeAsync(() => {
    settle();

    const inspector = TestBed.inject(InspectorStore);
    const expected: [InspectorTab, string[]][] = [
      ['theme', ['Design', 'Variables']],
      ['form', ['Structure', 'Settings']],
      ['export', ['Theme', 'Form']]
    ];

    for (const [tab, labels] of expected) {
      inspector.tab.set(tab);
      settle();

      const rendered = Array.from(root.querySelectorAll('portal-inspector .sub-tab')).map((el) =>
        (el.textContent ?? '').trim()
      );

      expect(rendered).withContext(tab).toEqual(labels);
    }
  }));

  it('opens one accordion section at a time', fakeAsync(() => {
    settle();

    const headers = () => Array.from(root.querySelectorAll<HTMLElement>('portal-accordion .trigger'));
    const openCount = () => headers().filter((header) => header.getAttribute('aria-expanded') === 'true').length;

    expect(openCount()).toBe(1);

    headers()[2]!.click();
    settle();

    expect(openCount()).toBe(1);
  }));

  it('hides the chips when the stage says so', fakeAsync(() => {
    settle();
    const layout = TestBed.inject(LayoutStore);

    layout.showFieldTypes.set(true);
    settle();
    expect(root.querySelectorAll('portal-preview-field .chip').length).toBeGreaterThan(0);

    layout.showFieldTypes.set(false);
    settle();
    expect(root.querySelectorAll('portal-preview-field .chip').length).toBe(0);
  }));

  // Two fields sharing a grid row are rarely the same height — one carries a hint or an error and the other
  // does not — and the annotations under them are what a reader compares across the row. They line up
  // because each field lays its three rows out as a subgrid of the field grid, not because anything pushes
  // them to the bottom of the row, which staggers them again as soon as one readout is taller.
  it('starts the chip and the accessibility readout of a pair on the same line', fakeAsync(() => {
    settle();
    const layout = TestBed.inject(LayoutStore);

    layout.showFieldTypes.set(true);
    layout.showAccessibility.set(true);
    settle();

    // Below 900px the grid is one column, where a pair has no row to share. The banding is what is under
    // test, not the breakpoint that suspends it, so the columns are stated here.
    for (const grid of Array.from(root.querySelectorAll<HTMLElement>('.field-grid'))) {
      grid.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
    }
    settle();

    const top = (element: Element) => element.getBoundingClientRect().top;
    const hasHint = (host: Element) => !host.querySelector('.hint-wrapper')?.classList.contains('hidden');
    const hosts = Array.from(root.querySelectorAll('portal-preview-field'));

    // The pair has to be uneven, or they would line up by accident and prove nothing. Their rendered
    // heights cannot say so — the bands equalize them, which is the thing under test — so the hint one of
    // them carries is what states it.
    const pair = hosts.slice(1).find((host, index) => {
      const previous = hosts[index]!;

      return top(host) === top(previous) && hasHint(host) !== hasHint(previous);
    });

    expect(pair).withContext('a row holding two fields of unequal height').toBeTruthy();

    const first = hosts[hosts.indexOf(pair!) - 1]!;

    expect(top(pair!.querySelector('.chip-row')!)).toBeCloseTo(top(first.querySelector('.chip-row')!), 0);
    expect(top(pair!.querySelector('portal-accessibility-readout')!)).toBeCloseTo(
      top(first.querySelector('portal-accessibility-readout')!),
      0
    );
  }));

  // The stage is a fixed three-row grid, so an optional child of it shifts every row below — which once
  // pushed the drawer off the bottom of the viewport. Whatever the switches add has to stay inside the
  // head, leaving the head, the preview viewport and the drawer as the only three rows.
  it('keeps the model drawer in the last row whatever the stage is showing', fakeAsync(() => {
    settle();
    const layout = TestBed.inject(LayoutStore);

    for (const chips of [false, true]) {
      for (const accessibility of [false, true]) {
        layout.showFieldTypes.set(chips);
        layout.showAccessibility.set(accessibility);
        settle();

        const stage = root.querySelector('portal-stage') as HTMLElement;
        const children = Array.from(stage.children);
        const context = `chips ${chips}, accessibility ${accessibility}`;

        expect(children.length).withContext(context).toBe(3);
        expect(children[0]?.classList).withContext(context).toContain('stage-head');
        expect(children[1]?.classList).withContext(context).toContain('stage-viewport');
        expect(children[2]?.tagName.toLowerCase()).withContext(context).toBe('portal-model-drawer');
      }
    }
  }));

  it('states each annotation on its own line, and only while it is on', fakeAsync(() => {
    settle();
    const layout = TestBed.inject(LayoutStore);
    const lines = () => root.querySelectorAll('portal-stage .stage-status').length;

    layout.showFieldTypes.set(false);
    layout.showAccessibility.set(false);
    settle();
    expect(lines()).toBe(0);

    layout.showFieldTypes.set(true);
    settle();
    expect(lines()).toBe(1);

    layout.showAccessibility.set(true);
    settle();
    expect(lines()).toBe(2);
  }));

  it('takes the inspector width from the layout store', fakeAsync(() => {
    settle();

    const layout = TestBed.inject(LayoutStore);
    layout.setInspectorWidth(640);
    settle();

    const inspector = root.querySelector('portal-inspector') as HTMLElement;

    expect(inspector.style.width).toBe('640px');
  }));

  // A `sheet` panel is `position: fixed`, and the page it belongs to ends at the preview's edges. Without a
  // containing block on the preview viewport it spans the browser window instead, which puts it off-centre
  // and half under the inspector.
  it('pins a fixed child of the preview to the stage rather than to the window', fakeAsync(() => {
    settle();

    const viewport = root.querySelector('.stage-viewport') as HTMLElement;
    const probe = document.createElement('div');

    probe.style.cssText = 'position: fixed; inset: auto 0 0; height: 10px';
    viewport.appendChild(probe);

    const stage = viewport.getBoundingClientRect();
    const pinned = probe.getBoundingClientRect();

    probe.remove();

    // Guards the assertions below against passing on a preview that happens to fill the window.
    expect(stage.bottom).toBeLessThan(window.innerHeight);

    expect(pinned.left).toBeCloseTo(stage.left, 0);
    expect(pinned.right).toBeCloseTo(stage.right, 0);
    expect(pinned.bottom).toBeCloseTo(stage.bottom, 0);
  }));

  it('keeps the inspector above the library’s own sheet z-index', fakeAsync(() => {
    settle();

    const inspector = root.querySelector('portal-inspector') as HTMLElement;
    const sheet = Number(
      getComputedStyle(document.documentElement).getPropertyValue('--formidable-sheet-z-index').trim()
    );

    expect(Number(getComputedStyle(inspector).zIndex)).toBeGreaterThan(sheet);
  }));

  it('applies the mask the settings give a textarea', fakeAsync(() => {
    settle();

    TestBed.inject(FormDefinitionStore).updateField('notes', { mask: '000-000' });
    settle();

    const textarea = root.querySelector('formidable-textarea-field textarea') as HTMLTextAreaElement;

    textarea.value = '123456';
    textarea.dispatchEvent(new Event('input'));
    settle();

    expect(textarea.value).toBe('123-456');
  }));
});
