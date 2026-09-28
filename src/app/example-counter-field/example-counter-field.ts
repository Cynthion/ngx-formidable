import { Component, ElementRef, input, model, signal, viewChild } from '@angular/core';
import { BaseField, FieldDecoratorLayout, FORMIDABLE_FIELD, FormidableField } from '@cynthion/ngx-formidable';

/**
 * A custom field built on `BaseField` — the reference implementation for `user/custom-fields.md`.
 *
 * It holds a number rather than a string, steps with the arrow keys, and always renders something where the
 * value goes, which is the three things a text field does not have to deal with.
 */
@Component({
  selector: 'example-counter-field',
  templateUrl: './example-counter-field.html',
  styleUrls: ['./example-counter-field.scss'],
  providers: [
    // required to provide this component as FormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: ExampleCounterField
    }
  ]
})
export class ExampleCounterField extends BaseField<number> implements FormidableField<number> {
  readonly counterRef = viewChild.required<ElementRef<HTMLDivElement>>('counterRef');

  protected keyboardCallback = (event: KeyboardEvent) => this.handleKeydown(event);
  protected externalClickCallback = null;
  protected windowResizeScrollCallback = null;
  protected registeredKeys = ['ArrowUp', 'ArrowDown'];

  /** Lowest value the counter steps to. `[formField]` writes it from a `min()` rule. */
  public readonly min = input(0, { transform: (min: number | undefined) => min ?? 0 });

  /** Highest value the counter steps to. `[formField]` writes it from a `max()` rule. */
  public readonly max = input(10, { transform: (max: number | undefined) => max ?? 10 });

  /** How much one step moves the value. */
  public readonly step = input(1);

  /** The count. Every forms API binds it two-way; the counter writes it back only for a step of the user's. */
  public readonly value = model(0);

  protected doOnFocusChange(_isFocused: boolean): void {
    // No additional actions needed
  }

  // The base already filters the key stream on focus, readonly and disabled.
  private handleKeydown(event: KeyboardEvent): boolean {
    switch (event.key) {
      case 'ArrowUp':
        this.increment();
        return true;
      case 'ArrowDown':
        this.decrement();
        return true;
      default:
        return false;
    }
  }

  // #region FormidableField

  get fieldRef(): ElementRef<HTMLElement> {
    return this.counterRef() as ElementRef<HTMLElement>;
  }

  // The counter always renders a number where the value goes, so a resting label would land on top of it.
  protected override readonly showsEmptyValueHint = signal(true);

  decoratorLayout: FieldDecoratorLayout = 'horizontal';

  // #endregion

  /** Steps the value up by `step`, stopping at `max`. No-op while readonly or disabled. */
  public increment(): void {
    this.stepBy(this.step());
  }

  /** Steps the value down by `step`, stopping at `min`. No-op while readonly or disabled. */
  public decrement(): void {
    this.stepBy(-this.step());
  }

  protected onButtonPointerDown(event: PointerEvent): void {
    // Keeps the focus on the field rather than letting it land on the button.
    event.preventDefault();
    this.focus();
  }

  private stepBy(by: number): void {
    if (this.readonly() || this.disabled()) return;

    // `setValue` reports nothing for a step that changes nothing — one pressed at `min` or `max`.
    this.setValue(this.clamp(this.value() + by));
  }

  private clamp(value: number): number {
    return Math.max(this.min(), Math.min(this.max(), value));
  }
}
