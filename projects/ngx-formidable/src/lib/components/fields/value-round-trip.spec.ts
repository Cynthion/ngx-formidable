import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NgxMaskDirective } from 'ngx-mask';
import { page, userEvent } from 'vitest/browser';
import { bindField, FORMS_APIS } from '../../testing/bind-field';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';

/**
 * Contract of the value round trip: clearing a written-in value reaches the model as the empty string, so a
 * required rule on the field fires. A masked value is what ngx-mask reports, per **Masking** in
 * `user/fields.md`: the text without the mask's literals, unless `dropSpecialCharacters` is off.
 */

const MASK = '000 000 00 00';

/** A bare ngx-mask that draws its slots, with its `value` model bound. */
@Component({
  imports: [NgxMaskDirective],
  template: `<input
    aria-label="Phone"
    mask="000 000 00 00"
    [showMaskTyped]="true"
    [(value)]="value" />`
})
class BoundMaskHost {
  readonly value = signal('');
}

describe('value round trip', () => {
  beforeEach(() => configureFormidableTestBed());

  for (const api of FORMS_APIS) {
    for (const kind of ['input', 'textarea'] as const) {
      it(`reports a written-in value being cleared from an ${kind}, bound ${api}`, async () => {
        const { value } = await bindField(kind, api, {
          value: 'Cynthion',
          decorated: true,
          decoration: '<div formidableFieldLabel>Name</div>'
        });

        await userEvent.clear(page.getByRole('textbox', { name: 'Name' }));

        await expect.poll(value).toBe('');
      });
    }

    // ngx-mask clears the whole text on `keydown` itself, with no `input` event to follow.
    it(`reports a written-in masked value being wiped by Backspace, bound ${api}`, async () => {
      const { value } = await bindField('input', api, {
        value: '0791234567',
        inputs: { mask: MASK, maskConfig: { showMaskTyped: true } },
        decorated: true,
        decoration: '<div formidableFieldLabel>Phone</div>'
      });

      await userEvent.tab();
      await userEvent.keyboard('{Backspace}');

      await expect.poll(value).toBe('');
    });
  }

  for (const [dropSpecialCharacters, written] of [
    [true, '0791234567'],
    [false, '079 123 45 67']
  ] as const) {
    it(`writes ${written} for a number typed into a mask, dropSpecialCharacters ${dropSpecialCharacters}`, async () => {
      const { value } = await bindField('input', 'signal', {
        inputs: { mask: MASK, maskConfig: { dropSpecialCharacters } },
        decorated: true,
        decoration: '<div formidableFieldLabel>Phone</div>'
      });

      await userEvent.tab();
      await userEvent.keyboard('0791234567');

      await expect.poll(value).toBe(written);
    });
  }

  // ngx-mask's own defect, which is why the masked fields write through its `writeValue` instead of binding
  // its model, pinned so it is noticed once it closes: https://github.com/NepipenkoIgor/ngx-mask/issues/1671.
  it('loses a value written to the bound model of a bare ngx-mask drawing its slots', async () => {
    const fixture = TestBed.createComponent(BoundMaskHost);
    await settle(fixture);

    fixture.componentInstance.value.set('0791234567');
    await settle(fixture);

    expect(fixture.componentInstance.value()).toBe('');
    expect(page.getByRole('textbox', { name: 'Phone' }).element()).toHaveValue('___ ___ __ __');
  });
});
