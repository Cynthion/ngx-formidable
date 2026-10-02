import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { FormidableOption } from '../../models/formidable.model';
import { press } from '../../testing/dom';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';
import { DropdownField } from './dropdown-field/dropdown-field';

/**
 * A dropdown's value is a label the field draws, not text the user owns. The input showing it is
 * `readonly` and takes no pointer events, so no mouse gesture reaches it — but a select-all does, and
 * leaves a highlight the mouse could never have produced. CSS cannot close that: Chrome honours
 * `user-select: none` for a drag and ignores it for the editing command behind `Cmd/Ctrl+A`, so the
 * field prevents the key instead. A native `<select>` has no selectable text either.
 */

const options: FormidableOption[] = [
  { value: 'red', label: 'Red' },
  { value: 'blue', label: 'Blue' }
];

@Component({
  imports: [FormsModule, DropdownField],
  template: `
    <formidable-dropdown-field
      name="colour"
      [options]="options" />
  `
})
class TestHost {
  options: FormidableOption[] = options;
}

describe('display-only value selection', () => {
  let fixture: ComponentFixture<TestHost>;
  let input: HTMLInputElement;

  afterEach(() => fixture?.destroy());

  beforeEach(async () => {
    configureFormidableTestBed();

    fixture = TestBed.createComponent(TestHost);
    await settle(fixture);

    input = (fixture.nativeElement as HTMLElement).querySelector('.wrapped-input') as HTMLInputElement;
  });

  it('prevents a select-all with the meta key', () => {
    expect(press(input, 'a', { metaKey: true }).defaultPrevented).toBe(true);
  });

  it('prevents a select-all with the control key', () => {
    expect(press(input, 'a', { ctrlKey: true }).defaultPrevented).toBe(true);
  });

  it('prevents it regardless of the reported case', () => {
    expect(press(input, 'A', { metaKey: true }).defaultPrevented).toBe(true);
  });

  it('leaves a bare "a" to the typeahead', () => {
    expect(press(input, 'a').defaultPrevented).toBe(false);
  });

  it('leaves other modifier combos alone, so a copy or a reload still reaches the browser', () => {
    expect(press(input, 'c', { metaKey: true }).defaultPrevented).toBe(false);
    expect(press(input, 'r', { metaKey: true }).defaultPrevented).toBe(false);
  });
});
