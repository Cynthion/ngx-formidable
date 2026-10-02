import { Component, signal } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import { form, FormField, max, min, readonly } from '@angular/forms/signals';
import { FieldDecorator, FieldLabel } from '@cynthion/ngx-formidable';
import { page, userEvent } from 'vitest/browser';
import { openPage, settle } from '../portal/testing/studio';
import { ExampleCounterField } from './example-counter-field';

@Component({
  imports: [FormField, FieldDecorator, FieldLabel, ExampleCounterField],
  template: `
    <formidable-field-decorator>
      <example-counter-field [formField]="form.pets" />
      <div formidableFieldLabel>Pets</div>
    </formidable-field-decorator>
  `
})
class CounterHost {
  readonly model = signal({ pets: 1 });
  readonly readonly = signal(false);
  readonly form = form(this.model, (path) => {
    min(path.pets, 0);
    max(path.pets, 3);
    readonly(path.pets, () => this.readonly());
  });
}

/**
 * The custom field `user/custom-fields.md` quotes as it ships, held to what a library field holds: named by
 * its decorator, stepped from the keyboard and its buttons, and **The Clamp Is On The Step**. If any of this
 * breaks, that guide is wrong.
 */
describe('custom field contract: example-counter-field', () => {
  let fixture: ComponentFixture<CounterHost>;

  const counter = () => page.getByRole('spinbutton', { name: 'Pets' });

  /** The value as the counter states it, to assistive technology and on screen, and as the model holds it. */
  async function expectValue(value: number): Promise<void> {
    await expect.element(counter()).toHaveAttribute('aria-valuenow', String(value));
    await expect.element(counter().getByText(String(value), { exact: true })).toBeVisible();
    expect(fixture.componentInstance.model().pets).toBe(value);
  }

  beforeEach(async () => {
    fixture = await openPage(CounterHost);
  });

  it('is named by its decorator, and states the value the model holds', async () => {
    await expectValue(1);
  });

  it('steps up on ArrowUp and down on ArrowDown', async () => {
    await userEvent.click(counter());

    await userEvent.keyboard('{ArrowUp}');
    await expectValue(2);

    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await expectValue(0);
  });

  it('steps on a press of its buttons, and keeps the focus on the field', async () => {
    await userEvent.click(counter().getByText('+'));

    await expectValue(2);
    await expect.element(counter()).toHaveFocus();

    await userEvent.click(counter().getByText('−'));

    await expectValue(1);
    await expect.element(counter()).toHaveFocus();
  });

  it('stops a step at both ends rather than running past them', async () => {
    await userEvent.click(counter());

    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await expectValue(0);

    await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}{ArrowUp}');
    await expectValue(3);
  });

  it('renders a value the forms API writes outside its limits as it is', async () => {
    fixture.componentInstance.model.set({ pets: 7 });

    await expectValue(7);
  });

  it('ignores the keys while readonly', async () => {
    fixture.componentInstance.readonly.set(true);
    await expect.element(counter()).toHaveAttribute('aria-readonly', 'true');

    await userEvent.click(counter());
    await userEvent.keyboard('{ArrowUp}');
    await settle(fixture);

    await expectValue(1);
  });
});
