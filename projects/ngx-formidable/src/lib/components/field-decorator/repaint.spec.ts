import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { FieldLabel } from '../../directives/field-label';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';
import { InputField } from '../fields/input-field/input-field';
import { FieldDecorator } from './field-decorator';

/**
 * Contract of the decorator's repaint. Everything it renders is read off the projected field — `readonly`,
 * `disabled`, `placeholder`, the value — and none of it is the decorator's own input, so nothing tells it
 * they moved. The signal read inside each getter is what marks its view, and there is nothing else: make
 * `canLabelRest` a plain getter over plain fields again and every assertion below fails with the decorator
 * stuck on its first render.
 *
 * Asserted against the decorator's own **template**, never its host classes: host bindings are evaluated in
 * the parent's view, which the host's own signal write refreshes anyway. `settle()` never calls
 * `detectChanges()`, so a repaint that arrives is the decorator's own doing.
 *
 * `label-position.spec.ts` covers where a label lands. This covers only that it follows at all.
 */

@Component({
  imports: [FieldDecorator, InputField, FieldLabel],
  template: `
    <formidable-field-decorator>
      <label
        formidableFieldLabel
        position="inside"
        >Name</label
      >
      <formidable-input-field
        name="field"
        [placeholder]="placeholder()"
        [readonly]="readonly()"
        [disabled]="disabled()" />
    </formidable-field-decorator>
  `
})
class LabelStateHost {
  readonly placeholder = signal('');
  readonly readonly = signal(false);
  readonly disabled = signal(false);
}

@Component({
  imports: [FormsModule, FieldDecorator, FieldLabel, InputField],
  template: `
    <form>
      <formidable-field-decorator>
        <label formidableFieldLabel>Name</label>
        <formidable-input-field
          name="name"
          [ngModel]="'written in'" />
      </formidable-field-decorator>
    </form>
  `
})
class WrittenInHost {}

describe('decorator repaint', () => {
  let fixture: ComponentFixture<LabelStateHost>;

  /** The class the decorator's template writes out of `labelState`. */
  function labelState(): string {
    const wrapper = fixture.nativeElement.querySelector('.label-wrapper') as HTMLElement;

    return Array.from(wrapper.classList).find(
      (name) => name.startsWith('label-') && name !== 'label-wrapper' && name !== 'label-animated'
    )!;
  }

  beforeEach(async () => {
    configureFormidableTestBed();

    fixture = TestBed.createComponent(LabelStateHost);
    await settle(fixture);
  });

  it('follows the field out of resting when it is made readonly', async () => {
    expect(labelState()).toBe('label-resting');

    fixture.componentInstance.readonly.set(true);
    await settle(fixture);

    expect(labelState()).toBe('label-floating');
  });

  it('follows the field out of resting when it is disabled', async () => {
    fixture.componentInstance.disabled.set(true);
    await settle(fixture);

    expect(labelState()).toBe('label-floating');
  });

  // A `placeholder` leaves an `inside` label nothing to rest in.
  it('follows a placeholder added at runtime', async () => {
    fixture.componentInstance.placeholder.set('Your name');
    await settle(fixture);

    expect(labelState()).toBe('label-floating');
  });

  /**
   * The label gate opens one bare `requestAnimationFrame` after the first render. Two claims: the initial
   * resting-to-floating correction lands before the gate, so it is never animated; and the gate's own signal
   * write is what repaints, with nothing else marking the decorator.
   */
  it('floats a written-in value without animating it, then releases the gate from a bare frame', async () => {
    const written = TestBed.createComponent(WrittenInHost);
    const label = () => written.nativeElement.querySelector('.label-wrapper') as HTMLElement;

    written.detectChanges();

    // `NgForm` registers the control across a microtask, so the first render has no value yet.
    expect(label().classList).toContain('label-resting');

    const animatedWhenFloated = new Promise<boolean>((resolve) => {
      new MutationObserver((_, observer) => {
        if (!label().classList.contains('label-floating')) return;

        observer.disconnect();
        resolve(label().classList.contains('label-animated'));
      }).observe(label(), { attributeFilter: ['class'] });
    });

    expect(await animatedWhenFloated).toBe(false);

    await settle(written);

    expect(label().classList).toContain('label-animated');
  });
});
