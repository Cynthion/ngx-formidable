import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { provideNgxMask } from 'ngx-mask';
import { NgxFormidableFormDirective } from '../../forms/form.directive';
import { FieldDecoratorComponent } from '../field-decorator/field-decorator.component';
import { InputFieldComponent } from './input-field/input-field.component';

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
  imports: [FormsModule, NgxFormidableFormDirective, FieldDecoratorComponent, InputFieldComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <form formidableForm>
      <formidable-field-decorator>
        <formidable-input-field
          name="name"
          [disabled]="disabled"
          [ngModel]="value" />
      </formidable-field-decorator>
    </form>
  `
})
class DisabledHostComponent {
  @ViewChild(NgForm, { static: true }) ngForm!: NgForm;

  value = '';
  disabled = false;
}

describe('field disabled state', () => {
  let fixture: ComponentFixture<DisabledHostComponent>;
  let host: DisabledHostComponent;

  beforeEach(fakeAsync(() => {
    TestBed.configureTestingModule({ providers: [provideNgxMask()] });

    fixture = TestBed.createComponent(DisabledHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }));

  function input(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input') as HTMLInputElement;
  }

  function decorator(): HTMLElement {
    return fixture.nativeElement.querySelector('formidable-field-decorator') as HTMLElement;
  }

  function settle(): void {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }

  it('starts enabled', () => {
    expect(input().hasAttribute('disabled')).toBe(false);
    expect(decorator().classList.contains('is-disabled')).toBe(false);
  });

  it('follows the bound input', fakeAsync(() => {
    host.disabled = true;
    settle();

    expect(input().hasAttribute('disabled')).toBe(true);
    expect(decorator().classList.contains('is-disabled')).toBe(true);

    host.disabled = false;
    settle();

    expect(input().hasAttribute('disabled')).toBe(false);
    expect(decorator().classList.contains('is-disabled')).toBe(false);
  }));

  // The claim the `model` exists for: nothing binds the input here, so the only writer is Angular's
  // `setDisabledState`. With a plain `input()` the field could not take this at all.
  it('follows a control disabled through Angular’s own forms', fakeAsync(() => {
    host.ngForm.control.get('name')!.disable();
    settle();

    expect(input().hasAttribute('disabled')).toBe(true);
    expect(decorator().classList.contains('is-disabled')).toBe(true);

    host.ngForm.control.get('name')!.enable();
    settle();

    expect(input().hasAttribute('disabled')).toBe(false);
    expect(decorator().classList.contains('is-disabled')).toBe(false);
  }));

  // Last writer wins, and a binding that does not change is not a writer — so a change detection pass
  // does not hand the field back its own `[disabled]="false"` and undo the control. The rule the old
  // plain property followed, and the reason this is a `model` rather than a computed over both writers.
  it('does not let an unchanged binding undo the control', fakeAsync(() => {
    host.ngForm.control.get('name')!.disable();
    settle();
    settle();

    expect(input().hasAttribute('disabled')).toBe(true);
    expect(decorator().classList.contains('is-disabled')).toBe(true);
  }));
});
