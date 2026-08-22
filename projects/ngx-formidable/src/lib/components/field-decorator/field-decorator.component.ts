import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  ElementRef,
  EventEmitter,
  HostBinding,
  inject,
  NgZone,
  OnDestroy,
  Output,
  ViewChild,
  ViewContainerRef
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { FieldHintDirective } from '../../directives/field-hint.directive';
import { FieldLabelAdornmentDirective } from '../../directives/field-label-adornment.directive';
import { FieldLabelDirective } from '../../directives/field-label.directive';
import { FieldPrefixDirective } from '../../directives/field-prefix.directive';
import { FieldSuffixDirective } from '../../directives/field-suffix.directive';
import { NgxFormidableFormDirective } from '../../forms/form.directive';
import { openPanelPosition } from '../../helpers/position.helpers';
import {
  FieldAdornmentAlignment,
  FieldDecoratorLayout,
  FieldValueAlignment,
  FORMIDABLE_FIELD,
  IFormidableField
} from '../../models/formidable.model';
import { FieldErrorsComponent } from '../field-errors/field-errors.component';

// How a label renders once its configured position is resolved against the field's own state.
type FieldLabelState = 'outside' | 'resting' | 'floating' | 'border' | 'border-prefix';

/**
 * Wraps any field and renders everything around it: the label, its adornment, a prefix and suffix, the hint
 * row and the error messages. Project the field into it, mark the rest with `formidableFieldLabel`,
 * `formidableFieldLabelAdornment`, `formidableFieldPrefix`, `formidableFieldSuffix` and `formidableFieldHint`.
 *
 * It reads the field rather than configuring it, so each field keeps its own layout — and a label position
 * that layout cannot honour falls back to `outside`.
 */
@Component({
  selector: 'formidable-field-decorator',
  templateUrl: './field-decorator.component.html',
  styleUrls: ['./field-decorator.component.scss'],
  // Deliberately not `OnPush` — see `tech/decoration.md`.
  // eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CommonModule]
})
export class FieldDecoratorComponent implements AfterViewInit, OnDestroy, IFormidableField<unknown> {
  private readonly formDirective = inject(NgxFormidableFormDirective, { optional: true });

  // View children are used to access the prefix and suffix wrappers
  @ViewChild('prefixWrapperRef') prefixWrapper?: ElementRef<HTMLDivElement>;
  @ViewChild('suffixWrapperRef') suffixWrapper?: ElementRef<HTMLDivElement>;

  // Where `FieldErrorsDirective` renders its component, so the layout container holds only the field.
  // `static: true` is what makes it readable whatever the hook order.
  @ViewChild('errorsSlot', { read: ViewContainerRef, static: true }) errorsSlot?: ViewContainerRef;

  // Content children are used to project the field, label, label adornment, prefix, suffix and hint
  @ContentChild(FORMIDABLE_FIELD) projectedField?: IFormidableField;
  @ContentChild(FieldHintDirective) projectedHint?: FieldHintDirective;
  @ContentChild(FieldLabelDirective) projectedLabel?: FieldLabelDirective;
  @ContentChild(FieldLabelAdornmentDirective) projectedLabelAdornment?: FieldLabelAdornmentDirective;
  @ContentChild(FieldPrefixDirective) projectedPrefix?: FieldPrefixDirective;
  @ContentChild(FieldSuffixDirective) projectedSuffix?: FieldSuffixDirective;

  // Getters, not fields: a consumer adds and removes a projected decoration at runtime (`@if`, `*ngIf`),
  // and a value latched in `ngAfterContentInit` would leave its wrapper shown — or hidden — forever.
  protected get hasLabel(): boolean {
    return !!this.projectedLabel;
  }

  protected get hasLabelAdornment(): boolean {
    return !!this.projectedLabelAdornment;
  }

  protected get hasPrefix(): boolean {
    return !!this.projectedPrefix;
  }

  protected get hasSuffix(): boolean {
    return !!this.projectedSuffix;
  }

  protected get hasHint(): boolean {
    return !!this.projectedHint;
  }

  // Read off the projected directives rather than host-bound by them: the wrappers these style are the
  // decorator's own elements, so it needs no global rule to reach them (a hint does).
  protected get prefixAlignment(): FieldAdornmentAlignment {
    return this.projectedPrefix?.align ?? 'center';
  }

  protected get suffixAlignment(): FieldAdornmentAlignment {
    return this.projectedSuffix?.align ?? 'center';
  }

  private readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly ngZone: NgZone = inject(NgZone);

  private valueChangeSubject$ = new Subject<unknown>();
  private focusChangeSubject$ = new Subject<boolean>();
  private destroy$ = new Subject<void>();
  private resizeObserver?: ResizeObserver;
  private errors?: FieldErrorsComponent;
  private isFocused = false;

  // Whether the label may transition yet. False until the field has settled on its first state, so the
  // initial resting-to-floating correction is not animated.
  protected isLabelAnimated = false;

  // Called by `FieldErrorsDirective` with the errors component it renders into this decorator's slot, so
  // the invalid state it already computes can surface as a host class the stylesheets target.
  registerErrors(errors: FieldErrorsComponent): void {
    this.errors = errors;
  }

  ngAfterViewInit(): void {
    // interact with the projected field content
    this.forwardEvents();
    this.observeInsets();
    this.allowLabelAnimation();
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // #region IFormidableField

  valueChange$ = this.valueChangeSubject$.asObservable();
  focusChange$ = this.focusChangeSubject$.asObservable();

  /** The projected field's own value stream, re-emitted so a consumer can bind it on the decorator instead. */
  @Output() valueChanged = new EventEmitter<unknown>();

  /** The projected field's own focus stream, re-emitted so a consumer can bind it on the decorator instead. */
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

  // #region ARIA ids

  get labelId(): string {
    return `${this.fieldId}-label`;
  }

  get hintId(): string {
    return `${this.fieldId}-hint`;
  }

  get errorsId(): string {
    return `${this.fieldId}-errors`;
  }

  // What names a field the `<label for>` cannot reach — the groups, the toggle and the slider.
  get labelledById(): string | null {
    return this.hasLabel ? this.labelId : null;
  }

  // Unconditional: both wrappers always render, and a reference to a hidden or empty element adds nothing
  // to the accessible description — so there is no state here to track or to go stale.
  get describedByIds(): string {
    return `${this.hintId} ${this.errorsId}`;
  }

  // #endregion

  get readonly(): boolean {
    return this.projectedField?.readonly ?? false;
  }

  get disabled(): boolean {
    return this.projectedField?.disabled ?? false;
  }

  /** Drives the label's required marker. Presentational only, and the form may switch it off for all fields. */
  get showRequiredMarker(): boolean {
    return (this.formDirective?.showRequiredMarkers() ?? true) && (this.projectedField?.showRequiredMarker ?? false);
  }

  get value(): unknown {
    return this.projectedField?.value ?? null;
  }

  get canLabelRest(): boolean {
    return this.projectedField?.canLabelRest ?? false;
  }

  // How the label actually renders — the configured `position` resolved against the field's own state and
  // layout.
  get labelState(): FieldLabelState {
    const position = this.projectedLabel?.position;

    if (!position || position === 'outside' || this.projectedField?.decoratorLayout !== 'horizontal') {
      return 'outside';
    }
    // Whether a `placeholder` blocks the label from resting is the position's call, not the field's:
    // `inside` yields the value area to it, `inside-placeholder` takes it over and hides it instead.
    if (position === 'inside') return this.canLabelRest && !this.placeholder ? 'resting' : 'floating';
    if (position === 'inside-placeholder') return this.canLabelRest ? 'resting' : 'floating';
    if (position === 'inside-floating') return 'floating';

    return position; // 'border' | 'border-prefix'
  }

  // Where the field's value sits, which a projected prefix/suffix aligns with. Fields that do not say
  // center their value, so the prefix centers on the field's box too.
  get valueAlignment(): FieldValueAlignment {
    return this.projectedField?.valueAlignment ?? 'center';
  }

  // Whether the label sits over the value area, so the field has to keep its value clear of it.
  @HostBinding('class.label-inside')
  get isLabelInside(): boolean {
    const state = this.labelState;

    return state === 'resting' || state === 'floating';
  }

  // Whether the label renders over the field rather than in normal flow above it. Such a label lives in
  // the field's own container, so `.before-wrapper` no longer has to reserve any space for it.
  protected get isLabelOverField(): boolean {
    return this.labelState !== 'outside';
  }

  // The row collapses once the label has moved over the field: an adornment decorates that label, so on
  // its own it would be left stranded above a field it no longer belongs to.
  protected get showsBeforeWrapper(): boolean {
    return !this.isLabelOverField && (this.hasLabel || this.hasLabelAdornment);
  }

  // The field's state, mirrored onto the host — this is where all of it is reachable at once. The label
  // lives here, so its colours are remapped from these classes; the projected field reads the same classes
  // with `:host-context()`, since custom properties set here inherit into it either way.
  @HostBinding('class.is-readonly')
  get isReadonly(): boolean {
    return this.readonly;
  }

  @HostBinding('class.is-disabled')
  get isDisabled(): boolean {
    return this.disabled;
  }

  @HostBinding('class.is-focused')
  get isFieldFocused(): boolean {
    return this.isFocused;
  }

  // Only ever true with a `formidableFieldErrors` field inside: nothing else computes validity.
  @HostBinding('class.is-invalid')
  get isInvalid(): boolean {
    return this.errors?.invalid ?? false;
  }

  // The label stands in for the placeholder, so the field has to stop rendering its own.
  @HostBinding('class.label-resting')
  get isLabelResting(): boolean {
    return this.labelState === 'resting';
  }

  // Whether the field renders a panel toggle inside its own box. The toggle is a fixed-size square at the
  // field's inner right edge, so the stylesheet turns this class into a right inset rather than measuring
  // it — which also spares a re-measure every time `readonly` / `disabled` add or remove the toggle.
  @HostBinding('class.has-in-field-toggle')
  get hasInFieldToggle(): boolean {
    return !!this.projectedField?.hasInFieldToggle;
  }

  // The decorator is a stacking context, so everything it renders is ordered inside it and none of it can
  // reach a consumer's own layers. An open panel is the exception the consumer wants — it has to cover what
  // is around it — so the host itself rises for as long as one is open, and only then. Which of the two it
  // rises to is the panel's kind: a sheet spans the viewport and outranks an anchored panel.
  @HostBinding('class.has-open-panel')
  get hasOpenPanel(): boolean {
    const position = openPanelPosition(this.projectedField);

    return position !== null && position !== 'sheet';
  }

  @HostBinding('class.has-open-sheet')
  get hasOpenSheet(): boolean {
    return openPanelPosition(this.projectedField) === 'sheet';
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

  // As a decorator, the wrapped field events are forwarded.
  private forwardEvents(): void {
    if (this.projectedField) {
      this.projectedField.focusChange$.pipe(takeUntil(this.destroy$)).subscribe((focused) => {
        this.isFocused = focused;
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

  private allowLabelAnimation(): void {
    // A frame and not a microtask: every option field resolves its projected options in a `queueMicrotask`,
    // so only a frame is reliably after all of them.
    requestAnimationFrame(() => (this.isLabelAnimated = true));
  }

  // Turns a projected prefix/suffix wrapper's measured width into the field's value inset, and keeps it in
  // step with every way that width moves.
  private observeInsets(): void {
    if (this.decoratorLayout !== 'horizontal') return;

    const wrappers = [this.prefixWrapper?.nativeElement, this.suffixWrapper?.nativeElement].filter(
      (wrapper): wrapper is HTMLDivElement => !!wrapper
    );

    // Writes custom properties only, so it never needs a change-detection pass of its own.
    this.ngZone.runOutsideAngular(() => {
      this.resizeObserver = new ResizeObserver(() => this.insetValue());
      wrappers.forEach((wrapper) => this.resizeObserver?.observe(wrapper));
    });
  }

  // Moves the value clear of a prefix/suffix — and an inside label with it, so the two stay aligned.
  private insetValue(): void {
    this.setInset('prefix', this.prefixWrapper?.nativeElement.offsetWidth ?? 0);
    this.setInset('suffix', this.suffixWrapper?.nativeElement.offsetWidth ?? 0);
  }

  // Removing the property, rather than writing a zero, is what restores the field's own padding.
  private setInset(side: 'prefix' | 'suffix', inset: number): void {
    const style = this.elementRef.nativeElement.style;
    const property = `--formidable-field-${side}-inset`;

    if (inset > 0) {
      style.setProperty(property, `${inset}px`);
    } else {
      style.removeProperty(property);
    }
  }
}
