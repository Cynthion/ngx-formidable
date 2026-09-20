import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideNgxMask } from 'ngx-mask';
import { FormDefinitionStore } from '../state/form-definition.store';
import { FieldScope, InspectorStore } from '../state/inspector.store';
import { INSPECTOR_WIDTH_DEFAULT, INSPECTOR_WIDTH_MIN, LayoutStore } from '../state/layout.store';
import { InspectorComponent } from './inspector.component';

/**
 * Nothing in the panel is painted outside its own gutter, at either end of the width the divider allows.
 *
 * Not a pixel assertion: it reads no measurement off the stylesheet, only that a control fits the column it
 * was given. The defect it exists for is the box model — a `width: 100%` control in a padded column adds its
 * own padding and border outside that width, so it bleeds into the gutter at every width, and the narrower
 * the panel the more of it there is to see.
 */
describe('inspector layout', () => {
  let fixture: ComponentFixture<InspectorComponent>;
  let host: HTMLElement;
  let inspector: InspectorStore;
  let store: FormDefinitionStore;

  const SCOPES: readonly FieldScope[] = ['form', 'all', 'field'];

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideNgxMask()] });

    inspector = TestBed.inject(InspectorStore);
    store = TestBed.inject(FormDefinitionStore);
    store.reset();
    TestBed.inject(LayoutStore).inspectorCollapsed.set(false);

    fixture = TestBed.createComponent(InspectorComponent);
    host = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => localStorage.clear());

  function settle(): void {
    fixture.detectChanges();
    tick(50);
    fixture.detectChanges();
  }

  /**
   * The panel at one width whatever the runner's viewport is. `!important`, because below the two-column
   * breakpoint the panel is a bottom sheet and that rule carries one of its own.
   */
  function sizeTo(width: number): void {
    host.style.setProperty('width', `${width}px`, 'important');
    host.style.setProperty('height', '640px', 'important');
    settle();
  }

  /** Every element whose right edge lands beyond the scroll container's own content box. */
  function overflowing(where: string): string[] {
    const body = host.querySelector('.body') as HTMLElement;
    const limit = body.getBoundingClientRect().left + body.clientWidth;

    return Array.from(body.querySelectorAll<HTMLElement>('*'))
      .filter((element) => element.getBoundingClientRect().right > limit + 0.5)
      .map((element) => `${where}: ${element.tagName.toLowerCase()}.${element.className || '—'}`);
  }

  /** The view as it opens, then again with each of its sections open in turn. */
  function eachSection(where: string, report: (where: string) => void): void {
    settle();
    report(where);

    const count = host.querySelectorAll('.trigger').length;

    for (let i = 0; i < count; i++) {
      (host.querySelectorAll<HTMLElement>('.trigger')[i] as HTMLElement).click();
      settle();
      report(`${where} §${i + 1}`);
    }
  }

  /** Every tab, sub-tab, scope and section the panel can show. */
  function eachView(report: (where: string) => void): void {
    inspector.tab.set('theme');
    inspector.themeTab.set('design');
    eachSection('theme/design', report);

    inspector.themeTab.set('variables');
    eachSection('theme/variables', report);

    inspector.tab.set('form');
    inspector.formTab.set('structure');
    eachSection('form/structure', report);

    inspector.formTab.set('settings');
    for (const scope of SCOPES) {
      inspector.fieldScope.set(scope);
      settle();
      report(`form/settings/${scope}`);
    }

    inspector.tab.set('export');
    inspector.exportSection.set('theme');
    eachSection('export/theme', report);

    inspector.exportSection.set('form');
    eachSection('export/form', report);
  }

  function sweep(width: number): string[] {
    const failures: string[] = [];

    sizeTo(width);
    eachView((where) => failures.push(...overflowing(where)));

    return failures;
  }

  it('paints nothing outside the gutter at the width it opens at', fakeAsync(() => {
    expect(sweep(INSPECTOR_WIDTH_DEFAULT)).toEqual([]);
  }));

  it('paints nothing outside the gutter at the narrowest width the divider allows', fakeAsync(() => {
    expect(sweep(INSPECTOR_WIDTH_MIN)).toEqual([]);
  }));

  // The field editor renders a different set of controls per kind, so one selected field proves one of them.
  it('paints nothing outside the gutter for any field the editor can open', fakeAsync(() => {
    const failures: string[] = [];

    sizeTo(INSPECTOR_WIDTH_MIN);
    inspector.tab.set('form');
    inspector.formTab.set('settings');
    inspector.fieldScope.set('field');

    for (const field of store.fields()) {
      store.select(field.id);
      settle();
      failures.push(...overflowing(`${field.kind} "${field.label}"`));
    }

    expect(failures).toEqual([]);
  }));
});
