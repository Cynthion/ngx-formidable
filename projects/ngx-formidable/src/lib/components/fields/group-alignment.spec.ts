import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { page } from 'vitest/browser';
import { NO_OPTIONS_TEXT } from '../../models/formidable.model';
import { theme } from '../../testing/dom';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';
import { FieldOption } from '../field-option/field-option';
import { CheckboxGroupField } from './checkbox-group-field/checkbox-group-field';
import { InputField } from './input-field/input-field';
import { RadioGroupField } from './radio-group-field/radio-group-field';

/**
 * Contract of a group option's horizontal inset.
 *
 * `--formidable-option-prefix-inset` is where an option's marker starts; `--formidable-option-prefix-gap`
 * is the space between that marker and its label. They were one token doing both jobs, which is what made
 * a left-aligned group unreachable — zeroing the inset collapsed the label onto the glyph with it.
 *
 * Three claims:
 *
 * 1. The inset *derives* from `--formidable-field-padding-x`, so a group's options line up with a field's
 *    value by construction. The two used to be independent tokens that happened to hold the same number.
 * 2. Zeroing the inset moves the marker and leaves the gap standing — the split itself.
 * 3. A group's empty state takes that same inset, so it moves out with the options instead of staying
 *    behind on the field's own padding, which is the third value it used to read.
 *
 * Read off `getComputedStyle` rather than off rendered geometry: the claim is about which variable each
 * padding resolves through, not about a pixel count.
 */

@Component({
  imports: [InputField, RadioGroupField, CheckboxGroupField, FieldOption],
  template: `
    <formidable-input-field name="text" />

    <formidable-radio-group-field name="filled">
      <formidable-field-option value="a" />
      <formidable-field-option value="b" />
    </formidable-radio-group-field>

    <formidable-checkbox-group-field name="empty" />
  `
})
class TestHost {}

describe('group option alignment', () => {
  // A group collects its options in a microtask after content init, so the rows need the render to settle.
  beforeEach(async () => {
    configureFormidableTestBed();

    await settle(TestBed.createComponent(TestHost));
  });

  function padding(element: Element): { left: string; right: string } {
    const style = getComputedStyle(element);

    return { left: style.paddingLeft, right: style.paddingRight };
  }

  // Where a field's value starts.
  const fieldText = (): string => padding(page.getByRole('textbox').element()).left;

  // Where a group's marker starts, and the gap it leaves before the label. The marker has no role of its own.
  const marker = (): { left: string; right: string } =>
    padding(page.getByRole('radiogroup').element().querySelector('.field-option-prefix')!);

  // Where a group's empty state starts.
  const emptyState = (): string => padding(page.getByText(NO_OPTIONS_TEXT).element()).left;

  describe('derivation', () => {
    it('starts a marker where a field starts its value', () => {
      expect(marker().left).toBe(fieldText());
    });

    // The point of the phase: the two agreed at defaults before this change too, but only because both
    // tokens happened to be 16px. Moving the field's padding is what tells the two apart.
    it('moves the marker with the field padding it derives from', () => {
      theme('--formidable-field-padding-x', '40px');

      expect(fieldText()).toBe('40px');
      expect(marker().left).toBe('40px');
    });
  });

  describe('the split', () => {
    it('zeroes the inset without collapsing the gap', () => {
      const gap = marker().right;

      theme('--formidable-option-prefix-inset', '0px');

      expect(marker().left).toBe('0px');
      expect(marker().right).toBe(gap);
    });

    it('leaves a field padding of its own alone', () => {
      const text = fieldText();

      theme('--formidable-option-prefix-inset', '0px');

      expect(fieldText()).toBe(text);
    });
  });

  describe('empty state', () => {
    it('takes the inset an option gets from its marker', () => {
      expect(emptyState()).toBe(marker().left);
    });

    it('moves out with the options', () => {
      theme('--formidable-option-prefix-inset', '0px');

      expect(emptyState()).toBe('0px');
    });
  });
});
