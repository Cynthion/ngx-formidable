import { AfterContentInit, ContentChild, Directive, ElementRef, ViewChild } from '@angular/core';
import { FormFieldLabelDirective } from '../directives/form-field-label.directive';
import { FormFieldPrefixDirective } from '../directives/form-field-prefix.directive';
import { FormFieldSuffixDirective } from '../directives/form-field-suffix.directive';
import { FormFieldTooltipDirective } from '../directives/form-field-tooltip.directive';
import { IFormField } from '../form-field.interface';

// TODO move this back into FormField2Component
@Directive()
export abstract class AbstractFormFieldComponent implements IFormField, AfterContentInit {
  // View children are used to access the prefix and suffix wrappers
  @ViewChild('prefixWrapperRef') prefixWrapper?: ElementRef<HTMLDivElement>;
  @ViewChild('suffixWrapperRef') suffixWrapper?: ElementRef<HTMLDivElement>;

  // Content children are used to project the label, tooltip, prefix and suffix
  @ContentChild(FormFieldLabelDirective) projectedLabel?: FormFieldLabelDirective;
  @ContentChild(FormFieldTooltipDirective) projectedTooltip?: FormFieldTooltipDirective;
  @ContentChild(FormFieldPrefixDirective) projectedPrefix?: FormFieldPrefixDirective;
  @ContentChild(FormFieldSuffixDirective) projectedSuffix?: FormFieldSuffixDirective;

  hasLabel = false;
  hasTooltip = false;
  hasPrefix = false;
  hasSuffix = false;

  ngAfterContentInit(): void {
    this.hasLabel = !!this.projectedLabel;
    this.hasTooltip = !!this.projectedTooltip;
    this.hasPrefix = !!this.projectedPrefix;
    this.hasSuffix = !!this.projectedSuffix;
  }

  //#region IFormField

  abstract fieldId: string | null;
  abstract isLabelFloating: boolean;

  //#endregion
}
