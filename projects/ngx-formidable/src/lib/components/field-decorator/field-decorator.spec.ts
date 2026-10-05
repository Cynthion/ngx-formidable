import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { page, userEvent } from 'vitest/browser';
import { FieldLabel } from '../../directives/field-label';
import { FieldPrefix } from '../../directives/field-prefix';
import { bindField, BindFieldOptions, BoundField, FieldKind } from '../../testing/bind-field';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';
import { InputField } from '../fields/input-field/input-field';
import { FieldDecorator } from './field-decorator';

/**
 * Per **Prefixes And Suffixes** in `user/decoration.md`: a prefix sits at the field's leading edge and a suffix
 * at its trailing one, both insetting the value. They centre on the field's box, or follow the value with
 * `align="value"`, except in a field that top-aligns its value. They are click-through, but a projected
 * `button` takes the click, and the field is re-inset whenever one comes or goes. The vertical layout has
 * none. Per **A Label Over The Field Stays On One Line And Ellipsizes**, a panel toggle drawn inside the field
 * pushes the label in as a suffix does. The messages render below the field, never inside its box.
 */

/** A prefix that comes and goes, the way a consumer's own `@if` moves it. */
@Component({
  imports: [FieldDecorator, InputField, FieldLabel, FieldPrefix],
  template: `
    <formidable-field-decorator>
      <formidable-input-field />
      <div formidableFieldLabel>Name</div>
      @if (showPrefix()) {
        <div
          formidableFieldPrefix
          style="width: 4rem">
          Prefix
        </div>
      }
    </formidable-field-decorator>
  `
})
class TogglablePrefixHost {
  readonly showPrefix = signal(false);
}

const rect = (element: Element) => element.getBoundingClientRect();
const centreY = (element: Element) => rect(element).top + rect(element).height / 2;
const text = (content: string) => page.getByText(content).element();
const textbox = () => page.getByRole('textbox', { name: 'Name' }).element();

/** Binds a decorated field labelled `Name`, with `decoration` projected beside the label. */
const bind = (kind: FieldKind, decoration: string, options: BindFieldOptions = {}): Promise<BoundField> =>
  bindField(kind, 'signal', {
    decorated: true,
    decoration: `<div formidableFieldLabel position="outside">Name</div>${decoration}`,
    ...options
  });

/** Where a value-top field's first line begins: inside its top border and padding. */
const contentTop = (editor: Element) =>
  rect(editor).top +
  parseFloat(getComputedStyle(editor).borderTopWidth) +
  parseFloat(getComputedStyle(editor).paddingTop);

describe('formidable-field-decorator layout', () => {
  beforeEach(() => configureFormidableTestBed());

  const adornments = '<div formidableFieldPrefix>Prefix</div><div formidableFieldSuffix>Suffix</div>';

  it('centres the prefix and the suffix on the field while its messages show below it', async () => {
    await bind('input', adornments, { inputs: { revealOn: 'always' }, state: { invalid: true } });

    expect(centreY(text('Prefix'))).toBeCloseTo(centreY(textbox()), 0);
    expect(centreY(text('Suffix'))).toBeCloseTo(centreY(textbox()), 0);
    expect(rect(text('invalid')).top).toBeGreaterThanOrEqual(rect(textbox()).bottom);
  });

  it('takes no space below the field while it is valid', async () => {
    await bind('input', adornments);

    expect(rect(document.querySelector('formidable-field-decorator')!).bottom).toBeCloseTo(rect(textbox()).bottom, 1);
  });

  // The two alignments differ only where something pushes the value off the box's centre: an inside label.
  describe('adornment alignment', () => {
    const bindUnder = (position: string, align: string) =>
      bindField('input', 'signal', {
        decorated: true,
        decoration:
          `<div formidableFieldLabel position="${position}">Name</div>` +
          `<div formidableFieldPrefix align="${align}">Prefix</div>` +
          `<div formidableFieldSuffix align="${align}">Suffix</div>`
      });
    const paddingTop = () => parseFloat(getComputedStyle(textbox()).paddingTop);

    it('centres on the field, not on the value, by default', async () => {
      await bindUnder('inside', 'center');

      expect(paddingTop()).toBeGreaterThan(0);
      expect(centreY(text('Prefix'))).toBeCloseTo(centreY(textbox()), 0);
      expect(centreY(text('Suffix'))).toBeCloseTo(centreY(textbox()), 0);
    });

    // The value is centred in a content box the label's padding has already shortened.
    it('follows the value once asked to, prefix and suffix alike', async () => {
      await bindUnder('inside', 'value');

      expect(centreY(text('Prefix'))).toBeCloseTo(centreY(textbox()) + paddingTop() / 2, 0);
      expect(centreY(text('Suffix'))).toBeCloseTo(centreY(textbox()) + paddingTop() / 2, 0);
    });

    it('changes nothing where no label pushes the value down', async () => {
      await bindUnder('outside', 'value');

      expect(paddingTop()).toBe(0);
      expect(centreY(text('Prefix'))).toBeCloseTo(centreY(textbox()), 0);
    });
  });

  describe('in a field that top-aligns its value', () => {
    it('sits on the first line', async () => {
      await bind('textarea', '<div formidableFieldPrefix>Prefix</div>');

      expect(rect(text('Prefix')).top).toBeCloseTo(contentTop(textbox()), 0);
    });

    it('stays where it is as the field grows', async () => {
      await bind('textarea', '<div formidableFieldPrefix>Prefix</div>');
      const height = rect(textbox()).height;
      const offset = () => rect(text('Prefix')).top - rect(textbox()).top;
      const before = offset();

      await userEvent.type(textbox(), 'one{Enter}two{Enter}three{Enter}four{Enter}five');

      await expect.poll(() => rect(textbox()).height).toBeGreaterThan(height);
      expect(offset()).toBeCloseTo(before, 1);
    });

    // An inside label is what gives `align="value"` something to follow in a centred field.
    it('keeps its own alignment whatever the adornment asks for', async () => {
      await bindField('textarea', 'signal', {
        decorated: true,
        decoration:
          '<div formidableFieldLabel>Name</div>' +
          '<div formidableFieldPrefix align="value">Prefix</div>' +
          '<div formidableFieldSuffix>Suffix</div>'
      });

      expect(rect(text('Prefix')).top).toBeCloseTo(rect(text('Suffix')).top, 1);
    });
  });

  describe('with a projected action', () => {
    // A click Playwright would land on anything else does not count: it fails unless the button takes it.
    it('lets a click reach a button in the suffix', async () => {
      await bind('input', '<div formidableFieldSuffix><button type="button">Clear</button></div>');

      await userEvent.click(page.getByRole('button', { name: 'Clear' }));

      await expect.element(page.getByRole('button', { name: 'Clear' })).toHaveFocus();
    });

    // Forced, so the click lands where the prefix is drawn, whatever takes it.
    it('keeps a text prefix click-through, so the field takes the click', async () => {
      await bind('input', '<div formidableFieldPrefix>Prefix</div>');

      await userEvent.click(page.getByText('Prefix'), { force: true });

      await expect.element(page.getByRole('textbox', { name: 'Name' })).toHaveFocus();
    });
  });

  it('insets the field for a prefix, and gives it back its own padding once the prefix goes', async () => {
    const fixture = TestBed.createComponent(TogglablePrefixHost);
    await settle(fixture);
    const paddingLeft = () => parseFloat(getComputedStyle(textbox()).paddingLeft);
    const own = paddingLeft();

    fixture.componentInstance.showPrefix.set(true);
    await settle(fixture);

    expect(paddingLeft()).toBeGreaterThanOrEqual(rect(text('Prefix')).width);

    fixture.componentInstance.showPrefix.set(false);
    await settle(fixture);

    expect(paddingLeft()).toBe(own);
  });

  // A vertical layout stacks a group, which has no value to inset.
  it('drops a projected prefix and suffix in the vertical layout', async () => {
    await bindField('radio-group', 'signal', {
      inputs: { options: [{ value: 'a', label: 'Alpha' }] },
      decorated: true,
      decoration: `<div formidableFieldLabel>Name</div>${adornments}`
    });

    await expect.element(page.getByRole('radiogroup', { name: 'Name' })).toBeInTheDocument();
    expect(page.getByText('Prefix').elements()).toEqual([]);
    expect(page.getByText('Suffix').elements()).toEqual([]);
  });

  /**
   * A dropdown and a date field draw a panel toggle inside their own box. The label follows the value's
   * insets, so the value has to stop short of the toggle, or the label runs underneath it and a suffix
   * lands on top of it.
   */
  describe('with an in-field panel toggle', () => {
    const combobox = () => page.getByRole('combobox', { name: 'Name' }).element() as HTMLInputElement;
    const label = () => rect(combobox().labels![0]!);
    const toggle = (bound: BoundField) => bound.element.querySelector('.dropdown-toggle, .toggle');

    /** Binds a panel field under an inside label, with `decoration` beside it. */
    const bindPanel = (kind: FieldKind, decoration = '', options: BindFieldOptions = {}) =>
      bindField(kind, 'signal', {
        inputs: kind === 'dropdown' || kind === 'autocomplete' ? { options: [] } : {},
        decorated: true,
        decoration: `<div formidableFieldLabel>Name</div>${decoration}`,
        ...options
      });

    /** How far the value stays from the field's right edge, beyond what it stays from its left one. */
    const reserved = (bound: BoundField, value: Element) =>
      rect(bound.element).right - rect(value).right - (rect(value).left - rect(bound.element).left);

    for (const kind of ['dropdown', 'date'] as FieldKind[]) {
      it(`keeps the label clear of the ${kind} toggle`, async () => {
        const bound = await bindPanel(kind);

        expect(label().right).toBeCloseTo(rect(combobox()).right, 1);
        expect(label().right).toBeLessThanOrEqual(rect(toggle(bound)!).left + 0.5);
      });
    }

    // Reserving the width where nothing is drawn would leave a visible gap at the right edge.
    for (const kind of ['autocomplete', 'time'] as FieldKind[]) {
      it(`reserves nothing in the ${kind} field, which draws no toggle`, async () => {
        const bound = await bindPanel(kind);
        const value = page.getByRole(kind === 'time' ? 'textbox' : 'combobox', { name: 'Name' }).element();

        expect(reserved(bound, value)).toBeCloseTo(0, 1);
        expect(rect((value as HTMLInputElement).labels![0]!).right).toBeCloseTo(rect(value).right, 1);
      });
    }

    it('hands the width back when readonly takes the toggle away', async () => {
      const bound = await bindPanel('dropdown');

      expect(reserved(bound, combobox())).toBeGreaterThan(0);

      await bound.state({ readonly: true });

      expect(toggle(bound)).toBeNull();
      expect(reserved(bound, combobox())).toBeCloseTo(0, 1);
      expect(label().right).toBeCloseTo(rect(combobox()).right, 1);
    });

    it('stacks a projected suffix beside the toggle, with the label clear of both', async () => {
      const bound = await bindPanel('dropdown', '<div formidableFieldSuffix>Suffix</div>');

      expect(rect(text('Suffix')).left).toBeGreaterThanOrEqual(rect(toggle(bound)!).right - 0.5);
      expect(label().right).toBeLessThanOrEqual(rect(toggle(bound)!).left + 0.5);
    });
  });
});
