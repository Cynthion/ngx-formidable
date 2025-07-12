import {
  AfterContentInit,
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Output,
  ViewChild
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { FieldLabelDirective } from '../../directives/field-label.directive';
import { FieldPrefixDirective } from '../../directives/field-prefix.directive';
import { FieldSuffixDirective } from '../../directives/field-suffix.directive';
import { FieldTooltipDirective } from '../../directives/field-tooltip.directive';
import { FieldDecoratorLayout, FORMZ_FIELD, IFormzField } from '../../form-model';

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

  // Content children are used to project the field, label, tooltip, prefix and suffix
  @ContentChild(FORMZ_FIELD) projectedField?: IFormzField;
  @ContentChild(FieldLabelDirective) projectedLabel?: FieldLabelDirective;
  @ContentChild(FieldTooltipDirective) projectedTooltip?: FieldTooltipDirective;
  @ContentChild(FieldPrefixDirective) projectedPrefix?: FieldPrefixDirective;
  @ContentChild(FieldSuffixDirective) projectedSuffix?: FieldSuffixDirective;

  protected hasLabel = false;
  protected hasTooltip = false;
  protected hasPrefix = false;
  protected hasSuffix = false;

  private valueChangeSubject$ = new Subject<string>();
  private focusChangeSubject$ = new Subject<boolean>();
  private destroy$ = new Subject<void>();

  ngAfterContentInit(): void {
    this.hasLabel = !!this.projectedLabel;
    this.hasTooltip = !!this.projectedTooltip;
    this.hasPrefix = !!this.projectedPrefix;
    this.hasSuffix = !!this.projectedSuffix;
  }

  ngAfterViewInit(): void {
    // interact with the projected field content
    this.forwardEvents();
    this.adjustLayout();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  //#region IFormzField

  valueChange$ = this.valueChangeSubject$.asObservable();
  focusChange$ = this.focusChangeSubject$.asObservable();

  @Output() valueChanged = new EventEmitter<string>();
  @Output() focusChanged = new EventEmitter<boolean>();

  get fieldId(): string {
    return this.projectedField?.fieldId ?? '';
  }

  get value(): string {
    return this.projectedField?.value ?? '';
  }

  get isLabelFloating(): boolean {
    if (!this.projectedField) return false;

    const isLabelConfiguredToFloat = this.projectedLabel?.isFloating ?? false;
    const isFieldLabelFloating = this.projectedField?.isLabelFloating ?? false;

    return isLabelConfiguredToFloat && isFieldLabelFloating;
  }

  get elementRef(): ElementRef<HTMLElement> {
    if (!this.projectedField) {
      throw new Error('FieldDecoratorComponent: projectedField is not available yet.');
    }
    return this.projectedField?.elementRef;
  }

  get decoratorLayout(): FieldDecoratorLayout {
    return this.projectedField?.decoratorLayout ?? 'single';
  }

  /** As a decorator, the wrapped field events are forwarded. */
  private forwardEvents(): void {
    if (this.projectedField) {
      this.projectedField.focusChange$.pipe(takeUntil(this.destroy$)).subscribe((focused) => {
        this.focusChangeSubject$.next(focused);
        this.focusChanged.emit(focused);
      });

      this.projectedField.valueChange$.pipe(takeUntil(this.destroy$)).subscribe((value) => {
        this.valueChangeSubject$.next(value);
        this.valueChanged.emit(value);
      });
    }
  }

  //#endregion

  private adjustLayout(): void {
    if (this.decoratorLayout !== 'single') return;

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
