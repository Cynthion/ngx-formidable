import { Component, ElementRef, forwardRef, ViewChild } from '@angular/core';
import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { FormsModule, NG_VALUE_ACCESSOR, NgForm } from '@angular/forms';
import { provideNgxMask } from 'ngx-mask';
import { FieldDecoratorLayout } from '../../models/formidable.model';
import { BaseFieldDirective } from './base-field.directive';
import { DateFieldComponent } from './date-field/date-field.component';

/**
 * Contract of a blur: `onTouched()` is its last act. Under `updateOn: 'blur'` Angular commits the value from
 * inside `onTouched`, and only when a change is already pending — so a field that writes its value in
 * `doOnFocusChange` commits nothing if the touch went first.
 *
 * And a blur the field caused itself is not a blur at all: `date-field` hands focus to its own panel so a
 * nested control stays clickable, which must leave the control neither committed nor touched.
 */

/** Defers its value to the blur, the way `date-field` and `time-field` do. */
@Component({
  selector: 'formidable-blur-commit-field',
  standalone: true,
  template: `<input
    #inputRef
    (blur)="onFocusChange(false)"
    (focus)="onFocusChange(true)" />`,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => BlurCommitFieldComponent),
      multi: true
    }
  ]
})
class BlurCommitFieldComponent extends BaseFieldDirective<string> {
  protected keyboardCallback = null;
  protected externalClickCallback = null;
  protected windowResizeScrollCallback = null;
  protected registeredKeys: string[] = [];

  @ViewChild('inputRef', { static: true }) inputRef!: ElementRef<HTMLInputElement>;

  decoratorLayout: FieldDecoratorLayout = 'horizontal';

  private committed = '';

  get value(): string {
    return this.committed;
  }

  get fieldRef(): ElementRef<HTMLElement> {
    return this.inputRef as ElementRef<HTMLElement>;
  }

  protected doOnValueChange(): void {
    // Nothing: this field commits on blur, not on input.
  }

  protected doWriteValue(value: string): void {
    this.committed = value ?? '';
    this.inputRef.nativeElement.value = this.committed;
  }

  protected doOnFocusChange(isFocused: boolean): void {
    if (isFocused) return;

    this.committed = this.inputRef.nativeElement.value;
    this.onChange(this.committed);
  }
}

@Component({
  standalone: true,
  imports: [FormsModule, BlurCommitFieldComponent],
  template: `
    <form [ngFormOptions]="{ updateOn: 'blur' }">
      <formidable-blur-commit-field
        name="name"
        [ngModel]="value" />
    </form>
  `
})
class BlurCommitHostComponent {
  value = '';
}

@Component({
  standalone: true,
  imports: [FormsModule, DateFieldComponent],
  template: `
    <form>
      <formidable-date-field
        name="date"
        unicodeTokenFormat="dd . MM . yyyy"
        [ngModel]="value" />
    </form>
  `
})
class DateHostComponent {
  value: Date | null = null;
}

describe('blur contract', () => {
  let fixture: ComponentFixture<BlurCommitHostComponent | DateHostComponent>;

  function control() {
    return fixture.debugElement.children[0]!.injector.get(NgForm).form.get(
      fixture.componentInstance instanceof DateHostComponent ? 'date' : 'name'
    );
  }

  function input(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input') as HTMLInputElement;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideNgxMask()] });
  });

  afterEach(fakeAsync(() => flush()));

  // Fails while `onTouched()` runs before `doOnFocusChange()`: the commit inside the touch finds no pending
  // change, and the value the field wrote a moment later never reaches the model.
  it('commits a value written during the blur, under updateOn blur', fakeAsync(() => {
    fixture = TestBed.createComponent(BlurCommitHostComponent);
    fixture.detectChanges();
    tick();

    input().focus();
    input().value = 'written on blur';
    input().dispatchEvent(new FocusEvent('blur'));
    tick();

    expect(control()?.value).toBe('written on blur');
    expect(control()?.touched).toBe(true);
  }));

  it('leaves the control untouched and uncommitted when the field takes its own blur', fakeAsync(() => {
    fixture = TestBed.createComponent(DateHostComponent);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('.panel') as HTMLElement;

    input().focus();
    input().value = '12 . 05 . 2024';

    // Focus moves onto the panel, so a nested control stays clickable. That is not the user leaving.
    panel.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    input().dispatchEvent(new FocusEvent('blur'));
    tick();

    expect(control()?.touched).toBe(false);
    expect(control()?.value).toBeNull();
  }));

  it('commits and touches on the blur after the one it took', fakeAsync(() => {
    fixture = TestBed.createComponent(DateHostComponent);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('.panel') as HTMLElement;

    input().focus();
    panel.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    input().dispatchEvent(new FocusEvent('blur'));
    tick();

    // The flag is one-shot, so this blur counts.
    input().focus();
    input().value = '12 . 05 . 2024';
    input().dispatchEvent(new FocusEvent('blur'));
    tick();

    expect(control()?.touched).toBe(true);
    expect(control()?.value).toEqual(new Date(2024, 4, 12));
  }));
});
