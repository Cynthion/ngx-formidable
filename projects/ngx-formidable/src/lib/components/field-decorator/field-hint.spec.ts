import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { page } from 'vitest/browser';
import { FieldHint } from '../../directives/field-hint';
import { FieldLabel } from '../../directives/field-label';
import { bindField, BindFieldOptions } from '../../testing/bind-field';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';
import { InputField } from '../fields/input-field/input-field';
import { FieldDecorator } from './field-decorator';

/**
 * Per **Hints** in `user/decoration.md`: hints sit on a row below the field and above the messages, share it
 * in equal parts and each align their own text. The row is sized by its content, collapses while nothing is
 * projected, and leaves the spacing below the decorator to the consumer.
 */

/** A hint that comes and goes, the way a consumer's own `@if` moves it. */
@Component({
  imports: [FieldDecorator, InputField, FieldLabel, FieldHint],
  template: `
    <formidable-field-decorator>
      <formidable-input-field />
      <div formidableFieldLabel>Name</div>
      @if (showHint()) {
        <div formidableFieldHint>Note</div>
      }
    </formidable-field-decorator>
  `
})
class HintHost {
  readonly showHint = signal(false);
}

const rect = (text: string) => page.getByText(text).element().getBoundingClientRect();
const field = () => page.getByRole('textbox', { name: 'Name' }).element().getBoundingClientRect();
const decorator = () => document.querySelector('formidable-field-decorator')!.getBoundingClientRect();

/** Where a hint's text sits, which is what alignment means to a reader. */
function textRect(text: string): DOMRect {
  const range = document.createRange();
  range.selectNodeContents(page.getByText(text).element());

  return range.getBoundingClientRect();
}

/** Binds a decorated field labelled `Name`, with `hints` projected beside it. */
const bind = (hints: string, options: BindFieldOptions = {}) =>
  bindField('input', 'signal', {
    decorated: true,
    decoration: `<div formidableFieldLabel>Name</div>${hints}`,
    ...options
  });

describe('field hint', () => {
  beforeEach(() => configureFormidableTestBed());

  it('renders below the field and above the messages', async () => {
    await bind('<div formidableFieldHint>Note</div>', { inputs: { revealOn: 'always' }, state: { invalid: true } });

    expect(rect('Note').top).toBeGreaterThanOrEqual(field().bottom);
    expect(rect('invalid').top).toBeGreaterThanOrEqual(rect('Note').bottom);
  });

  it('shares one row evenly between two hints', async () => {
    await bind('<div formidableFieldHint>Note</div><div formidableFieldHint align="end">3 / 150</div>');

    expect(rect('Note').top).toBeCloseTo(rect('3 / 150').top, 1);
    expect(rect('Note').width).toBeCloseTo(rect('3 / 150').width, 1);
    expect(rect('Note').right).toBeLessThanOrEqual(rect('3 / 150').left + 0.5);
  });

  it('aligns each hint on its own', async () => {
    await bind(
      '<div formidableFieldHint>Start</div>' +
        '<div formidableFieldHint align="center">Centre</div>' +
        '<div formidableFieldHint align="end">End</div>'
    );

    expect(textRect('Start').left).toBeCloseTo(rect('Start').left, 1);
    expect(textRect('Centre').left - rect('Centre').left).toBeCloseTo(
      rect('Centre').right - textRect('Centre').right,
      1
    );
    expect(textRect('End').right).toBeCloseTo(rect('End').right, 1);
  });

  it('sizes the row to its hint, and collapses it while none is projected', async () => {
    const fixture = TestBed.createComponent(HintHost);
    await settle(fixture);

    expect(decorator().bottom).toBeCloseTo(field().bottom, 1);

    fixture.componentInstance.showHint.set(true);
    await settle(fixture);

    expect(rect('Note').height).toBeGreaterThan(0);
    expect(decorator().bottom).toBeCloseTo(rect('Note').bottom, 1);

    fixture.componentInstance.showHint.set(false);
    await settle(fixture);

    expect(decorator().bottom).toBeCloseTo(field().bottom, 1);
  });

  it('leaves the spacing below the decorator to the consumer', async () => {
    await bind('<div formidableFieldHint>Note</div>', { after: '<div>Next</div>' });

    expect(rect('Next').top).toBeCloseTo(decorator().bottom, 1);
  });
});
