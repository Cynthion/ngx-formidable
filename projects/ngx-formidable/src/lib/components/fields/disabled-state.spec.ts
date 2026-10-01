import { ChangeDetectorRef, Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';
import { FieldDecorator } from '../field-decorator/field-decorator';
import { InputField } from './input-field/input-field';

/**
 * Contract of the field's `disabled`: the input has **two** writers, and the field reports whichever changed
 * last. A consumer binds `[disabled]`, and `ngModel` writes its control's state when the control is disabled
 * programmatically. Each writes only when its own value changes, so neither undoes the other on a check
 * that changes nothing. Both paths are pinned below, and so is the state class the decorator hangs its
 * styling off.
 */

@Component({
  imports: [FormsModule, FieldDecorator, InputField],
  template: `
    <form>
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

  // The binding does not change here, so the only writer is `ngModel`, writing its control's state.
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

  // The last change wins, and a binding that does not change writes nothing, so a check of the host does
  // not hand the field back its `[disabled]="false"` and undo the control.
  it('does not let an unchanged binding undo the control', async () => {
    host.ngForm().control.get('name')!.disable();
    await settle(fixture);

    // A pass that re-checks the host, and with it the unchanged `[disabled]="false"`.
    fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck();
    await settle(fixture);

    expect(input().hasAttribute('disabled')).toBe(true);
    expect(decorator().classList.contains('is-disabled')).toBe(true);
  });
});
