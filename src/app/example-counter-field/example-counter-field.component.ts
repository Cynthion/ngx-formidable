import { ChangeDetectionStrategy, Component, ElementRef, forwardRef, Input, ViewChild } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { BaseFieldDirective, FieldDecoratorLayout, FORMIDABLE_FIELD, IFormidableField } from '@cynthion/ngx-formidable';

/**
 * A custom field built on `BaseFieldDirective` — the reference implementation for `user/custom-fields.md`.
 *
 * It holds a number rather than a string, steps with the arrow keys, and always renders something where the
 * value goes, which is the three things a text field does not have to deal with.
 */
@Component({
  selector: 'example-counter-field',
  templateUrl: './example-counter-field.component.html',
  styleUrls: ['./example-counter-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  providers: [
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ExampleCounterFieldComponent),
      multi: true
    },
    // required to provide this component as IFormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: ExampleCounterFieldComponent
    }
  ]
})
export class ExampleCounterFieldComponent extends BaseFieldDirective<number> implements IFormidableField<number> {
  @ViewChild('counterRef', { static: true }) counterRef!: ElementRef<HTMLDivElement>;

  protected keyboardCallback = (event: KeyboardEvent) => this.handleKeydown(event);
  protected externalClickCallback = null;
  protected windowResizeScrollCallback = null;
  protected registeredKeys = ['ArrowUp', 'ArrowDown'];

  /** Lowest value the counter steps to. */
  @Input() min = 0;

  /** Highest value the counter steps to. */
  @Input() max = 10;

  /** How much one step moves the value. */
  @Input() step = 1;

  private _value = 0;

  protected doOnValueChange(): void {
    // No additional actions needed
  }

  protected doOnFocusChange(_isFocused: boolean): void {
    // No additional actions needed
  }

  // The base already filters the key stream on focus, readonly and disabled.
  private handleKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowUp':
        this.increment();
        break;
      case 'ArrowDown':
        this.decrement();
        break;
    }
  }

  // #region ControlValueAccessor

  protected doWriteValue(value: number): void {
    this._value = this.clamp(typeof value === 'number' && !Number.isNaN(value) ? value : this.min);
  }

  // #endregion

  // #region IFormidableField

  get value(): number {
    return this._value;
  }

  get fieldRef(): ElementRef<HTMLElement> {
    return this.counterRef as ElementRef<HTMLElement>;
  }

  // The counter always renders a number where the value goes, so a resting label would land on top of it.
  protected override get showsEmptyValueHint(): boolean {
    return true;
  }

  decoratorLayout: FieldDecoratorLayout = 'horizontal';

  // #endregion

  /** Steps the value up by `step`, stopping at `max`. No-op while readonly or disabled. */
  public increment(): void {
    this.setValue(this._value + this.step);
  }

  /** Steps the value down by `step`, stopping at `min`. No-op while readonly or disabled. */
  public decrement(): void {
    this.setValue(this._value - this.step);
  }

  protected onButtonPointerDown(event: PointerEvent): void {
    // Keeps the focus on the field rather than letting it land on the button.
    event.preventDefault();
    this.focus();
  }

  private setValue(next: number): void {
    if (this.readonly || this.disabled) return;

    this._value = this.clamp(next);
    this.onValueChange(); // emits, and reports the value to the bound control
  }

  private clamp(value: number): number {
    return Math.max(this.min, Math.min(this.max, value));
  }
}
