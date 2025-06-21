import {
  AfterContentInit,
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  ElementRef,
  Input,
  ViewChild
} from '@angular/core';
import { Subject } from 'rxjs';
import { FormFieldLabelDirective } from '../../directives/form-field-label.directive';
import { FormFieldPrefixDirective } from '../../directives/form-field-prefix.directive';
import { FormFieldSuffixDirective } from '../../directives/form-field-suffix.directive';
import { FormFieldTooltipDirective } from '../../directives/form-field-tooltip.directive';
import { FormFieldDirective } from '../../directives/form-field.directive';
import { FieldDecoratorLayout, IFormzField } from '../../form-model';

@Component({
  selector: 'formz-field-decorator',
  templateUrl: './field-decorator.component.html',
  styleUrls: ['./field-decorator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FieldDecoratorComponent implements AfterContentInit, AfterViewInit, IFormzField {
  // View children are used to access the prefix and suffix wrappers
  @ViewChild('prefixWrapperRef') prefixWrapper?: ElementRef<HTMLDivElement>;
  @ViewChild('suffixWrapperRef') suffixWrapper?: ElementRef<HTMLDivElement>;

  // Content children are used to project the label, tooltip, field, prefix and suffix
  @ContentChild(FormFieldLabelDirective) projectedLabel?: FormFieldLabelDirective;
  @ContentChild(FormFieldTooltipDirective) projectedTooltip?: FormFieldTooltipDirective;
  @ContentChild(FormFieldDirective) projectedField?: FormFieldDirective;
  @ContentChild(FormFieldPrefixDirective) projectedPrefix?: FormFieldPrefixDirective;
  @ContentChild(FormFieldSuffixDirective) projectedSuffix?: FormFieldSuffixDirective;

  @Input() decoratorLayout: FieldDecoratorLayout = 'single'; // TODO implement 'option' layout

  protected hasLabel = false;
  protected hasTooltip = false;
  protected hasPrefix = false;
  protected hasSuffix = false;

  private valueChangeSubject$ = new Subject<string>();
  private focusChangeSubject$ = new Subject<boolean>();

  // TODO in constructor, check that nested field implements IFormzField

  ngAfterContentInit(): void {
    this.hasLabel = !!this.projectedLabel;
    this.hasTooltip = !!this.projectedTooltip;
    this.hasPrefix = !!this.projectedPrefix;
    this.hasSuffix = !!this.projectedSuffix;

    // TODO subscribe to input events based in IFormzField interface
    // if (this.projectedField) {
    //   this.projectedField.focusChange.subscribe((focused) => {
    //     this.isFieldFocused = focused;
    //     this.cdRef.markForCheck();
    //   });

    //   this.projectedField.valueChange.subscribe((value) => {
    //     this.isFieldFilled = value.length > 0;
    //     this.cdRef.markForCheck();
    //   });
    // }
  }

  ngAfterViewInit(): void {
    // if prefix/suffix are projected, adjust the padding of the field
    const field = this.elementRef.nativeElement;
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

  //#region IFormzField

  get fieldId(): string {
    return (this.projectedField as unknown as IFormzField).fieldId ?? '';
  }

  get value(): string {
    return (this.projectedField as unknown as IFormzField).value ?? '';
  }

  get isLabelFloating(): boolean {
    const isLabelConfiguredToFloat = this.projectedLabel?.isFloating ?? false;
    const isFieldLabelFloating = (this.projectedField as unknown as IFormzField).isLabelFloating ?? false;

    return isLabelConfiguredToFloat && isFieldLabelFloating;
  }

  get elementRef(): ElementRef<HTMLElement> {
    return (this.projectedField as unknown as IFormzField).elementRef;
  }

  valueChange$ = this.valueChangeSubject$.asObservable();
  focusChange$ = this.focusChangeSubject$.asObservable();

  //#endregion
}
