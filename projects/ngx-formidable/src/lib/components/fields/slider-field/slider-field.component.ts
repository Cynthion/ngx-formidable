import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, forwardRef, Input, ViewChild } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { FieldDecoratorLayout, FORMIDABLE_FIELD, IFormidableSliderField } from '../../../models/formidable.model';
import { BaseFieldDirective } from '../base-field.directive';

type SliderLabelAlign = 'start' | 'center' | 'end';

interface SliderLabelItem {
  text: string;
  leftPercent: number;
  align: SliderLabelAlign;
}

@Component({
  selector: 'formidable-slider-field',
  templateUrl: './slider-field.component.html',
  styleUrls: ['./slider-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule],
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
    if (normalized !== value) {
      queueMicrotask(() => this.onChange(normalized));
    }
  }

  // #endregion

  // #region IFormidableField

  get value(): number | null {
    return this._value;
  }

  override get isLabelFloating(): boolean {
    return false;
  }

  get fieldRef(): ElementRef<HTMLElement> {
    return this.sliderRef as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'group';

  // #endregion

  // #region IFormidableSliderField

  @Input() min = 0;
  @Input() max = 100;
  @Input() step = 1;

  @Input() minLabel?: string;
  @Input() maxLabel?: string;

  @Input() showThumbLabel = true;
  @Input() showTickMarks = false;
  @Input() showMinMaxLabels = false;
  @Input() showTickLabels = false;
  @Input() tickInterval?: number;

  @Input() transformValueToThumbLabel?: (value: number) => string;
  @Input() transformTickToTickLabel?: (value: number) => string;

  public selectValue(value: number): void {
    const normalized = this.normalizeValue(value);

    if (normalized === this._value) return;

    this._value = normalized;
    this.syncRangeInput();
    this.updateThumbTransform();
    this.onValueChange();
  }

  // #endregion

  get thumbLabel(): string {
    if (this.value == null) return '';
    return this.transformValueToThumbLabel ? this.transformValueToThumbLabel(this.value) : String(this.value);
  }

  getTickLabel(tick: number): string {
    return this.transformTickToTickLabel ? this.transformTickToTickLabel(tick) : String(tick);
  }

  get valuePercent(): number {
    if (this.max === this.min) return 0;
    const v = this.value ?? this.min;
    return ((v - this.min) / (this.max - this.min)) * 100;
  }

  get tickMarks(): number[] {
    if (!this.showTickMarks) return [];

    const interval = (this.tickInterval && this.tickInterval > 0 ? this.tickInterval : this.step) || 1;
    const tickMarks: number[] = [];

    if (this.max <= this.min) {
      return tickMarks;
    }

    tickMarks.push(this.min);

    let current = this.min + interval;
    while (current < this.max) {
      tickMarks.push(this.roundToStep(current));
      current += interval;
    }

    tickMarks.push(this.max);

    return Array.from(new Set(tickMarks)).sort((a, b) => a - b);
  }

  get innerTicks(): number[] {
    return this.tickMarks.length > 2 ? this.tickMarks.slice(1, -1) : [];
  }

  get showLabelRow(): boolean {
    return this.showMinMaxLabels || this.showAnyTickLabels;
  }

  get showAnyTickLabels(): boolean {
    return this.showTickMarks && this.showTickLabels && this.tickMarks.length > 0;
  }

  get labelItems(): SliderLabelItem[] {
    const items: SliderLabelItem[] = [];

    // Case A: min/max labels shown, with optional tick labels for inner ticks
    if (this.showMinMaxLabels) {
      items.push({
        text: String(this.minLabel ?? this.min),
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
        text: String(this.maxLabel ?? this.max),
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
    if (this.max === this.min) return 0;

    return ((tick - this.min) / (this.max - this.min)) * 100;
  }

  onRangeInput(event: Event): void {
    if (this.readonly || this.disabled) return;

    const raw = Number((event.target as HTMLInputElement).value);

    this.selectValue(raw);
  }

  private normalizeValue(value: number | null): number | null {
    if (value == null || Number.isNaN(value)) return this.min;

    const clamped = Math.min(this.max, Math.max(this.min, value));
    return this.roundToStep(clamped);
  }

  private roundToStep(value: number): number {
    if (!this.step || this.step <= 0) return value;

    const offset = this.min;
    const steps = Math.round((value - offset) / this.step);
    const rounded = offset + steps * this.step;

    return Math.min(this.max, Math.max(this.min, rounded));
  }

  private syncRangeInput(): void {
    if (!this.rangeRef?.nativeElement) return;

    const val = this.value ?? this.min;
    this.rangeRef.nativeElement.value = String(val);
  }

  private updateThumbTransform(): void {
    const el = this.rangeRef?.nativeElement;
    if (!el) return;

    // Decide what value to use when null: min makes sense for a slider UI
    const v = this.value ?? this.min;

    // Avoid divide-by-zero when min === max
    const range = this.max - this.min;
    const p = range === 0 ? 0.5 : (v - this.min) / range; // 0..1
    const clampedP = Math.min(1, Math.max(0, p));

    // Map 0..1 -> -50..+50, with 0.5 -> 0
    const tx = (clampedP - 0.5) * 100; // -50..+50

    el.style.setProperty('--formidable-slider-thumb-transform', `translateX(${tx}%)`);
  }
}
