import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNgxMask } from 'ngx-mask';
import { FieldHintDirective } from '../../directives/field-hint.directive';
import { FieldLabelDirective } from '../../directives/field-label.directive';
import { TextareaFieldComponent } from '../fields/textarea-field/textarea-field.component';
import { InputFieldComponent } from '../fields/input-field/input-field.component';
import { FieldDecoratorComponent } from './field-decorator.component';

/**
 * Contract of `--formidable-font-family`: set, it reaches every text the library renders, decorated or not;
 * unset, the library takes the page's family exactly as before.
 */
@Component({
  imports: [
    FieldDecoratorComponent,
    InputFieldComponent,
    TextareaFieldComponent,
    FieldLabelDirective,
    FieldHintDirective
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div
      style="font-family: serif"
      [style.--formidable-font-family]="family">
      <formidable-field-decorator>
        <formidable-input-field name="decorated" />
        <div formidableFieldLabel>Label</div>
        <div formidableFieldHint>Hint</div>
      </formidable-field-decorator>
      <formidable-textarea-field name="bare" />
    </div>
  `
})
class FontHostComponent {
  family: string | null = 'monospace';
}

describe('--formidable-font-family', () => {
  let fixture: ComponentFixture<FontHostComponent>;
  let root: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideNgxMask()] });

    fixture = TestBed.createComponent(FontHostComponent);
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
    fixture.componentInstance.family = null;
    fixture.detectChanges();

    expect(families()).toEqual(['serif', 'serif', 'serif', 'serif']);
  });
});
