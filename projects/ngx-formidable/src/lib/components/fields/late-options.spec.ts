import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideNgxMask } from 'ngx-mask';
import { IFormidableOption } from '../../models/formidable.model';
import { FieldOptionComponent } from '../field-option/field-option.component';
import { InputFieldComponent } from './input-field/input-field.component';
import { SelectFieldComponent } from './select-field/select-field.component';
import { TextareaFieldComponent } from './textarea-field/textarea-field.component';

/**
 * A value written before the field can hold it survives.
 *
 * Two fields cannot take a value at the moment the form writes it, and both used to read the element back
 * afterwards and so overwrite the value with what the element happened to hold: a native `<select>` drops a
 * value it has no `<option>` for, and a masked `<input>` reads back the empty mask until ngxMask has
 * initialised across a full task. Both now re-apply the value they were **given**.
 */

@Component({
  imports: [FormsModule, SelectFieldComponent, FieldOptionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form>
      <formidable-select-field
        name="era"
        [options]="options"
        [ngModel]="value">
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
class ProjectedSelectHostComponent {
  // Deliberately not the first option: a native `<select>` selects that one on its own, so a value that
  // happened to match it would pass whether or not the field ever applied what it was given.
  value: string | null = 'renaissance';
  options: IFormidableOption[] = [];
}

@Component({
  imports: [FormsModule, InputFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form>
      <formidable-input-field
        name="identifier"
        mask="AAA-0000"
        [maskConfig]="{ showMaskTyped: true }"
        [ngModel]="value" />
    </form>
  `
})
class MaskedInputHostComponent {
  value: string | null = 'TTA4417';
}

@Component({
  imports: [FormsModule, TextareaFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form>
      <formidable-textarea-field
        name="identifier"
        mask="AAA-AAA"
        [maskConfig]="{ showMaskTyped: true }"
        [ngModel]="value" />
    </form>
  `
})
class MaskedTextareaHostComponent {
  value: string | null = 'abcdef';
}

describe('a value written before the field can hold it', () => {
  function settle(fixture: ComponentFixture<unknown>): void {
    for (let i = 0; i < 3; i++) {
      fixture.detectChanges();
      tick(100);
    }
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideNgxMask()] });
  });

  it('survives on a select whose options are projected', fakeAsync(() => {
    const fixture = TestBed.createComponent(ProjectedSelectHostComponent);
    settle(fixture);

    const select = (fixture.nativeElement as HTMLElement).querySelector('select') as HTMLSelectElement;

    expect(select.value).toBe('renaissance');
  }));

  // The risk the fallback carries: it must never outrank what the element already holds, or a later pick
  // would be reverted to the value the form wrote at startup the next time the option list moves.
  it('does not revert a later pick when the option list changes', fakeAsync(() => {
    const fixture = TestBed.createComponent(ProjectedSelectHostComponent);
    settle(fixture);

    const select = (fixture.nativeElement as HTMLElement).querySelector('select') as HTMLSelectElement;

    select.value = 'industrial';
    select.dispatchEvent(new Event('change'));
    settle(fixture);

    fixture.componentInstance.options = [{ value: 'bronze', label: 'Bronze Age' }];
    settle(fixture);

    expect(select.value).toBe('industrial');
  }));

  it('survives on a masked input, formatted by its mask', fakeAsync(() => {
    const fixture = TestBed.createComponent(MaskedInputHostComponent);
    settle(fixture);

    const input = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;

    expect(input.value).toBe('TTA-4417');
  }));

  it('survives on a masked textarea, formatted by its mask', fakeAsync(() => {
    const fixture = TestBed.createComponent(MaskedTextareaHostComponent);
    settle(fixture);

    const textarea = (fixture.nativeElement as HTMLElement).querySelector('textarea') as HTMLTextAreaElement;

    expect(textarea.value).toBe('abc-def');
  }));

  it('does not resurrect a value the user has since cleared', fakeAsync(() => {
    const fixture = TestBed.createComponent(MaskedInputHostComponent);
    settle(fixture);

    const input = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;

    input.value = '';
    input.dispatchEvent(new Event('input'));
    settle(fixture);

    expect(input.value).not.toContain('TTA');
  }));
});
