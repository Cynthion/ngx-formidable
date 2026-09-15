import { ChangeDetectionStrategy, Component, ElementRef, forwardRef, input, ViewChild } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { FieldDecoratorLayout, FORMIDABLE_FIELD, IFormidableSliderField } from '../../../models/formidable.model';
import { BaseFieldDirective } from '../base-field.directive';

type SliderLabelAlign = 'start' | 'center' | 'end';

interface SliderLabelItem {
  text: string;
  leftPercent: number;
  align: SliderLabelAlign;
}

/**
 * A number from a bounded range, over a native range input — so the arrow keys, Home and End are the
 * platform's. A value outside `min`/`max` or off the `step` grid is corrected, and the correction is written
 * back to the model, so what the slider shows and what the form holds cannot disagree.
 *
 * Its decorator renders in the `vertical` layout, so the label always sits outside whatever position is set
 * on it, and a projected prefix or suffix is not rendered.
 */
@Component({
  selector: 'formidable-slider-field',
  templateUrl: './slider-field.component.html',
  styleUrls: ['./slider-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  providers: [
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SliderFieldComponent),
      multi: true
    },
    // required to provide this component as IFormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: SliderFieldComponent
    }
  ]
})
export class SliderFieldComponent extends BaseFieldDirective<number | null> implements IFormidableSliderField {
  @ViewChild('sliderRef', { static: true }) sliderRef!: ElementRef<HTMLDivElement>;
  @ViewChild('rangeRef', { static: true }) rangeRef!: ElementRef<HTMLInputElement>;

  protected keyboardCallback = null;
  protected externalClickCallback = null;
  protected windowResizeScrollCallback = null;
  protected registeredKeys: string[] = []; // arrows are natively supported

  private _value: number | null = null;

  protected doOnValueChange(): void {
    // No additional actions needed
  }

  protected doOnFocusChange(_isFocused: boolean): void {
    // No additional actions needed
  }

  // #region ControlValueAccessor

  protected doWriteValue(value: number | null): void {
    const normalized = this.normalizeValue(value);

    this._value = normalized;
    this.syncRangeInput();
    this.updateThumbTransform();

    // If the form gave us an out-of-range / non-step-aligned value,
    // push the corrected value back so model === UI.
    // Only correct real numeric values; do not "correct" null/undefined to something else.
    if (value != null && normalized !== value) {
      queueMicrotask(() => this.runSilently('correction', () => this.commit(normalized)));
    }
  }

  // #endregion

  // #region IFormidableField

  get value(): number | null {
    return this._value;
  }

  get fieldRef(): ElementRef<HTMLElement> {
    return this.sliderRef as ElementRef<HTMLElement>;
  }

  protected override get focusElement(): HTMLElement {
    return this.rangeRef.nativeElement;
  }

  decoratorLayout: FieldDecoratorLayout = 'vertical';

  // #endregion

  // #region IFormidableSliderField

  /** Lower bound, inclusive. A value below it is clamped and the correction is written back to the model. */
  public readonly min = input(0);

  /** Upper bound, inclusive. A value above it is clamped and the correction is written back to the model. */
  public readonly max = input(100);

  /** Granularity. A value off the step grid is snapped onto it and the correction written back. */
  public readonly step = input(1);

  /** Text for the low end of the track. Falls back to `min`. */
  public readonly minLabel = input<string | undefined>(undefined);

  /** Text for the high end of the track. Falls back to `max`. */
  public readonly maxLabel = input<string | undefined>(undefined);

  /** Shows the current value in a bubble above the thumb. */
  public readonly showThumbLabel = input(true);

  /** Draws a mark on the track at every `tickInterval`. */
  public readonly showTickMarks = input(false);

  /** Shows `minLabel` and `maxLabel` at the ends of the track. */
  public readonly showMinMaxLabels = input(false);

  /** Labels each tick mark with its value. Needs `showTickMarks`. */
  public readonly showTickLabels = input(false);

  /** Spacing between tick marks. Falls back to `step`, which on a fine step means a mark per value. */
  public readonly tickInterval = input<number | undefined>(undefined);

  /**
   * Renders the value as something other than the bare number — a currency, a category name. Also what the
   * slider reports as `aria-valuetext`, which is the one thing a native range cannot infer.
   */
  public readonly transformValueToThumbLabel = input<((value: number) => string) | undefined>(undefined);

  /** Renders a tick's value as something other than the bare number. Independent of the thumb's transform. */
  public readonly transformTickToTickLabel = input<((value: number) => string) | undefined>(undefined);

  /** Commits a value from outside the field, clamped and snapped as a drag would be. */
  public selectValue(value: number): void {
    const normalized = this.normalizeValue(value);

    if (normalized === this._value) return;

    this._value = normalized;
    this.syncRangeInput();
    this.updateThumbTransform();
    this.onValueChange();
  }

  // #endregion

  /**
   * What the value sounds like when it is not the bare number — "€50" rather than "50". Only set when
   * the consumer transforms it: a native range already reports the number itself.
   */
  get valueText(): string | null {
    const transform = this.transformValueToThumbLabel();

    return transform && this.value != null ? transform(this.value) : null;
  }

  get thumbLabel(): string {
    if (this.value == null) return '';

    const transform = this.transformValueToThumbLabel();

    return transform ? transform(this.value) : String(this.value);
  }

  getTickLabel(tick: number): string {
    const transform = this.transformTickToTickLabel();

    return transform ? transform(tick) : String(tick);
  }

  get valuePercent(): number {
    if (this.max() === this.min()) return 0;
    const v = this.value ?? this.min();
    return ((v - this.min()) / (this.max() - this.min())) * 100;
  }

  get thumbLabelAlign(): SliderLabelAlign {
    // snap to edges to avoid overflow
    const p = this.valuePercent;

    // small deadzone
    if (p <= 5) return 'start';
    if (p >= 95) return 'end';
    return 'center';
  }

  get tickMarks(): number[] {
    if (!this.showTickMarks()) return [];

    const tickInterval = this.tickInterval();
    const interval = (tickInterval && tickInterval > 0 ? tickInterval : this.step()) || 1;
    const tickMarks: number[] = [];

    if (this.max() <= this.min()) {
      return tickMarks;
    }

    tickMarks.push(this.min());

    let current = this.min() + interval;
    while (current < this.max()) {
      tickMarks.push(this.roundToStep(current));
      current += interval;
    }

    tickMarks.push(this.max());

    return Array.from(new Set(tickMarks)).sort((a, b) => a - b);
  }

  get innerTicks(): number[] {
    return this.tickMarks.length > 2 ? this.tickMarks.slice(1, -1) : [];
  }

  get showLabelRow(): boolean {
    return this.showMinMaxLabels() || this.showAnyTickLabels;
  }

  get showAnyTickLabels(): boolean {
    return this.showTickMarks() && this.showTickLabels() && this.tickMarks.length > 0;
  }

  get labelItems(): SliderLabelItem[] {
    const items: SliderLabelItem[] = [];

    // Case A: min/max labels shown, with optional tick labels for inner ticks
    if (this.showMinMaxLabels()) {
      items.push({
        text: String(this.minLabel() ?? this.min()),
        leftPercent: 0,
        align: 'start'
      });

      if (this.showAnyTickLabels && this.innerTicks.length > 0) {
        for (const tick of this.innerTicks) {
          items.push({
            text: this.getTickLabel(tick),
            leftPercent: this.getTickPercent(tick),
            align: 'center'
          });
        }
      }

      items.push({
        text: String(this.maxLabel() ?? this.max()),
        leftPercent: 100,
        align: 'end'
      });

      return items;
    }

    // Case B: min/max labels hidden, but tick labels shown for all ticks
    if (this.showAnyTickLabels) {
      const t = this.tickMarks;
      if (t.length === 0) return items;

      for (let i = 0; i < t.length; i++) {
        const tick = t[i];
        if (tick !== undefined) {
          items.push({
            text: this.getTickLabel(tick),
            leftPercent: this.getTickPercent(tick),
            align: i === 0 ? 'start' : i === t.length - 1 ? 'end' : 'center'
          });
        }
      }
    }

    return items;
  }

  getTickPercent(tick: number): number {
    if (this.max() === this.min()) return 0;

    return ((tick - this.min()) / (this.max() - this.min())) * 100;
  }

  onRangeInput(event: Event): void {
    if (this.readonly() || this.disabled()) return;

    const raw = Number((event.target as HTMLInputElement).value);

    this.selectValue(raw);
  }

  private normalizeValue(value: number | null): number | null {
    if (value == null || Number.isNaN(value)) return null;

    const clamped = Math.min(this.max(), Math.max(this.min(), value));
    return this.roundToStep(clamped);
  }

  private roundToStep(value: number): number {
    if (!this.step() || this.step() <= 0) return value;

    const offset = this.min();
    const steps = Math.round((value - offset) / this.step());
    const rounded = offset + steps * this.step();

    return Math.min(this.max(), Math.max(this.min(), rounded));
  }

  private syncRangeInput(): void {
    if (!this.rangeRef?.nativeElement) return;

    const val = this.value ?? this.min();
    this.rangeRef.nativeElement.value = String(val);
  }

  private updateThumbTransform(): void {
    const el = this.rangeRef?.nativeElement;
    if (!el) return;

    // Decide what value to use when null: min makes sense for a slider UI
    const v = this.value ?? this.min();

    // Avoid divide-by-zero when min === max
    const range = this.max() - this.min();
    const p = range === 0 ? 0 : (v - this.min()) / range; // 0..1
    const clampedP = Math.min(1, Math.max(0, p));

    // compensation to centers over the value)
    const baseTx = (clampedP - 0.5) * 100; // -50..+50

    // Edge zone where we blend back to 0 so the thumb doesn't overflow.
    // Tune (0.02 = 2%) to taste; 2–5% usually feels good.
    const edge = 0.02;

    let tx: number;

    if (clampedP <= edge) {
      // Blend from 0 at p=0 to baseTx at p=edge
      const t = clampedP / edge; // 0..1
      const baseAtEdge = (edge - 0.5) * 100;
      tx = 0 + (baseAtEdge - 0) * t;
    } else if (clampedP >= 1 - edge) {
      // Blend from baseTx at p=1-edge to 0 at p=1
      const t = (clampedP - (1 - edge)) / edge; // 0..1
      const baseAtEdge = (1 - edge - 0.5) * 100;
      tx = baseAtEdge + (0 - baseAtEdge) * t;
    } else {
      tx = baseTx;
    }

    el.style.setProperty('--formidable-slider-thumb-transform', `translateX(${tx}%)`);
  }
}
