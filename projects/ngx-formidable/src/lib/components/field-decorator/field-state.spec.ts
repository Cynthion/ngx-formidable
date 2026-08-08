import { Component } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideNgxMask } from 'ngx-mask';
import { enforce, only, staticSuite, test as vestTest } from 'vest';
import { FieldErrorsDirective } from '../../directives/field-errors.directive';
import { FieldLabelDirective } from '../../directives/field-label.directive';
import { NgxFormidableFormModelDirective } from '../../directives/form-model.directive';
import { NgxFormidableFormDirective } from '../../directives/form.directive';
import { InputFieldComponent } from '../fields/input-field/input-field.component';
import { RadioGroupFieldComponent } from '../fields/radio-group-field/radio-group-field.component';
import { FieldDecoratorComponent } from './field-decorator.component';

/**
 * Contract of the field's state colours.
 *
 * Every state is a set of custom-property remaps rather than a set of property declarations, so the order
 * the state blocks are written in inside the `field` mixin *is* their precedence:
 * hovered < focused < invalid < readonly < disabled. These specs pin that chain down, and pin down that
 * the label follows the same states from the decorator's host — the label is not in the field, so it is
 * the one part that would silently keep the base colour.
 *
 * Colours are compared against the theme's own `:root` variables rather than against literals, so a
 * retheme cannot make these pass for the wrong reason.
 */

/** The declared value of a theme variable, resolved the way the browser resolves it. */
function token(name: string): string {
  const probe = document.createElement('div');
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);

  const value = getComputedStyle(probe).color;
  probe.remove();

  return value;
}

@Component({
  standalone: true,
  imports: [FieldDecoratorComponent, InputFieldComponent, FieldLabelDirective],
  template: `
    <formidable-field-decorator>
      <formidable-input-field
        name="field"
        [readonly]="readonly"
        [disabled]="disabled" />
      <div
        formidableFieldLabel
        position="outside">
        Label
      </div>
    </formidable-field-decorator>
  `
})
class InputHostComponent {
  readonly = false;
  disabled = false;
}

@Component({
  standalone: true,
  imports: [FieldDecoratorComponent, RadioGroupFieldComponent, FieldLabelDirective],
  template: `
    <formidable-field-decorator>
      <formidable-radio-group-field name="field" />
      <div formidableFieldLabel>Label</div>
    </formidable-field-decorator>
  `
})
class RadioGroupHostComponent {}

interface NameModel {
  name?: string;
}

/** A real form, so the flag is proven to travel from the Vest suite all the way to the host class. */
@Component({
  standalone: true,
  imports: [
    FormsModule,
    NgxFormidableFormDirective,
    NgxFormidableFormModelDirective,
    FieldDecoratorComponent,
    InputFieldComponent,
    FieldErrorsDirective,
    FieldLabelDirective
  ],
  template: `
    <form
      formidableForm
      [formValue]="formValue"
      [formFrame]="frame"
      [formSuite]="suite"
      (formValueChange$)="formValue = $event">
      <formidable-field-decorator>
        <formidable-input-field
          formidableFieldErrors
          name="name"
          [ngModel]="formValue.name" />
        <div formidableFieldLabel>Name</div>
      </formidable-field-decorator>
    </form>
  `
})
class ValidatedHostComponent {
  formValue: NameModel = {};
  frame: Required<NameModel> = { name: '' };
  suite = staticSuite((model: NameModel, field?: string) => {
    if (field) only(field);

    vestTest('name', 'Required', () => {
      enforce(model.name).isNotBlank();
    });
  });
}

describe('field state colors', () => {
  let fixture: ComponentFixture<InputHostComponent>;
  let host: InputHostComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideNgxMask()] });

    fixture = TestBed.createComponent(InputHostComponent);
    host = fixture.componentInstance;

    // The label transitions its colour, so a read straight after a state change would return a point
    // part-way through the interpolation. These assertions are about where a state lands.
    fixture.nativeElement.style.setProperty('--formidable-animation-duration', '0s');
    fixture.detectChanges();
  });

  function decorator(): HTMLElement {
    return fixture.nativeElement.querySelector('formidable-field-decorator') as HTMLElement;
  }

  function field(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input') as HTMLInputElement;
  }

  function label(): HTMLElement {
    return fixture.nativeElement.querySelector('.label-wrapper') as HTMLElement;
  }

  /** The states the decorator owns; hover is the browser's and cannot be simulated. */
  function setState(state: 'is-focused' | 'is-invalid' | ''): void {
    decorator().classList.remove('is-focused', 'is-invalid');
    if (state) decorator().classList.add(state);
  }

  describe('the field', () => {
    it('takes the base colours with nothing going on', () => {
      expect(getComputedStyle(field()).borderTopColor).toBe(token('--formidable-color-field-border'));
      expect(getComputedStyle(field()).backgroundColor).toBe(token('--formidable-color-field-background'));
    });

    it('takes the invalid border and focus ring while invalid', () => {
      setState('is-invalid');

      expect(getComputedStyle(field()).borderTopColor).toBe(token('--formidable-color-field-border-invalid'));
      expect(getComputedStyle(field()).borderTopColor).not.toBe(token('--formidable-color-field-border'));
    });

    // The whole reason the states are remaps and not declarations: a focused field is touched by
    // definition, so focused-and-invalid is the common case, not the corner one.
    it('stays invalid while focused', () => {
      setState('is-invalid');
      field().classList.add('focused');

      expect(getComputedStyle(field()).borderTopColor).toBe(token('--formidable-color-field-border-invalid'));
      expect(getComputedStyle(field()).boxShadow).toContain(token('--formidable-color-field-border-invalid'));
    });

    // The states are variable remaps, so a field that hovers while invalid resolves the *hover* colour —
    // which is why `invalid-colors` has to point that one at the invalid colour too, not just the base.
    it('stays invalid while hovered', () => {
      setState('is-invalid');

      // `:hover` cannot be simulated, so this reads the colour the hover rule would resolve to.
      const style = getComputedStyle(field());

      expect(style.getPropertyValue('--formidable-color-field-border-hovered').trim()).toBe(
        style.getPropertyValue('--formidable-color-field-border-invalid').trim()
      );
    });

    it('lets readonly and disabled outrank invalid', () => {
      setState('is-invalid');
      host.readonly = true;
      fixture.detectChanges();

      expect(getComputedStyle(field()).backgroundColor).toBe(token('--formidable-color-field-background-readonly'));
      expect(getComputedStyle(field()).borderTopColor).toBe(token('--formidable-color-field-border-readonly'));

      host.readonly = false;
      host.disabled = true;
      fixture.detectChanges();

      expect(getComputedStyle(field()).backgroundColor).toBe(token('--formidable-color-field-background-disabled'));
      expect(getComputedStyle(field()).borderTopColor).toBe(token('--formidable-color-field-border-disabled'));
    });
  });

  // The label is the decorator's own element, so none of the field's state rules reach it — it follows
  // the same states from the host instead, and all three label colours move together.
  describe('the label', () => {
    it('takes the base colour with nothing going on', () => {
      expect(getComputedStyle(label()).color).toBe(token('--formidable-color-field-label'));
    });

    it('takes the focus colour while focused', () => {
      setState('is-focused');

      expect(getComputedStyle(label()).color).toBe(token('--formidable-color-field-label-focus'));
    });

    it('takes the invalid colour while invalid, and keeps it while focused', () => {
      setState('is-invalid');
      expect(getComputedStyle(label()).color).toBe(token('--formidable-color-field-label-invalid'));

      decorator().classList.add('is-focused');
      expect(getComputedStyle(label()).color).toBe(token('--formidable-color-field-label-invalid'));
    });

    it('dims with the field when readonly or disabled', () => {
      host.readonly = true;
      fixture.detectChanges();
      expect(getComputedStyle(label()).color).toBe(token('--formidable-color-field-label-readonly'));

      host.readonly = false;
      host.disabled = true;
      fixture.detectChanges();
      expect(getComputedStyle(label()).color).toBe(token('--formidable-color-field-label-disabled'));
    });
  });

  // Everything above sets `.is-invalid` by hand. This is the claim that it gets there on its own: the
  // errors component computes validity, the directive hands it to the decorator, and the decorator —
  // deliberately not `OnPush` — turns it into the class the styling hangs off.
  it('raises the class from the control’s own validity', fakeAsync(() => {
    const formFixture = TestBed.createComponent(ValidatedHostComponent);
    const decoratorEl = () => formFixture.nativeElement.querySelector('formidable-field-decorator') as HTMLElement;
    const inputEl = () => formFixture.nativeElement.querySelector('input') as HTMLInputElement;

    formFixture.detectChanges();
    tick(100);
    formFixture.detectChanges();

    // Invalid, but untouched — nothing to report yet.
    expect(decoratorEl().classList.contains('is-invalid')).toBe(false);

    inputEl().dispatchEvent(new FocusEvent('focus'));
    inputEl().dispatchEvent(new FocusEvent('blur'));
    tick(100);
    formFixture.detectChanges();

    expect(decoratorEl().classList.contains('is-invalid')).toBe(true);
    expect(getComputedStyle(inputEl()).borderTopColor).toBe(token('--formidable-color-field-border-invalid'));

    // Satisfying the rule clears it again.
    inputEl().value = 'Chris';
    inputEl().dispatchEvent(new Event('input'));
    tick(100);
    formFixture.detectChanges();

    expect(decoratorEl().classList.contains('is-invalid')).toBe(false);
    expect(getComputedStyle(inputEl()).borderTopColor).toBe(token('--formidable-color-field-border'));

    formFixture.destroy();
  }));

  // A group's box is styled by `group-field`, a separate mixin — so its states are a separate claim.
  it('applies the same invalid colour to a group field', () => {
    const groupFixture = TestBed.createComponent(RadioGroupHostComponent);
    groupFixture.detectChanges();

    const box = groupFixture.nativeElement.querySelector('.field') as HTMLElement;
    const groupDecorator = groupFixture.nativeElement.querySelector('formidable-field-decorator') as HTMLElement;

    expect(getComputedStyle(box).borderTopColor).toBe(token('--formidable-color-field-group-border'));

    groupDecorator.classList.add('is-invalid');

    expect(getComputedStyle(box).borderTopColor).toBe(token('--formidable-color-field-border-invalid'));
  });
});
