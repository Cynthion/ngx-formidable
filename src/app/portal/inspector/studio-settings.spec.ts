import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideNgxMask } from 'ngx-mask';
import { FIELD_KIND_LABELS } from '../model/field-capabilities';
import { PortalFieldKind } from '../model/field-spec.model';
import { PREVIEW_FORM_DEFINITION } from '../model/preview-form.definition';
import { PreviewFormComponent } from '../stage/preview-form/preview-form.component';
import { FormDefinitionStore } from '../state/form-definition.store';
import { AllFieldsComponent } from './settings/all-fields.component';
import { FieldEditorComponent } from './settings/field-editor.component';
import { FormSettingsComponent } from './settings/form-settings.component';

/**
 * Every control in the Studio writes something, and the form-scope decoration controls reach the preview.
 *
 * The sweep is deliberately generic rather than a list of assertions per control. A hand-written list covers
 * what somebody remembered; walking the rendered controls covers whatever is on screen, including a control
 * added later — which is the class of defect this file exists for, two form-scope controls that moved a
 * value nothing rendered from.
 */
describe('studio settings', () => {
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

  /**
   * Every control in the panel, one at a time, each proved to write something into the definition.
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
      const before = JSON.stringify(store.definition());

      if (!exercise(control)) continue;

      fixture.detectChanges();

      expect(JSON.stringify(store.definition())).withContext(name).not.toBe(before);
    }
  }

  it('writes something from every control of the form scope', () => {
    sweep(TestBed.createComponent(FormSettingsComponent), 'The Form');
  });

  it('writes something from every control of the all-fields scope', () => {
    sweep(TestBed.createComponent(AllFieldsComponent), 'All Fields');
  });

  it('writes something from every control of the field editor, for every kind of field', () => {
    const fixture = TestBed.createComponent(FieldEditorComponent);

    for (const kind of KINDS) {
      const field = store.fields().find((candidate) => candidate.kind === kind);
      expect(field).withContext(kind).toBeTruthy();

      store.select(field!.id);
      sweep(fixture, FIELD_KIND_LABELS[kind]);
    }
  });

  // #endregion

  // #region The all-fields scope

  describe('all fields', () => {
    let panel: ComponentFixture<AllFieldsComponent>;
    let preview: ComponentFixture<PreviewFormComponent>;
    let stage: HTMLElement;

    function settle(): void {
      for (let i = 0; i < 3; i++) {
        panel.detectChanges();
        preview.detectChanges();
        tick(100);
      }
      panel.detectChanges();
      preview.detectChanges();
    }

    function control(id: string): HTMLSelectElement {
      return (panel.nativeElement as HTMLElement).querySelector(`#af-${id}`) as HTMLSelectElement;
    }

    function choose(id: string, value: string): void {
      const select = control(id);
      select.value = value;
      select.dispatchEvent(new Event('change'));
      settle();
    }

    /** The override line under one control, or `''` while every field agrees with it. */
    function overrides(id: string): string {
      const note = control(id).closest('.pc-field')?.querySelector('.overrides span');

      return (note?.textContent ?? '').trim();
    }

    /**
     * What the decorator resolved each label to, which is the only place the position is observable.
     *
     * Matched against the five states rather than by prefix: the wrapper also carries `label-wrapper` and
     * `label-animated`, and neither says anything about where the label is.
     */
    const STATES = ['label-outside', 'label-resting', 'label-floating', 'label-border', 'label-border-prefix'];

    function labelClasses(): string[] {
      return Array.from(stage.querySelectorAll('.label-wrapper')).map(
        (label) => Array.from(label.classList).find((name) => STATES.includes(name)) ?? '(none)'
      );
    }

    beforeEach(() => {
      panel = TestBed.createComponent(AllFieldsComponent);
      preview = TestBed.createComponent(PreviewFormComponent);
      stage = preview.nativeElement as HTMLElement;
    });

    it('moves every label the preview renders', fakeAsync(() => {
      settle();

      // The sample starts `inside`, which resolves to resting or floating depending on the field's value.
      expect(labelClasses().some((name) => name === 'label-resting' || name === 'label-floating')).toBeTrue();

      choose('label-position', 'border');

      expect(labelClasses()).toContain('label-border');
      expect(labelClasses()).not.toContain('label-resting');
      expect(labelClasses()).not.toContain('label-floating');

      // A layout that cannot honour a position still labels outside, which is the capability table's answer
      // rather than the control's — so the control is not lying when it reads `border`.
      expect(labelClasses()).toContain('label-outside');
    }));

    it('aligns every adornment the preview renders', fakeAsync(() => {
      settle();

      // Adornments are off and empty in the sample, so the alignment has nothing to act on until both are set.
      store.updateOptions({ showAdornments: true });
      choose('prefix', 'text');

      const wrappers = (): HTMLElement[] =>
        Array.from(stage.querySelectorAll<HTMLElement>('.adornment-wrapper:not(.hidden)'));

      expect(wrappers().length).toBeGreaterThan(0);
      expect(wrappers().every((wrapper) => wrapper.classList.contains('align-value'))).toBeFalse();

      choose('adornment-align', 'value');

      expect(wrappers().length).toBeGreaterThan(0);
      expect(wrappers().every((wrapper) => wrapper.classList.contains('align-value'))).toBeTrue();
    }));

    // The control has no value of its own, so it can only be wrong by disagreeing with the fields.
    it('states what most fields carry, and counts the rest', fakeAsync(() => {
      settle();

      expect(control('label-position').value).toBe('inside');
      expect(overrides('label-position')).toBe('');

      store.updateDecoration(PREVIEW_FORM_DEFINITION.fields[0]!.id, { labelPosition: 'border' });
      settle();

      // Still `inside`: one field overriding does not make the other 23 disappear, which is what `Mixed` did.
      expect(control('label-position').value).toBe('inside');
      expect(overrides('label-position')).toBe(`1 of ${store.fields().length} fields override this.`);
    }));

    it('reasserts the stated value over the fields that override it', fakeAsync(() => {
      settle();

      store.updateDecoration(PREVIEW_FORM_DEFINITION.fields[0]!.id, { labelPosition: 'border' });
      store.updateDecoration(PREVIEW_FORM_DEFINITION.fields[1]!.id, { labelPosition: 'outside' });
      settle();
      expect(overrides('label-position')).toBe(`2 of ${store.fields().length} fields override this.`);

      const apply = control('label-position').closest('.pc-field')!.querySelector('.pc-reset') as HTMLElement;
      apply.click();
      settle();

      expect(overrides('label-position')).toBe('');
      expect(store.fields().every((field) => field.decoration.labelPosition === 'inside')).toBeTrue();
    }));

    // Both slots move together, so a field that splits them agrees with neither answer.
    it('counts a field whose prefix and suffix disagree as an override', fakeAsync(() => {
      settle();

      expect(overrides('adornment-align')).toBe('');

      store.updateDecoration(PREVIEW_FORM_DEFINITION.fields[0]!.id, { prefixAlign: 'value' });
      settle();

      expect(overrides('adornment-align')).toBe(`1 of ${store.fields().length} fields override this.`);
    }));
  });

  // #endregion
});
