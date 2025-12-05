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
  protected registeredKeys: string[] = []; // TODO: implement keyboard support

  private _value: number | null = null;

  protected doOnValueChange(): void {
    // No additional actions needed
  }

  protected doOnFocusChange(_isFocused: boolean): void {
    // No additional actions needed
  }

  // #region ControlValueAccessor

  protected doWriteValue(value: number | null): void {
    this._value = this.normalizeValue(value);
    this.syncRangeInput();
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

  @Input() transformValueToLabel?: (value: number) => string;

  public selectValue(value: number): void {
    const normalized = this.normalizeValue(value);

    if (normalized === this._value) return;

    this._value = normalized;
    this.syncRangeInput();
    this.onValueChange();
  }

  // #endregion

  get displayValueLabel(): string {
    if (this.value == null) return '';
    return this.transformValueToLabel ? this.transformValueToLabel(this.value) : String(this.value);
  }

  get valuePercent(): number {
    if (this.max === this.min) return 0;
    const v = this.value ?? this.min;
    return ((v - this.min) / (this.max - this.min)) * 100;
  }

  /** Move the track to set the value. */
  onRangeInput(event: Event): void {
    if (this.readonly || this.disabled) return;

    const raw = Number((event.target as HTMLInputElement).value);

    this.selectValue(raw);
  }

  /** Click on the track outside the thumb to jump the value.  */
  onTrackClick(event: MouseEvent): void {
    if (this.readonly || this.disabled) return;

    const trackEl = this.sliderRef.nativeElement.querySelector('.slider-track') as HTMLDivElement | null;
    if (!trackEl) return;

    const rect = trackEl.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const ratio = rect.width > 0 ? clickX / rect.width : 0;
    const raw = this.min + ratio * (this.max - this.min);

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
