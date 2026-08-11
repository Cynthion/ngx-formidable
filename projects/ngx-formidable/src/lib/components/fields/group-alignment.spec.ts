import { Component } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideNgxMask } from 'ngx-mask';
import { FieldOptionComponent } from '../field-option/field-option.component';
import { CheckboxGroupFieldComponent } from './checkbox-group-field/checkbox-group-field.component';
import { InputFieldComponent } from './input-field/input-field.component';
import { RadioGroupFieldComponent } from './radio-group-field/radio-group-field.component';

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
  standalone: true,
  imports: [InputFieldComponent, RadioGroupFieldComponent, CheckboxGroupFieldComponent, FieldOptionComponent],
  template: `
    <formidable-input-field name="text" />

    <formidable-radio-group-field name="filled">
      <formidable-field-option value="a" />
      <formidable-field-option value="b" />
    </formidable-radio-group-field>

    <formidable-checkbox-group-field name="empty" />
  `
})
class HostComponent {}

describe('group option alignment', () => {
  let fixture: ComponentFixture<HostComponent>;
  let root: HTMLElement;
  const themed = new Set<string>();

  // A group collects its options in a microtask after content init, so the rows need a second pass.
  beforeEach(fakeAsync(() => {
    TestBed.configureTestingModule({ providers: [provideNgxMask()] });

    fixture = TestBed.createComponent(HostComponent);
    root = fixture.nativeElement;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }));

  afterEach(() => {
    themed.forEach((property) => document.documentElement.style.removeProperty(property));
    themed.clear();
  });

  function set(property: string, value: string): void {
    document.documentElement.style.setProperty(property, value);
    themed.add(property);
  }

  function padding(selector: string): { left: string; right: string } {
    const style = getComputedStyle(root.querySelector(selector) as HTMLElement);

    return { left: style.paddingLeft, right: style.paddingRight };
  }

  // Where a field's value starts.
  const fieldText = (): string => padding('formidable-input-field .field').left;

  // Where a group's marker starts, and the gap it leaves before the label.
  const marker = (): { left: string; right: string } => padding('formidable-radio-group-field .field-option-prefix');

  // Where a group's empty state starts.
  const emptyState = (): string => padding('formidable-checkbox-group-field .no-option').left;

  it('renders the three elements the assertions read', () => {
    expect(root.querySelector('formidable-radio-group-field .field-option-prefix')).toBeTruthy();
    expect(root.querySelector('formidable-checkbox-group-field .no-option')).toBeTruthy();
  });

  describe('derivation', () => {
    it('starts a marker where a field starts its value', () => {
      expect(marker().left).toBe(fieldText());
    });

    // The point of the phase: the two agreed at defaults before this change too, but only because both
    // tokens happened to be 16px. Moving the field's padding is what tells the two apart.
    it('moves the marker with the field padding it derives from', () => {
      set('--formidable-field-padding-x', '40px');
      fixture.detectChanges();

      expect(fieldText()).toBe('40px');
      expect(marker().left).toBe('40px');
    });
  });

  describe('the split', () => {
    it('zeroes the inset without collapsing the gap', () => {
      const gap = marker().right;

      set('--formidable-option-prefix-inset', '0px');
      fixture.detectChanges();

      expect(marker().left).toBe('0px');
      expect(marker().right).toBe(gap);
    });

    it('leaves a field padding of its own alone', () => {
      const text = fieldText();

      set('--formidable-option-prefix-inset', '0px');
      fixture.detectChanges();

      expect(fieldText()).toBe(text);
    });
  });

  describe('empty state', () => {
    it('takes the inset an option gets from its marker', () => {
      expect(emptyState()).toBe(marker().left);
    });

    it('moves out with the options', () => {
      set('--formidable-option-prefix-inset', '0px');
      fixture.detectChanges();

      expect(emptyState()).toBe('0px');
    });
  });
});
