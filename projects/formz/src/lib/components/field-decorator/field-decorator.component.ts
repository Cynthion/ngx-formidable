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

  ngAfterContentInit(): void {
    console.log('FieldDecoratorComponent. ngAfterContentInit');

    this.hasLabel = !!this.projectedLabel;
    this.hasTooltip = !!this.projectedTooltip;
    this.hasPrefix = !!this.projectedPrefix;
    this.hasSuffix = !!this.projectedSuffix;
  }

  ngAfterViewInit(): void {
    console.log('FieldDecoratorComponent. ngAfterViewInit');

    this.doLayoutAdjustments();
  }

  //#region IFormzField

  get fieldId(): string {
    return this.projectedField?.formzField.fieldId ?? '';
  }

  get value(): string {
    return this.projectedField?.formzField.value ?? '';
  }

  get isLabelFloating(): boolean {
    if (!this.projectedField) return false;

    const isLabelConfiguredToFloat = this.projectedLabel?.isFloating ?? false;
    const isFieldLabelFloating = this.projectedField.formzField.isLabelFloating ?? false;

    return isLabelConfiguredToFloat && isFieldLabelFloating;
  }

  get elementRef(): ElementRef<HTMLElement> {
    if (!this.projectedField) {
      throw new Error('FieldDecoratorComponent: projectedField is not available yet.');
    }
    return this.projectedField.formzField.elementRef;
  }

  valueChange$ = this.valueChangeSubject$.asObservable();
  focusChange$ = this.focusChangeSubject$.asObservable();

  //#endregion

  private doLayoutAdjustments(): void {
    requestAnimationFrame(() => {
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
    });
  }
}
