import { CommonModule } from '@angular/common';
import {
  AfterContentInit,
  AfterViewInit,
  Component,
  ContentChild,
  ElementRef,
  EventEmitter,
  HostBinding,
  inject,
  OnDestroy,
  Output,
  ViewChild,
  ViewContainerRef
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { FieldLabelDirective } from '../../directives/field-label.directive';
import { FieldPrefixDirective } from '../../directives/field-prefix.directive';
import { FieldSuffixDirective } from '../../directives/field-suffix.directive';
import { FieldTooltipDirective } from '../../directives/field-tooltip.directive';
import {
  FieldDecoratorLayout,
  FieldValueAlignment,
  FORMIDABLE_FIELD,
  IFormidableField
} from '../../models/formidable.model';

/** How a label renders once its configured position is resolved against the field's own state. */
type FieldLabelState = 'outside' | 'resting' | 'floating' | 'border' | 'border-prefix';

/**
 * Wraps any form field and projects optional label, tooltip, prefix, and suffix.
 * Forwards focus/value events from the wrapped field and adjusts layout for
 * prefix/suffix padding.
 *
 * ContentChildren:
 * - `FORMIDABLE_FIELD` (your IFormidableField component)
 * - `FieldLabelDirective` (wrapped label element)
 * - `FieldTooltipDirective` (wrapped tooltip element)
 * - `FieldPrefixDirective` (wrapped prefix element)
 * - `FieldSuffixDirective` (wrapped suffix element)
 *
 * Outputs (re-emitted from projected field):
 * - `@Output() valueChanged: EventEmitter<unknown>`
 * - `@Output() focusChanged: EventEmitter<boolean>`
 *
 * @example
 * ```html
 * <formidable-field-decorator>
 *   <formidable-input-field name="email" ngModel></formidable-input-field>
 *   <div formidableFieldLabel>Email address</div>
 *   <div formidableFieldTooltip>Enter your work email</div>
 *   <div formidableFieldPrefix>@</div>
 * </formidable-field-decorator>
 * ```
 */
// Deliberately not `OnPush`: `labelState` is a getter over the projected field's `readonly`, `disabled`,
// `placeholder` and mask configuration, none of which this component can observe. Under `OnPush` the label
// silently kept a stale state whenever a consumer changed one of them at runtime. The template is a handful
// of bindings over trivial getters, so checking it every cycle is cheaper than the workarounds were.
@Component({
  selector: 'formidable-field-decorator',
  templateUrl: './field-decorator.component.html',
  styleUrls: ['./field-decorator.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class FieldDecoratorComponent implements AfterContentInit, AfterViewInit, OnDestroy, IFormidableField<unknown> {
  // View children are used to access the prefix and suffix wrappers
  @ViewChild('prefixWrapperRef') prefixWrapper?: ElementRef<HTMLDivElement>;
  @ViewChild('suffixWrapperRef') suffixWrapper?: ElementRef<HTMLDivElement>;

  /**
   * Where `FieldErrorsDirective` renders its component, so the layout container holds only the field.
   * Resolved statically: the directive reads it from its own `ngAfterViewInit`, and static queries are
   * available from `ngOnInit` onwards, which sidesteps hook ordering between the two views.
   */
  @ViewChild('errorsSlot', { read: ViewContainerRef, static: true }) errorsSlot?: ViewContainerRef;

  // Content children are used to project the field, label, tooltip, prefix and suffix
  @ContentChild(FORMIDABLE_FIELD) projectedField?: IFormidableField;
  @ContentChild(FieldLabelDirective) projectedLabel?: FieldLabelDirective;
  @ContentChild(FieldTooltipDirective) projectedTooltip?: FieldTooltipDirective;
  @ContentChild(FieldPrefixDirective) projectedPrefix?: FieldPrefixDirective;
  @ContentChild(FieldSuffixDirective) projectedSuffix?: FieldSuffixDirective;

  protected hasLabel = false;
  protected hasTooltip = false;
  protected hasPrefix = false;
  protected hasSuffix = false;

  private readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef);

  private valueChangeSubject$ = new Subject<unknown>();
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

  // #region IFormidableField

  valueChange$ = this.valueChangeSubject$.asObservable();
  focusChange$ = this.focusChangeSubject$.asObservable();

  @Output() valueChanged = new EventEmitter<unknown>();
  @Output() focusChanged = new EventEmitter<boolean>();

  get fieldId(): string {
    return this.projectedField?.fieldId ?? '';
  }

  get name(): string {
    return this.projectedField?.name ?? '';
  }

  get placeholder(): string {
    return this.projectedField?.placeholder ?? '';
  }

  get readonly(): boolean {
    return this.projectedField?.readonly ?? false;
  }

  get disabled(): boolean {
    return this.projectedField?.disabled ?? false;
  }

  get value(): unknown {
    return this.projectedField?.value ?? null;
  }

  get canLabelRest(): boolean {
    return this.projectedField?.canLabelRest ?? false;
  }

  /**
   * How the label actually renders — the configured `position` resolved against the field's own state.
   * Any position other than `outside` needs a field with room for the label, which only the horizontal
   * layout has (`toggle` is inline, the groups are vertical), so everything else falls back to `outside`.
   */
  get labelState(): FieldLabelState {
    const position = this.projectedLabel?.position;

    if (!position || position === 'outside' || this.projectedField?.decoratorLayout !== 'horizontal') {
      return 'outside';
    }
    if (position === 'inside') return this.canLabelRest ? 'resting' : 'floating';
    if (position === 'inside-floating') return 'floating';

    return position; // 'border' | 'border-prefix'
  }

  /**
   * Where the field's value sits, which a projected prefix/suffix aligns with. Fields that do not say
   * center their value, so the prefix centers on the field's box too.
   */
  get valueAlignment(): FieldValueAlignment {
    return this.projectedField?.valueAlignment ?? 'center';
  }

  /** Whether the label sits over the value area, so the field has to keep its value clear of it. */
  @HostBinding('class.label-inside')
  get isLabelInside(): boolean {
    const state = this.labelState;

    return state === 'resting' || state === 'floating';
  }

  /**
   * Whether the label renders over the field rather than in normal flow above it. Such a label lives in
   * the field's own container, so `.before-wrapper` no longer has to reserve any space for it.
   */
  protected get isLabelOverField(): boolean {
    return this.labelState !== 'outside';
  }

  /** Nothing is left in `.before-wrapper` once an overlay label has moved out of it, so it collapses. */
  protected get showsBeforeWrapper(): boolean {
    return this.hasTooltip || (this.hasLabel && !this.isLabelOverField);
  }

  /** Mirrored onto the host so a `border` label's band can follow the field's remapped fill. */
  @HostBinding('class.is-readonly')
  get isReadonly(): boolean {
    return this.readonly;
  }

  @HostBinding('class.is-disabled')
  get isDisabled(): boolean {
    return this.disabled;
  }

  get fieldRef(): ElementRef<HTMLElement> {
    if (!this.projectedField) {
      throw new Error('FieldDecoratorComponent: projectedField is not available yet.');
    }
    return this.projectedField?.fieldRef;
  }

  get decoratorLayout(): FieldDecoratorLayout {
    return this.projectedField?.decoratorLayout ?? 'horizontal';
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

  // #endregion

  private adjustLayout(): void {
    if (this.decoratorLayout !== 'horizontal') return;

    requestAnimationFrame(() => {
      // if prefix/suffix are projected, adjust the padding of the field
      const field = this.fieldRef.nativeElement;
      const prefixWrapper = this.prefixWrapper?.nativeElement;
      const suffixWrapper = this.suffixWrapper?.nativeElement;

      const prefixWidth = this.projectedPrefix?.elementRef.nativeElement.offsetWidth || 0;
      const suffixWidth = this.projectedSuffix?.elementRef.nativeElement.offsetWidth || 0;

      if (field && prefixWrapper && prefixWidth) {
        const prefixStyle = window.getComputedStyle(prefixWrapper);
        const prefixPaddingLeft = parseFloat(prefixStyle.paddingLeft) || 0;
        const prefixPaddingRight = parseFloat(prefixStyle.paddingRight) || 0;

        this.insetValue('left', prefixPaddingLeft + prefixWidth + prefixPaddingRight);
      }
      if (field && suffixWrapper && suffixWidth) {
        const suffixStyle = window.getComputedStyle(suffixWrapper);
        const suffixPaddingLeft = parseFloat(suffixStyle.paddingLeft) || 0;
        const suffixPaddingRight = parseFloat(suffixStyle.paddingRight) || 0;

        this.insetValue('right', suffixPaddingLeft + suffixWidth + suffixPaddingRight);
      }
    });
  }

  /** Moves the value clear of a prefix/suffix — and an inside label with it, so the two stay aligned. */
  private insetValue(side: 'left' | 'right', inset: number): void {
    this.fieldRef.nativeElement.style[side === 'left' ? 'paddingLeft' : 'paddingRight'] = `${inset}px`;
    this.elementRef.nativeElement.style.setProperty(`--formidable-field-value-inset-${side}`, `${inset}px`);
  }
}
