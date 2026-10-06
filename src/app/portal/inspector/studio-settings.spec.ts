import { TestBed } from '@angular/core/testing';
import { page, userEvent } from 'vitest/browser';
import { FIELD_CAPABILITIES, FIELD_KIND_LABELS } from '../model/field-capabilities';
import { PortalFieldKind } from '../model/field-spec.model';
import { PREVIEW_FIELDS } from '../model/preview-form.definition';
import { FormDefinitionStore } from '../state/form-definition.store';
import { editField, openPanel, openStudio } from '../testing/studio';

/** **Slider Declared Inline** in `impl/backlog.md`. */
const SLIDER_DECLARED_INLINE = 'the Studio offers a slider adornments its vertical layout never renders';

/**
 * Every control in the Studio writes something, and the app defaults reach the preview through the library.
 *
 * The sweep is deliberately generic rather than a list of assertions per control. A hand-written list covers
 * what somebody remembered; walking the rendered controls covers whatever is on screen, including a control
 * added later — which is the class of defect this file exists for, two form-scope controls that moved a
 * value nothing rendered from.
 */
describe('studio settings', () => {
  /** One field per kind: the editor renders a different set of controls for each, and only for each. */
  const KINDS = Object.keys(FIELD_KIND_LABELS) as PortalFieldKind[];

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
   * A select with nothing but its current value to offer, and a disabled control — which the editor uses for
   * a setting this kind of field does not honour — are skipped rather than failed.
   */
  async function exercise(control: Control): Promise<boolean> {
    if (control.disabled) return false;

    const locator = page.elementLocator(control);

    if (control instanceof HTMLSelectElement) {
      const next = Array.from(control.options).find((option) => !option.disabled && option.value !== control.value);
      if (!next) return false;

      await userEvent.selectOptions(locator, next.value);
    } else if (control.type === 'checkbox') {
      await userEvent.click(locator);
    } else {
      const next = control.type === 'number' ? String(Number(control.value || '0') + 3) : `${control.value}x`;

      // Typed, then committed: most of these write on `change`, which a text control fires on `Enter`.
      await userEvent.fill(locator, next);
      await userEvent.keyboard('{Enter}');
    }

    return true;
  }

  /**
   * Every control of one editor, one at a time, each proved to write something into the Studio's model of
   * the form, which is what the stage renders and the export serializes.
   *
   * The controls are re-queried per step rather than held: each write replaces the definition, and an `@if`
   * in the panel can rebuild the very element being driven.
   */
  async function sweep(editor: string, context: string): Promise<void> {
    const store = TestBed.inject(FormDefinitionStore);
    const snapshot = () => JSON.stringify([store.definition(), store.appDefaults()]);
    const controls = () => Array.from(document.querySelectorAll<Control>(`${editor} select, ${editor} input`));

    expect(controls().length, context).toBeGreaterThan(0);

    for (let index = 0; index < controls().length; index++) {
      const control = controls()[index];
      if (!control) continue;

      const name = `${context} ▸ ${describeControl(control)}`;
      const before = snapshot();

      if (!(await exercise(control))) continue;

      expect(snapshot(), name).not.toBe(before);
    }
  }

  it('writes something from every control of the form scope', async () => {
    await openStudio();
    await openPanel('Form', 'Settings', 'The Form');

    await sweep('portal-form-settings', 'The Form');
  });

  it('writes something from every control of the app-defaults scope', async () => {
    await openStudio();
    await openPanel('Form', 'Settings', 'App Defaults');

    await sweep('portal-app-defaults', 'App Defaults');
  });

  // A sweep over every kind of field outlasts the 15 s default on a CI runner.
  it('writes something from every control of the field editor, for every kind of field', async () => {
    await openStudio();
    await openPanel('Form', 'Settings', 'This Field');

    for (const kind of KINDS) {
      const field = PREVIEW_FIELDS.find((candidate) => candidate.kind === kind);
      expect(field, kind).toBeTruthy();

      await editField(field!.label);
      await sweep('portal-field-editor', FIELD_KIND_LABELS[kind]);
    }
  }, 60_000);

  // #endregion

  // #region The app-defaults scope

  describe('app defaults', () => {
    /** The line under one control naming who states their own, or `''` while everything inherits. */
    function overrides(label: string): string {
      const control = page.getByRole('combobox', { name: label, exact: true }).element();

      return (control.closest('.pc-field')?.querySelector('.pc-overrides span')?.textContent ?? '').trim();
    }

    async function clear(label: string): Promise<void> {
      const control = page.getByRole('combobox', { name: label, exact: true }).element();

      await userEvent.click(page.elementLocator(control.closest('.pc-field')!).getByRole('button', { name: 'Clear' }));
    }

    /**
     * What the decorator resolved a label to, which is the only place the position is observable.
     *
     * Matched against the five states rather than by prefix: the wrapper also carries `label-wrapper` and
     * `label-animated`, and neither says anything about where the label is.
     */
    const STATES = ['label-outside', 'label-resting', 'label-floating', 'label-border', 'label-border-prefix'];

    function stateOf(label: Element): string {
      return Array.from(label.classList).find((name) => STATES.includes(name)) ?? '(none)';
    }

    function labelStates(): string[] {
      return Array.from(document.querySelectorAll('portal-stage .label-wrapper')).map(stateOf);
    }

    function labelOf(field: string): string {
      const decorator = page.getByLabelText(field, { exact: true }).element().closest('formidable-field-decorator')!;

      return stateOf(decorator.querySelector('.label-wrapper')!);
    }

    /** Opens a field's panel from the keyboard and answers the position it opened at. */
    async function panelPositionOf(field: string): Promise<string> {
      const combobox = page.getByRole('combobox', { name: field });

      await userEvent.click(combobox, { force: true });
      if (combobox.element().getAttribute('aria-expanded') !== 'true') {
        await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
      }
      await expect.element(combobox).toHaveAttribute('aria-expanded', 'true');

      const panel = document.getElementById(combobox.element().getAttribute('aria-controls')!)!.closest('.panel')!;
      const position = /panel-(\w+)/.exec(panel.className)![1]!;

      await userEvent.keyboard('{Escape}');

      return position;
    }

    it('moves every label that states nothing, and leaves the one that states its own', async () => {
      await openStudio();
      await openPanel('Form', 'Settings', 'App Defaults');

      // Nothing set: the library's own `inside`, which rests or floats depending on the field's value.
      expect(labelStates().some((name) => name === 'label-resting' || name === 'label-floating')).toBe(true);

      await userEvent.selectOptions(page.getByRole('combobox', { name: 'Label Position' }), 'border');

      await expect.poll(labelStates).toContain('label-border');
      expect(labelStates()).not.toContain('label-resting');
      expect(labelStates()).not.toContain('label-floating');

      // The card number states `outside`, and a layout that cannot honour a position labels outside anyway.
      expect(labelOf('Card Number')).toBe('label-outside');
      expect(labelOf('Name On The Order')).toBe('label-border');
    });

    it('aligns every adornment that states nothing', async () => {
      await openStudio();

      // Adornments are off and empty in the sample, so the alignment has nothing to act on until both are set.
      await openPanel('Form', 'Settings', 'The Form');
      await userEvent.click(page.getByRole('checkbox', { name: 'Adornments' }));
      await userEvent.selectOptions(page.getByRole('combobox', { name: 'Prefix', exact: true }), 'text');

      const wrappers = (): HTMLElement[] =>
        Array.from(document.querySelectorAll<HTMLElement>('portal-stage .adornment-wrapper:not(.hidden)'));

      await expect.poll(() => wrappers().length).toBeGreaterThan(0);
      expect(wrappers().every((wrapper) => wrapper.classList.contains('align-value'))).toBe(false);

      await userEvent.click(page.getByRole('button', { name: /^App Defaults/ }));
      await userEvent.selectOptions(page.getByRole('combobox', { name: 'Prefix Follows' }), 'value');

      await expect.poll(() => wrappers().every((wrapper) => wrapper.classList.contains('align-value'))).toBe(true);
      expect(wrappers().length).toBeGreaterThan(0);
    });

    // The preview is provided the defaults, rather than the portal resolving them beside the library.
    it('reaches the fields through the library’s own resolution', async () => {
      await openStudio();

      // The branch arrives empty and required, and nobody has touched it, so the default reveal holds its
      // message back.
      await userEvent.click(page.getByRole('switch', { name: 'How To Get It' }));
      await expect.element(page.getByRole('combobox', { name: 'Pick Up From' })).toBeVisible();
      expect(page.getByText('Pick a branch to collect from.').elements()).toEqual([]);

      await openPanel('Form', 'Settings', 'App Defaults');
      await userEvent.selectOptions(page.getByRole('combobox', { name: 'Panel Position' }), 'sheet');
      await userEvent.selectOptions(page.getByRole('combobox', { name: 'Reveal On' }), 'always');

      await expect.element(page.getByText('Pick a branch to collect from.')).toBeVisible();
      // The date states nothing; the pizza picker states `right`.
      expect(await panelPositionOf('Date')).toBe('sheet');
      expect(await panelPositionOf('Pizza')).toBe('right');

      await userEvent.selectOptions(page.getByRole('combobox', { name: 'Panel Position' }), '');

      expect(await panelPositionOf('Date')).toBe('right');
    });

    it('counts the fields that state their own, and clears them back to inheriting', async () => {
      await openStudio();
      await openPanel('Form', 'Settings', 'App Defaults');

      const reached = PREVIEW_FIELDS.filter((field) => FIELD_CAPABILITIES[field.kind].labelPositions).length;

      // The sample ships one: the card number labels `outside`, to line up with the radio group beside it.
      expect(overrides('Label Position')).toBe(`1 of ${reached} fields state their own.`);

      await userEvent.click(page.getByRole('button', { name: /^This Field/ }));
      await editField('Name On The Order');
      await userEvent.selectOptions(page.getByRole('combobox', { name: 'Label Position' }), 'border');
      await userEvent.click(page.getByRole('button', { name: /^App Defaults/ }));

      expect(overrides('Label Position')).toBe(`2 of ${reached} fields state their own.`);

      await clear('Label Position');

      expect(overrides('Label Position')).toBe('');
      await expect.poll(() => labelOf('Card Number')).not.toBe('label-outside');
      expect(labelOf('Name On The Order')).not.toBe('label-border');
    });

    it('says when the form states its own, and clears it back to inheriting', async () => {
      await openStudio();
      await openPanel('Form', 'Settings', 'App Defaults');

      expect(overrides('Reveal On')).toBe('');

      await userEvent.click(page.getByRole('button', { name: /^The Form/ }));
      await userEvent.selectOptions(page.getByRole('combobox', { name: 'Reveal On' }), 'dirty');
      await userEvent.click(page.getByRole('button', { name: /^App Defaults/ }));

      expect(overrides('Reveal On')).toBe('This form states its own.');

      await clear('Reveal On');

      expect(overrides('Reveal On')).toBe('');
      await userEvent.click(page.getByRole('button', { name: /^The Form/ }));
      await expect.element(page.getByRole('combobox', { name: 'Reveal On' })).toHaveValue('');
    });
  });

  // #endregion

  // #region The adornment examples, on the form scope

  describe('adornment examples', () => {
    const prefix = () => page.getByRole('combobox', { name: 'Prefix', exact: true });

    function overrides(): string {
      return (prefix().element().closest('.pc-field')?.querySelector('.pc-overrides span')?.textContent ?? '').trim();
    }

    const shown = PREVIEW_FIELDS.filter((field) => field.id !== 'branch');

    /** Applies a button to every field's prefix slot and answers which fields show one, by their labels. */
    async function applyButtons(): Promise<string[]> {
      await openStudio();
      await openPanel('Form', 'Settings', 'The Form');

      await userEvent.click(page.getByRole('checkbox', { name: 'Adornments' }));
      await userEvent.selectOptions(prefix(), 'button');
      await expect.element(page.getByRole('button', { name: 'Set', exact: true }).first()).toBeVisible();

      return shown
        .map((field) => field.label)
        .filter((label) => {
          const decorator = page
            .getByLabelText(label, { exact: true })
            .first()
            .element()
            .closest('formidable-field-decorator')!;

          return (
            page.elementLocator(decorator).getByRole('button', { name: 'Set', exact: true }).elements().length === 1
          );
        });
    }

    const labelsOf = (filter: (field: (typeof shown)[number]) => boolean) =>
      shown.filter(filter).map((field) => field.label);

    it('fills every field’s slot with a sample', async () => {
      const horizontal = labelsOf((field) => FIELD_CAPABILITIES[field.kind].layout === 'horizontal');

      expect(await applyButtons()).toEqual(expect.arrayContaining(horizontal));
    });

    // The editor offers a prefix wherever the capability table says the field renders one.
    it('offers an adornment only where the field renders one', async ({ skip }) => {
      skip(SLIDER_DECLARED_INLINE);

      expect(await applyButtons()).toEqual(labelsOf((field) => FIELD_CAPABILITIES[field.kind].adornments));
    });

    // The control has no value of its own, so it can only be wrong by disagreeing with the fields.
    it('states what most fields carry, counts the rest, and reasserts it over them', async () => {
      await openStudio();
      await openPanel('Form', 'Settings', 'This Field');

      await editField('Pizza');
      await userEvent.selectOptions(prefix(), 'icon');
      await userEvent.click(page.getByRole('button', { name: /^The Form/ }));

      await expect.element(prefix()).toHaveValue('none');
      expect(overrides()).toBe(`1 of ${PREVIEW_FIELDS.length} fields override this.`);

      await userEvent.click(page.getByRole('button', { name: 'Apply To All' }));

      expect(overrides()).toBe('');
      await userEvent.click(page.getByRole('button', { name: /^This Field/ }));
      await editField('Pizza');
      await expect.element(prefix()).toHaveValue('none');
    });
  });
});
