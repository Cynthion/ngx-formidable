import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { NgxFormidableForm } from '../../forms/form.directive';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';
import { FieldDecorator } from '../field-decorator/field-decorator';
import { InputField } from './input-field/input-field';

/**
 * Contract of the field's `disabled`: it has **two** writers, and the field has to report whichever wrote
 * last. A consumer binds `[disabled]`, and Angular's own forms call `setDisabledState` when the control is
 * disabled programmatically — neither goes through the other.
 *
 * That is why `disabled` is a `model` and not an `input`: a signal input cannot be written from inside, so
 * `setDisabledState` would have nowhere to put Angular's half and a `control.disable()` would render
 * nothing. Both paths are pinned below, and so is the state class the decorator hangs its styling off.
 */

@Component({
  imports: [FormsModule, NgxFormidableForm, FieldDecorator, InputField],
  template: `
    <form formidableForm>
      <formidable-field-decorator>
        <formidable-input-field
          name="name"
          [disabled]="disabled()"
          [ngModel]="model" />
      </formidable-field-decorator>
    </form>
  `
})
class DisabledHost {
  readonly ngForm = viewChild.required(NgForm);

  model = '';
  readonly disabled = signal(false);
}

describe('field disabled state', () => {
  let fixture: ComponentFixture<DisabledHost>;
  let host: DisabledHost;

  beforeEach(async () => {
    configureFormidableTestBed();

    fixture = TestBed.createComponent(DisabledHost);
    host = fixture.componentInstance;
    await settle(fixture);
  });

  function input(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input') as HTMLInputElement;
  }

  function decorator(): HTMLElement {
    return fixture.nativeElement.querySelector('formidable-field-decorator') as HTMLElement;
  }

  it('starts enabled', () => {
    expect(input().hasAttribute('disabled')).toBe(false);
    expect(decorator().classList.contains('is-disabled')).toBe(false);
  });

  it('follows the bound input', async () => {
    host.disabled.set(true);
    await settle(fixture);

    expect(input().hasAttribute('disabled')).toBe(true);
    expect(decorator().classList.contains('is-disabled')).toBe(true);

    host.disabled.set(false);
    await settle(fixture);

    expect(input().hasAttribute('disabled')).toBe(false);
    expect(decorator().classList.contains('is-disabled')).toBe(false);
  });

  // The claim the `model` exists for: nothing binds the input here, so the only writer is Angular's
  // `setDisabledState`. With a plain `input()` the field could not take this at all.
  it('follows a control disabled through Angular’s own forms', async () => {
    host.ngForm().control.get('name')!.disable();
    await settle(fixture);

    expect(input().hasAttribute('disabled')).toBe(true);
    expect(decorator().classList.contains('is-disabled')).toBe(true);

    host.ngForm().control.get('name')!.enable();
    await settle(fixture);

    expect(input().hasAttribute('disabled')).toBe(false);
    expect(decorator().classList.contains('is-disabled')).toBe(false);
  });

  // Last writer wins, and a binding that does not change is not a writer — so a change detection pass
  // does not hand the field back its own `[disabled]="false"` and undo the control. The rule the old
  // plain property followed, and the reason this is a `model` rather than a computed over both writers.
  it('does not let an unchanged binding undo the control', async () => {
    host.ngForm().control.get('name')!.disable();
    await settle(fixture);

    // A pass that re-checks the host, and with it the unchanged `[disabled]="false"`.
    fixture.componentRef.changeDetectorRef.markForCheck();
    await settle(fixture);

    expect(input().hasAttribute('disabled')).toBe(true);
    expect(decorator().classList.contains('is-disabled')).toBe(true);
  });
});
