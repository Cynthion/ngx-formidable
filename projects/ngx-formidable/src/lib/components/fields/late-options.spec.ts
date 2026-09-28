import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { FormidableOption } from '../../models/formidable.model';
import { fill } from '../../testing/dom';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';
import { FieldOption } from '../field-option/field-option';
import { InputField } from './input-field/input-field';
import { SelectField } from './select-field/select-field';
import { TextareaField } from './textarea-field/textarea-field';

/**
 * A value written before the field can hold it survives.
 *
 * Two fields cannot take a value at the moment the form writes it, and both used to read the element back
 * afterwards and so overwrite the value with what the element happened to hold: a native `<select>` drops a
 * value it has no `<option>` for, and a masked `<input>` reads back the empty mask until ngxMask has
 * initialised across a full task. Both now re-apply the value they were **given**.
 */

@Component({
  imports: [FormsModule, SelectField, FieldOption],
  template: `
    <form>
      <formidable-select-field
        name="era"
        [options]="options()"
        [ngModel]="era">
        <formidable-field-option
          value="industrial"
          label="Industrial Revolution" />
        <formidable-field-option
          value="renaissance"
          label="Renaissance" />
      </formidable-select-field>
    </form>
  `
})
class ProjectedSelectHost {
  // Deliberately not the first option: a native `<select>` selects that one on its own, so a value that
  // happened to match it would pass whether or not the field ever applied what it was given.
  era: string | null = 'renaissance';
  readonly options = signal<FormidableOption[]>([]);
}

@Component({
  imports: [FormsModule, InputField],
  template: `
    <form>
      <formidable-input-field
        name="identifier"
        mask="AAA-0000"
        [maskConfig]="{ showMaskTyped: true }"
        [ngModel]="identifier" />
    </form>
  `
})
class MaskedInputHost {
  identifier: string | null = 'TTA4417';
}

@Component({
  imports: [FormsModule, TextareaField],
  template: `
    <form>
      <formidable-textarea-field
        name="identifier"
        mask="AAA-AAA"
        [maskConfig]="{ showMaskTyped: true }"
        [ngModel]="identifier" />
    </form>
  `
})
class MaskedTextareaHost {
  identifier: string | null = 'abcdef';
}

describe('a value written before the field can hold it', () => {
  /** Two passes: the first renders and writes the model, the second lets the task a masked write defers to land. */
  async function land(fixture: ComponentFixture<unknown>): Promise<void> {
    await settle(fixture);
    await settle(fixture);
  }

  beforeEach(() => configureFormidableTestBed());

  it('survives on a select whose options are projected', async () => {
    const fixture = TestBed.createComponent(ProjectedSelectHost);
    await land(fixture);

    const select = (fixture.nativeElement as HTMLElement).querySelector('select') as HTMLSelectElement;

    expect(select.value).toBe('renaissance');
  });

  // The risk the fallback carries: it must never outrank what the element already holds, or a later pick
  // would be reverted to the value the form wrote at startup the next time the option list moves.
  it('does not revert a later pick when the option list changes', async () => {
    const fixture = TestBed.createComponent(ProjectedSelectHost);
    await land(fixture);

    const select = (fixture.nativeElement as HTMLElement).querySelector('select') as HTMLSelectElement;

    select.value = 'industrial';
    select.dispatchEvent(new Event('change'));
    await land(fixture);

    fixture.componentInstance.options.set([{ value: 'bronze', label: 'Bronze Age' }]);
    await land(fixture);

    expect(select.value).toBe('industrial');
  });

  it('survives on a masked input, formatted by its mask', async () => {
    const fixture = TestBed.createComponent(MaskedInputHost);
    await land(fixture);

    const input = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;

    expect(input.value).toBe('TTA-4417');
  });

  it('survives on a masked textarea, formatted by its mask', async () => {
    const fixture = TestBed.createComponent(MaskedTextareaHost);
    await land(fixture);

    const textarea = (fixture.nativeElement as HTMLElement).querySelector('textarea') as HTMLTextAreaElement;

    expect(textarea.value).toBe('abc-def');
  });

  it('does not resurrect a value the user has since cleared', async () => {
    const fixture = TestBed.createComponent(MaskedInputHost);
    await land(fixture);

    const input = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;

    fill(input, '');
    await land(fixture);

    expect(input.value).not.toContain('TTA');
  });
});
