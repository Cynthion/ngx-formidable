import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, forwardRef, Input, ViewChild } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { FieldDecoratorLayout, FORMIDABLE_FIELD, IFormidableSliderField } from '../../../models/formidable.model';
import { BaseFieldDirective } from '../base-field.directive';

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

  readonly isLabelFloating = false;

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

  @Input() showMinMaxLabels = false;
  @Input() showThumbLabel = true;
  @Input() showTickMarks = false;
  @Input() tickInterval?: number;

  @Input() transformValueToThumbLabel?: (value: number) => string;
  @Input() transformTickToTickLabel?: (value: number) => string;

  public selectValue(value: number): void {
    const normalized = this.normalizeValue(value);

    if (normalized === this._value) return;

    this._value = normalized;
    this.syncRangeInput();
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

  get ticks(): number[] {
    if (!this.showTickMarks) return [];

    const interval = (this.tickInterval && this.tickInterval > 0 ? this.tickInterval : this.step) || 1;
    const ticks: number[] = [];

    if (this.max <= this.min) {
      return ticks;
    }

    ticks.push(this.min);

    let current = this.min + interval;
    while (current < this.max) {
      ticks.push(this.roundToStep(current));
      current += interval;
    }

    ticks.push(this.max);

    return Array.from(new Set(ticks)).sort((a, b) => a - b);
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
    if (value == null || Number.isNaN(value)) return null;

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
}
