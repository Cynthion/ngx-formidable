import {
  AfterContentInit,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  ElementRef,
  inject,
  Input,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { merge, Subject, takeUntil } from 'rxjs';
import { FieldLabelDirective } from '../../directives/field-label.directive';
import { FieldPrefixDirective } from '../../directives/field-prefix.directive';
import { FieldSuffixDirective } from '../../directives/field-suffix.directive';
import { FieldTooltipDirective } from '../../directives/field-tooltip.directive';
import { FieldDirective } from '../../directives/field.directive';
import { FieldDecoratorLayout, IFormzField } from '../../form-model';

@Component({
  selector: 'formz-field-decorator',
  templateUrl: './field-decorator.component.html',
  styleUrls: ['./field-decorator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FieldDecoratorComponent implements AfterContentInit, AfterViewInit, OnDestroy, IFormzField {
  // View children are used to access the prefix and suffix wrappers
  @ViewChild('prefixWrapperRef') prefixWrapper?: ElementRef<HTMLDivElement>;
  @ViewChild('suffixWrapperRef') suffixWrapper?: ElementRef<HTMLDivElement>;

  // Content children are used to project the label, tooltip, field, prefix and suffix
  @ContentChild(FieldLabelDirective) projectedLabel?: FieldLabelDirective;
  @ContentChild(FieldTooltipDirective) projectedTooltip?: FieldTooltipDirective;
  @ContentChild(FieldDirective) projectedField?: FieldDirective;
  @ContentChild(FieldPrefixDirective) projectedPrefix?: FieldPrefixDirective;
  @ContentChild(FieldSuffixDirective) projectedSuffix?: FieldSuffixDirective;

  @Input() decoratorLayout: FieldDecoratorLayout = 'single'; // TODO implement 'option' layout

  protected hasLabel = false;
  protected hasTooltip = false;
  protected hasPrefix = false;
  protected hasSuffix = false;

  private valueChangeSubject$ = new Subject<string>();
  private focusChangeSubject$ = new Subject<boolean>();
  private destroy$ = new Subject<void>();

  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);

  ngAfterContentInit(): void {
    this.hasLabel = !!this.projectedLabel;
    this.hasTooltip = !!this.projectedTooltip;
    this.hasPrefix = !!this.projectedPrefix;
    this.hasSuffix = !!this.projectedSuffix;
  }

  ngAfterViewInit(): void {
    // interact with the projected field content
    this.registerFieldEvents();
    this.adjustLayout();

    // evaluate the initial state of the field
    this.cdr.markForCheck();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  //#region IFormzField

  valueChange$ = this.valueChangeSubject$.asObservable();
  focusChange$ = this.focusChangeSubject$.asObservable();

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

  //#endregion

  private registerFieldEvents(): void {
    if (this.projectedField) {
      const { focusChange$, valueChange$ } = this.projectedField.formzField;

      // as a decorator, the wrapped field's events are forwarded
      focusChange$.pipe(takeUntil(this.destroy$)).subscribe((focused) => {
        this.focusChangeSubject$.next(focused);
      });

      valueChange$.pipe(takeUntil(this.destroy$)).subscribe((value) => {
        this.valueChangeSubject$.next(value);
      });

      merge(focusChange$, valueChange$)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.cdr.markForCheck();
        });
    }
  }

  private adjustLayout(): void {
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
