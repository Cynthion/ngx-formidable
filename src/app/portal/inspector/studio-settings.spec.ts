import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DateField, DropdownField } from '@cynthion/ngx-formidable';
import { provideNgxMask } from 'ngx-mask';
import { FIELD_CAPABILITIES, FIELD_KIND_LABELS } from '../model/field-capabilities';
import { PortalFieldKind } from '../model/field-spec.model';
import { PREVIEW_FORM_DEFINITION } from '../model/preview-form.definition';
import { PreviewForm } from '../stage/preview-form/preview-form';
import { FormDefinitionStore } from '../state/form-definition.store';
import { FormValueStore } from '../state/form-value.store';
import { AppDefaults } from './settings/app-defaults';
import { FieldEditor } from './settings/field-editor';
import { FormSettings } from './settings/form-settings';

/**
 * Every control in the Studio writes something, and the app defaults reach the preview through the library.
 *
 * The sweep is deliberately generic rather than a list of assertions per control. A hand-written list covers
 * what somebody remembered; walking the rendered controls covers whatever is on screen, including a control
 * added later — which is the class of defect this file exists for, two form-scope controls that moved a
 * value nothing rendered from.
 */
describe('studio settings', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  let store: FormDefinitionStore;

  /** One field per kind: the editor renders a different set of controls for each, and only for each. */
  const KINDS = Object.keys(FIELD_KIND_LABELS) as PortalFieldKind[];

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideNgxMask()] });

    store = TestBed.inject(FormDefinitionStore);
    store.reset();
  });

  afterEach(() => localStorage.clear());

  // #region Generic sweep

  type Control = HTMLInputElement | HTMLSelectElement;

  /** What the control is, for a failure message that names it rather than an index. */
  function describeControl(control: Control): string {
    const named = control.closest('.pc-field')?.querySelector('.pc-label-name')?.textContent;
    const checked = control.closest('.pc-check')?.textContent;

    return (named ?? checked ?? control.id ?? control.type).trim();
  }

  /**
   * Uses the control the way a user would, and answers whether it was usable at all.
   *
   * A select with nothing but its current value to offer — and a disabled one, which the editor uses for a
   * setting this kind of field does not honour — is skipped rather than failed.
   */
  function exercise(control: Control): boolean {
    if (control.disabled) return false;

    if (control instanceof HTMLSelectElement) {
      const next = Array.from(control.options).find((option) => !option.disabled && option.value !== control.value);
      if (!next) return false;

      control.value = next.value;
    } else if (control.type === 'checkbox') {
      control.checked = !control.checked;
    } else if (control.type === 'number') {
      control.value = String(Number(control.value || '0') + 3);
    } else {
      control.value = `${control.value}x`;
    }

    control.dispatchEvent(new Event('input'));
    control.dispatchEvent(new Event('change'));

    return true;
  }

  /** Everything a control can write: the form, or the app defaults beside it. */
  function snapshot(): string {
    return JSON.stringify([store.definition(), store.appDefaults()]);
  }

  /**
   * Every control in the panel, one at a time, each proved to write something into the store.
   *
   * The controls are re-queried per step rather than held: each write replaces the definition, and an `@if`
   * in the panel can rebuild the very element being driven.
   */
  function sweep(fixture: ComponentFixture<unknown>, context: string): void {
    const root = fixture.nativeElement as HTMLElement;
    const controls = (): Control[] => Array.from(root.querySelectorAll<Control>('select, input'));

    fixture.detectChanges();

    for (let index = 0; index < controls().length; index++) {
      const control = controls()[index];
      if (!control) continue;

      const name = `${context} ▸ ${describeControl(control)}`;
      const before = snapshot();

      if (!exercise(control)) continue;

      fixture.detectChanges();

      expect(snapshot(), name).not.toBe(before);
    }
  }

  it('writes something from every control of the form scope', () => {
    sweep(TestBed.createComponent(FormSettings), 'The Form');
  });

  it('writes something from every control of the app-defaults scope', () => {
    sweep(TestBed.createComponent(AppDefaults), 'App Defaults');
  });

  it('writes something from every control of the field editor, for every kind of field', () => {
    const fixture = TestBed.createComponent(FieldEditor);

    for (const kind of KINDS) {
      const field = store.fields().find((candidate) => candidate.kind === kind);
      expect(field, kind).toBeTruthy();

      store.select(field!.id);
      sweep(fixture, FIELD_KIND_LABELS[kind]);
    }
  });

  // #endregion

  // #region The app-defaults scope

  describe('app defaults', () => {
    let panel: ComponentFixture<AppDefaults>;
    let preview: ComponentFixture<PreviewForm>;
    let stage: HTMLElement;

    async function settle(): Promise<void> {
      for (let i = 0; i < 3; i++) {
        panel.detectChanges();
        preview.detectChanges();
        await vi.advanceTimersByTimeAsync(100);
      }
      panel.detectChanges();
      preview.detectChanges();
    }

    function control(key: string): HTMLSelectElement {
      return (panel.nativeElement as HTMLElement).querySelector(`#ad-${key}`) as HTMLSelectElement;
    }

    async function choose(key: string, value: string): Promise<void> {
      const select = control(key);
      select.value = value;
      select.dispatchEvent(new Event('change'));
      await settle();
    }

    /** The line under one control naming who states their own, or `''` while everything inherits. */
    function overrides(key: string): string {
      const note = control(key).closest('.pc-field')?.querySelector('.pc-overrides span');

      return (note?.textContent ?? '').trim();
    }

    async function clear(key: string): Promise<void> {
      (control(key).closest('.pc-field')!.querySelector('.pc-reset') as HTMLElement).click();
      await settle();
    }

    /**
     * What the decorator resolved each label to, which is the only place the position is observable.
     *
     * Matched against the five states rather than by prefix: the wrapper also carries `label-wrapper` and
     * `label-animated`, and neither says anything about where the label is.
     */
    const STATES = ['label-outside', 'label-resting', 'label-floating', 'label-border', 'label-border-prefix'];

    function stateOf(label: Element): string {
      return Array.from(label.classList).find((name) => STATES.includes(name)) ?? '(none)';
    }

    function labelClasses(): string[] {
      return Array.from(stage.querySelectorAll('.label-wrapper')).map(stateOf);
    }

    function labelOf(id: string): string {
      const field = stage.querySelector(`#chip-tip-${id}`)!.closest('portal-preview-field')!;

      return stateOf(field.querySelector('.label-wrapper')!);
    }

    function instance<T>(type: Type<T>): T[] {
      return preview.debugElement.queryAll(By.directive(type)).map((element) => element.injector.get(type));
    }

    beforeEach(() => {
      panel = TestBed.createComponent(AppDefaults);
      preview = TestBed.createComponent(PreviewForm);
      stage = preview.nativeElement as HTMLElement;
    });

    it('moves every label that states nothing, and leaves the one that states its own', async () => {
      await settle();

      // Nothing set: the library's own `inside`, which rests or floats depending on the field's value.
      expect(labelClasses().some((name) => name === 'label-resting' || name === 'label-floating')).toBe(true);

      await choose('labelPosition', 'border');

      expect(labelClasses()).toContain('label-border');
      expect(labelClasses()).not.toContain('label-resting');
      expect(labelClasses()).not.toContain('label-floating');

      // The card number states `outside`, and a layout that cannot honour a position labels outside anyway.
      expect(labelOf('cardNumber')).toBe('label-outside');
      expect(labelOf('orderName')).toBe('label-border');
    });

    it('aligns every adornment that states nothing', async () => {
      await settle();

      // Adornments are off and empty in the sample, so the alignment has nothing to act on until both are set.
      store.updateOptions({ showAdornments: true });
      store.setDecorationOnAllFields({ prefix: 'text' });
      await settle();

      const wrappers = (): HTMLElement[] =>
        Array.from(stage.querySelectorAll<HTMLElement>('.adornment-wrapper:not(.hidden)'));

      expect(wrappers().length).toBeGreaterThan(0);
      expect(wrappers().every((wrapper) => wrapper.classList.contains('align-value'))).toBe(false);

      await choose('prefixAlign', 'value');

      expect(wrappers().length).toBeGreaterThan(0);
      expect(wrappers().every((wrapper) => wrapper.classList.contains('align-value'))).toBe(true);
    });

    // The preview is provided the defaults, rather than the portal resolving them beside the library.
    it('reaches the fields through the library’s own resolution', async () => {
      const values = TestBed.inject(FormValueStore);
      values.model.set({ ...values.model(), orderName: '' });
      await settle();

      // Nobody has touched the name, so the default reveal holds its message back.
      expect(stage.textContent).not.toContain('We need a name for the order.');

      await choose('panelPosition', 'sheet');
      await choose('revealOn', 'always');

      // The date states nothing; the pizza picker states `right`.
      expect(instance(DateField).map((field) => field.panelPosition())).toEqual(['sheet']);
      expect(instance(DropdownField).map((field) => field.panelPosition())).toContain('right');
      expect(stage.textContent).toContain('We need a name for the order.');

      await choose('panelPosition', '');

      expect(instance(DateField).map((field) => field.panelPosition())).toEqual(['right']);
    });

    it('counts the fields that state their own, and clears them back to inheriting', async () => {
      await settle();

      const reached = store.fields().filter((field) => FIELD_CAPABILITIES[field.kind].labelPositions).length;

      // The sample ships one: the card number labels `outside`, to line up with the radio group beside it.
      expect(overrides('labelPosition')).toBe(`1 of ${reached} fields state their own.`);

      store.updateDecoration(PREVIEW_FORM_DEFINITION.fields[0]!.id, { labelPosition: 'border' });
      await settle();

      expect(overrides('labelPosition')).toBe(`2 of ${reached} fields state their own.`);

      await clear('labelPosition');

      expect(overrides('labelPosition')).toBe('');
      expect(store.fields().every((field) => field.decoration.labelPosition === undefined)).toBe(true);
    });

    it('says when the form states its own, and clears it back to inheriting', async () => {
      await settle();

      expect(overrides('revealOn')).toBe('');

      store.updateOptions({ revealOn: 'dirty' });
      await settle();

      expect(overrides('revealOn')).toBe('This form states its own.');

      await clear('revealOn');

      expect(store.options().revealOn).toBeUndefined();
    });
  });

  // #endregion

  // #region The adornment examples, on the form scope

  describe('adornment examples', () => {
    let panel: ComponentFixture<FormSettings>;

    function control(id: string): HTMLSelectElement {
      return (panel.nativeElement as HTMLElement).querySelector(`#ae-${id}`) as HTMLSelectElement;
    }

    function overrides(id: string): string {
      const note = control(id).closest('.pc-field')?.querySelector('.pc-overrides span');

      return (note?.textContent ?? '').trim();
    }

    beforeEach(() => {
      panel = TestBed.createComponent(FormSettings);
      panel.detectChanges();
    });

    it('fills every field’s slot with a sample', () => {
      control('prefix').value = 'icon';
      control('prefix').dispatchEvent(new Event('change'));
      panel.detectChanges();

      expect(store.fields().every((field) => field.decoration.prefix === 'icon')).toBe(true);
    });

    // The control has no value of its own, so it can only be wrong by disagreeing with the fields.
    it('states what most fields carry, counts the rest, and reasserts it over them', () => {
      store.updateDecoration(PREVIEW_FORM_DEFINITION.fields[0]!.id, { prefix: 'icon' });
      panel.detectChanges();

      expect(control('prefix').value).toBe('none');
      expect(overrides('prefix')).toBe(`1 of ${store.fields().length} fields override this.`);

      (control('prefix').closest('.pc-field')!.querySelector('.pc-reset') as HTMLElement).click();
      panel.detectChanges();

      expect(overrides('prefix')).toBe('');
      expect(store.fields().every((field) => field.decoration.prefix === 'none')).toBe(true);
    });
  });
});
