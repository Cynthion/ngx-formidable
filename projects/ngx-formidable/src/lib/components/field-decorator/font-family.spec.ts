import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { page } from 'vitest/browser';
import { FieldHint } from '../../directives/field-hint';
import { FieldLabel } from '../../directives/field-label';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';
import { InputField } from '../fields/input-field/input-field';
import { TextareaField } from '../fields/textarea-field/textarea-field';
import { FieldDecorator } from './field-decorator';

/**
 * Per `--formidable-font-family` in `user/theme-reference.md`: set, it reaches every text the library renders,
 * decorated or not; unset, the library takes the page's family.
 */
@Component({
  imports: [FieldDecorator, InputField, TextareaField, FieldLabel, FieldHint],
  template: `
    <div
      style="font-family: serif"
      [style.--formidable-font-family]="family()">
      <formidable-field-decorator>
        <formidable-input-field />
        <div formidableFieldLabel>Label</div>
        <div formidableFieldHint>Hint</div>
      </formidable-field-decorator>
      <formidable-textarea-field />
    </div>
  `
})
class FontHost {
  readonly family = signal<string | null>('monospace');
}

describe('--formidable-font-family', () => {
  let fixture: ComponentFixture<FontHost>;

  beforeEach(async () => {
    configureFormidableTestBed();

    fixture = TestBed.createComponent(FontHost);
    await settle(fixture);
  });

  /** The family of the decorated input and the bare textarea, then of the label and the hint. */
  function families(): string[] {
    return [
      ...page.getByRole('textbox').elements(),
      page.getByText('Label').element(),
      page.getByText('Hint').element()
    ].map((element) => getComputedStyle(element).fontFamily);
  }

  it('reaches the field, its label, its hint and an undecorated field', () => {
    expect(families()).toEqual(['monospace', 'monospace', 'monospace', 'monospace']);
  });

  it('leaves the page family in force when unset', async () => {
    fixture.componentInstance.family.set(null);
    await settle(fixture);

    expect(families()).toEqual(['serif', 'serif', 'serif', 'serif']);
  });
});
