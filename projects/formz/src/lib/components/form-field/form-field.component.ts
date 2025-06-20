import {
  AfterContentInit,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  inject
} from '@angular/core';
import { FormFieldDirective } from '../../directives/form-field.directive';
import { AbstractFormFieldComponent } from '../abstract-form-field.component';

@Component({
  selector: 'formz-form-field',
  templateUrl: './form-field.component.html',
  styleUrls: ['./form-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormFieldComponent extends AbstractFormFieldComponent implements AfterViewInit, AfterContentInit {
  @ContentChild(FormFieldDirective) projectedField?: FormFieldDirective;

  protected isFieldFocused = false;
  protected isFieldFilled = false;

  private cdRef = inject(ChangeDetectorRef);

  override ngAfterContentInit(): void {
    super.ngAfterContentInit();

    // subscribe to input events
    if (this.projectedField) {
      this.projectedField.focusChange.subscribe((focused) => {
        this.isFieldFocused = focused;
        this.cdRef.markForCheck();
      });

      this.projectedField.valueChange.subscribe((value) => {
        this.isFieldFilled = value.length > 0;
        this.cdRef.markForCheck();
      });
    }
  }

  ngAfterViewInit(): void {
    // if prefix/suffix are projected, adjust the padding of the field
    const field = this.projectedField?.elementRef.nativeElement;
    const prefixWrapper = this.prefixWrapper?.nativeElement;
    const suffixWrapper = this.suffixWrapper?.nativeElement;

    const prefixWidth = this.projectedPrefix?.elementRef.nativeElement.offsetWidth || 0;
    const suffixWidth = this.projectedSuffix?.elementRef.nativeElement.offsetWidth || 0;

    if (field && prefixWrapper && prefixWidth) {
      const prefixStyle = window.getComputedStyle(prefixWrapper);
      const prefixPaddingLeft = parseFloat(prefixStyle.paddingLeft) || 0;
      const prefixPaddingRight = parseFloat(prefixStyle.paddingRight) || 0;

      field.style.paddingLeft = `${prefixPaddingLeft + prefixWidth + prefixPaddingRight}px`;
    }
    if (field && suffixWrapper && suffixWidth) {
      const suffixStyle = window.getComputedStyle(suffixWrapper);
      const suffixPaddingLeft = parseFloat(suffixStyle.paddingLeft) || 0;
      const suffixPaddingRight = parseFloat(suffixStyle.paddingRight) || 0;

      field.style.paddingRight = `${suffixPaddingLeft + suffixWidth + suffixPaddingRight}px`;
    }
  }

  //#region IFormField

  override get fieldId(): string | null {
    return this.projectedField?.id ?? null;
  }

  override get isLabelFloating(): boolean {
    return !!this.projectedLabel?.isFloating && !this.isFieldFocused && !this.isFieldFilled;
  }

  //#endregion
}
