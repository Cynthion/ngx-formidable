import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FieldHint } from '../../directives/field-hint';
import { FieldLabel } from '../../directives/field-label';
import { configureFormidableTestBed } from '../../testing/test-bed';
import { TextareaField } from '../fields/textarea-field/textarea-field';
import { InputField } from '../fields/input-field/input-field';
import { FieldDecorator } from './field-decorator';

/**
 * Contract of `--formidable-font-family`: set, it reaches every text the library renders, decorated or not;
 * unset, the library takes the page's family exactly as before.
 */
@Component({
  imports: [FieldDecorator, InputField, TextareaField, FieldLabel, FieldHint],
  template: `
    <div
      style="font-family: serif"
      [style.--formidable-font-family]="family()">
      <formidable-field-decorator>
        <formidable-input-field name="decorated" />
        <div formidableFieldLabel>Label</div>
        <div formidableFieldHint>Hint</div>
      </formidable-field-decorator>
      <formidable-textarea-field name="bare" />
    </div>
  `
})
class FontHost {
  readonly family = signal<string | null>('monospace');
}

describe('--formidable-font-family', () => {
  let fixture: ComponentFixture<FontHost>;
  let root: HTMLElement;

  beforeEach(() => {
    configureFormidableTestBed();

    fixture = TestBed.createComponent(FontHost);
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
  });

  function families(): string[] {
    return ['input', '[formidableFieldLabel]', '[formidableFieldHint]', 'textarea'].map(
      (selector) => getComputedStyle(root.querySelector(selector) as HTMLElement).fontFamily
    );
  }

  it('reaches the field, its label, its hint and an undecorated field', () => {
    expect(families()).toEqual(['monospace', 'monospace', 'monospace', 'monospace']);
  });

  it('leaves the page family in force when unset', () => {
    fixture.componentInstance.family.set(null);
    fixture.detectChanges();

    expect(families()).toEqual(['serif', 'serif', 'serif', 'serif']);
  });
});
