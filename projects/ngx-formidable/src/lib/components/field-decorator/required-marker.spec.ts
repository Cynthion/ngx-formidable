import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { FieldLabel } from '../../directives/field-label';
import { NgxFormidableForm } from '../../forms/form.directive';
import { FieldLabelPosition } from '../../models/formidable.model';
import { configureFormidableTestBed } from '../../testing/test-bed';
import { InputField } from '../fields/input-field/input-field';
import { RadioGroupField } from '../fields/radio-group-field/radio-group-field';
import { FieldDecorator } from './field-decorator';

/**
 * Contract of the label's required marker.
 *
 * `required` is declared on the field and mirrored by the decorator, which suffixes the marker to
 * the label. The marker is a sibling of the projected label rather than part of it, and that is the whole
 * point: the label wrapper is a flex row, so when a label is too long to fit, the consumer's own text is
 * what ellipsizes and the marker survives at full width. Its glyph comes from a theme variable, and it
 * carries no colour of its own, so it follows the label through every state.
 *
 * The field validates nothing, and nothing here asserts validity. Under `ngModel` the same `required`
 * attribute also attaches Angular's own `RequiredValidator`, which is that API's rule and not the field's.
 *
 * A form may hide every marker on it at once with `hideRequiredMarkers`.
 */

@Component({
  imports: [FieldDecorator, InputField, FieldLabel],
  template: `
    <formidable-field-decorator [style.width.rem]="width">
      <formidable-input-field
        name="field"
        [required]="required" />
      @if (hasLabel) {
        <div
          formidableFieldLabel
          [position]="position">
          {{ label }}
        </div>
      }
    </formidable-field-decorator>
  `
})
class InputHost {
  required = false;
  hasLabel = true;
  label = 'Label';
  position: FieldLabelPosition = 'outside';
  width = 20;
}

/** A group renders its label as a plain `div` instead of a `label`, so the marker has to reach both. */
@Component({
  imports: [FieldDecorator, RadioGroupField, FieldLabel],
  template: `
    <formidable-field-decorator>
      <formidable-radio-group-field
        name="field"
        [required]="true" />
      <div
        formidableFieldLabel
        position="outside">
        Label
      </div>
    </formidable-field-decorator>
  `
})
class RadioGroupHost {}

/** The form-wide switch: one flag hides every marker on the form, whatever its fields asked for. */
@Component({
  imports: [FormsModule, NgxFormidableForm, FieldDecorator, InputField, FieldLabel],
  template: `
    <form
      formidableForm
      [hideRequiredMarkers]="hideRequiredMarkers()">
      <formidable-field-decorator>
        <formidable-input-field
          name="field"
          ngModel
          [required]="true" />
        <div
          formidableFieldLabel
          position="outside">
          Label
        </div>
      </formidable-field-decorator>
    </form>
  `
})
class FormHost {
  readonly hideRequiredMarkers = signal(false);
}

describe('required marker', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<InputHost>>;
  let host: InputHost;

  beforeEach(() => {
    configureFormidableTestBed();

    fixture = TestBed.createComponent(InputHost);
    host = fixture.componentInstance;
  });

  function marker(): HTMLElement | null {
    return fixture.nativeElement.querySelector('.required-marker');
  }

  /** What the marker actually paints — an empty span whose glyph is generated content. */
  function markerGlyph(): string {
    return getComputedStyle(marker() as HTMLElement, '::after').content;
  }

  it('renders no marker while the field is not required', () => {
    fixture.detectChanges();

    expect(marker()).toBeNull();
  });

  it('suffixes the marker to the label once the field is required', () => {
    host.required = true;
    fixture.detectChanges();

    const wrapper = fixture.nativeElement.querySelector('.label-wrapper') as HTMLElement;

    expect(wrapper.tagName.toLowerCase()).toBe('label');
    // Last child, so it reads as a suffix and not as a prefix.
    expect(wrapper.lastElementChild).toBe(marker());
  });

  it('hides the marker from assistive tech', () => {
    host.required = true;
    fixture.detectChanges();

    expect(marker()?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders the marker in a group label too, which is a div rather than a label', () => {
    const radioFixture = TestBed.createComponent(RadioGroupHost);
    radioFixture.detectChanges();

    const wrapper = radioFixture.nativeElement.querySelector('.label-wrapper') as HTMLElement;

    expect(wrapper.tagName.toLowerCase()).toBe('div');
    expect(wrapper.querySelector('.required-marker')).not.toBeNull();
  });

  it('lets the form hide every marker on it, and give them back', () => {
    const formFixture = TestBed.createComponent(FormHost);
    formFixture.detectChanges();

    expect(formFixture.nativeElement.querySelector('.required-marker')).not.toBeNull();

    formFixture.componentInstance.hideRequiredMarkers.set(true);
    formFixture.detectChanges();

    expect(formFixture.nativeElement.querySelector('.required-marker')).toBeNull();
    // The glyph only: the field still tells assistive tech what it is.
    expect(formFixture.nativeElement.querySelector('input')?.getAttribute('aria-required')).toBe('true');
  });

  it('shows nothing when the field is required but projects no label', () => {
    host.required = true;
    host.hasLabel = false;
    fixture.detectChanges();

    // The marker is a suffix: with no label to suffix, the wrapper it lives in collapses with it.
    expect(marker()?.getBoundingClientRect().width).toBe(0);
  });

  it('takes its glyph from the theme, and follows an override', () => {
    host.required = true;
    fixture.detectChanges();

    expect(markerGlyph()).toBe('"*"');

    fixture.nativeElement.style.setProperty('--formidable-label-required-marker', '" (required)"');
    fixture.detectChanges();

    expect(markerGlyph()).toBe('" (required)"');
  });

  // The reason the marker is a sibling of the projected label rather than a child of it.
  (['inside-floating', 'border'] as FieldLabelPosition[]).forEach((position) => {
    it(`survives at full width while a ${position} label ellipsizes`, () => {
      host.required = true;
      host.position = position;
      host.label = 'A label far too long to ever fit inside this field';
      host.width = 8;
      fixture.detectChanges();

      const wrapper = fixture.nativeElement.querySelector('.label-wrapper') as HTMLElement;
      const text = wrapper.firstElementChild as HTMLElement;
      const markerRect = (marker() as HTMLElement).getBoundingClientRect();

      // The consumer's text is the thing that ran out of room...
      expect(text.scrollWidth).toBeGreaterThan(text.clientWidth);
      // ...while the marker keeps its glyph, inside the wrapper's own bounds.
      expect(markerRect.width).toBeGreaterThan(0);
      expect(markerRect.right).toBeLessThanOrEqual(wrapper.getBoundingClientRect().right + 1);
    });
  });
});
