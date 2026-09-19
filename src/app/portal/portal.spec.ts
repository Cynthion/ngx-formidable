import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNgxMask } from 'ngx-mask';
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

  it('renders every field of the preview form, each in a decorator', fakeAsync(() => {
    settle();

    expect(root.querySelectorAll('portal-preview-field').length).toBe(PREVIEW_FIELDS.length);
    expect(root.querySelectorAll('formidable-field-decorator').length).toBeGreaterThanOrEqual(PREVIEW_FIELDS.length);
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

  it('opens the editor panel at the Fields tab when a chip is used', fakeAsync(() => {
    settle();

    const inspector = TestBed.inject(InspectorStore);
    inspector.tab.set('theme');

    const chip = root.querySelector('portal-preview-field .chip') as HTMLElement;
    chip.click();
    settle();

    expect(inspector.tab()).toBe('form');
    expect(inspector.formTab()).toBe('fields');
    expect(root.querySelector('portal-field-editor')).toBeTruthy();
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
    expect(inspector.formTab()).toBe('fields');
    expect(root.querySelector('portal-field-editor')).toBeTruthy();
  }));

  // The chip names the component rather than describing the configuration, because a description written
  // once cannot survive the field being edited — and says nothing at all about a field added later.
  it('names the component under every field, including one added in the structure editor', fakeAsync(() => {
    settle();

    const texts = Array.from(root.querySelectorAll('portal-preview-field .chip-text')).map((element) =>
      (element.textContent ?? '').trim()
    );

    expect(texts.length).toBe(PREVIEW_FIELDS.length);
    expect(texts).toContain('Date');
    expect(texts.filter((text) => text === 'Date').length).toBe(2);
    expect(texts.every((text) => Object.values(FIELD_KIND_LABELS).includes(text))).toBeTrue();

    TestBed.inject(FormDefinitionStore).addField('radio-group', 'rules');
    settle();

    const added = Array.from(root.querySelectorAll('portal-preview-field .chip-text')).map((element) =>
      (element.textContent ?? '').trim()
    );

    expect(added.length).toBe(PREVIEW_FIELDS.length + 1);
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
    expect(chip.getAttribute('aria-describedby')).toBe('chip-tip-travellerName');
    expect(Array.from(root.querySelectorAll('portal-preview-field .chip[title]')).length).toBe(0);

    expect(tipFor('arrivalDate')).toContain('panelPosition: right');

    store.updateField('arrivalDate', { panelPosition: 'sheet' });
    settle();

    expect(tipFor('arrivalDate')).toContain('panelPosition: sheet');
    expect(tipFor('arrivalDate')).not.toContain('panelPosition: right');
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

    expect(labels).toEqual(['Structure', 'Fields']);
    expect(root.querySelector('portal-structure-tab')).toBeTruthy();
  }));

  it('renders each of the form sub-tabs', fakeAsync(() => {
    settle();

    const inspector = TestBed.inject(InspectorStore);
    const expected: [FormSubTab, string][] = [
      ['fields', 'portal-fields-tab'],
      ['structure', 'portal-structure-tab']
    ];

    for (const [subTab, selector] of expected) {
      inspector.tab.set('form');
      inspector.formTab.set(subTab);
      settle();

      expect(root.querySelector(selector)).withContext(subTab).toBeTruthy();
    }
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

    // Not merely the markup half: the box a form goes into, rather than the block that comes out of it.
    expect(inspector.tab()).toBe('export');
    expect(inspector.exportSection()).toBe('markup');

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

    expect(labels).toEqual(['Theme', 'Markup']);

    expect(root.querySelector('portal-theme-panel')).toBeTruthy();
    expect(root.querySelector('portal-markup-panel')).toBeNull();

    (root.querySelectorAll<HTMLElement>('portal-export-tab .sub-tab')[1] as HTMLElement).click();
    settle();

    expect(inspector.exportSection()).toBe('markup');
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

    inspector.openExport('markup');
    settle();
    expect(headings()).toEqual(['Export', 'Import']);
  }));

  // The theme half can be put back to the shipped default; the markup half needs the same way out of a form
  // the user has taken apart, or the two are only symmetric to look at.
  it('offers a reset beside the copy in both halves', fakeAsync(() => {
    settle();

    const inspector = TestBed.inject(InspectorStore);
    const definition = TestBed.inject(FormDefinitionStore);

    inspector.openExport('theme');
    settle();
    expect(root.querySelector('portal-theme-panel .pc-button.is-quiet')?.textContent?.trim()).toBe('Reset Theme');

    inspector.openExport('markup');
    settle();

    definition.removeField(PREVIEW_FIELDS[0]!.id);
    settle();
    expect(definition.fields().length).toBe(PREVIEW_FIELDS.length - 1);

    const reset = root.querySelector('portal-markup-panel .pc-button.is-quiet') as HTMLElement;
    expect(reset.textContent?.trim()).toBe('Reset Markup');

    reset.click();
    settle();

    expect(definition.fields().length).toBe(PREVIEW_FIELDS.length);
  }));

  // All three areas carry the same second level, so the strip is learned once rather than per tab.
  it('gives every area the same two-half strip', fakeAsync(() => {
    settle();

    const inspector = TestBed.inject(InspectorStore);
    const expected: [InspectorTab, string[]][] = [
      ['theme', ['Design', 'Variables']],
      ['form', ['Structure', 'Fields']],
      ['export', ['Theme', 'Markup']]
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

  // The stage is a fixed three-row grid, so an optional child of it shifts every row below — which once
  // pushed the drawer off the bottom of the viewport. Whatever the switches add has to stay inside the
  // head, leaving the head, the scroller and the drawer as the only three rows.
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
        expect(children[1]?.classList).withContext(context).toContain('stage-scroll');
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

  it('keeps the inspector above the library’s own sheet z-index', fakeAsync(() => {
    settle();

    const inspector = root.querySelector('portal-inspector') as HTMLElement;
    const sheet = Number(
      getComputedStyle(document.documentElement).getPropertyValue('--formidable-sheet-z-index').trim()
    );

    expect(Number(getComputedStyle(inspector).zIndex)).toBeGreaterThan(sheet);
  }));
});
