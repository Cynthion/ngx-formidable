import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
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
import {
  FieldAdornmentAlignment,
  FieldDecoratorLayout,
  FieldValueAlignment,
  FORMIDABLE_FIELD,
  IFormidableField
} from '../../models/formidable.model';
import { FieldErrorsComponent } from '../field-errors/field-errors.component';

/** How a label renders once its configured position is resolved against the field's own state. */
type FieldLabelState = 'outside' | 'resting' | 'floating' | 'border' | 'border-prefix';

/**
 * Wraps any form field and projects optional label, label adornment, prefix, and suffix.
 * Forwards focus/value events from the wrapped field and measures a projected
 * prefix/suffix, so the field's padding and an inside label clear it.
 *
 * ContentChildren:
 * - `FORMIDABLE_FIELD` (your IFormidableField component)
 * - `FieldLabelDirective` (wrapped label element)
 * - `FieldLabelAdornmentDirective` (wrapped label adornment element)
 * - `FieldPrefixDirective` (wrapped prefix element)
 * - `FieldSuffixDirective` (wrapped suffix element)
 * - `FieldHintDirective` (wrapped hint element(s), rendered below the field)
 *
 * Outputs (re-emitted from projected field):
 * - `@Output() valueChanged: EventEmitter<unknown>`
 * - `@Output() focusChanged: EventEmitter<boolean>`
 *
 * Host classes (the field's state, for theming):
 * - `.is-readonly`, `.is-disabled`, `.is-focused`, `.is-invalid`, `.label-resting`
 *
 * @example
 * ```html
 * <formidable-field-decorator>
 *   <formidable-input-field name="email" ngModel></formidable-input-field>
 *   <div formidableFieldLabel>Email address</div>
 *   <div formidableFieldLabelAdornment>?</div>
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
export class FieldDecoratorComponent implements AfterViewInit, OnDestroy, IFormidableField<unknown> {
  // View children are used to access the prefix and suffix wrappers
  @ViewChild('prefixWrapperRef') prefixWrapper?: ElementRef<HTMLDivElement>;
  @ViewChild('suffixWrapperRef') suffixWrapper?: ElementRef<HTMLDivElement>;

  /**
   * Where `FieldErrorsDirective` renders its component, so the layout container holds only the field.
   * Resolved statically: the directive reads it from its own `ngAfterViewInit`, and static queries are
   * available from `ngOnInit` onwards, which sidesteps hook ordering between the two views.
   */
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

  /**
   * Called by `FieldErrorsDirective` with the errors component it renders into this decorator's slot,
   * so the invalid state it already computes can surface as a host class the stylesheets target.
   */
  registerErrors(errors: FieldErrorsComponent): void {
    this.errors = errors;
  }

  ngAfterViewInit(): void {
    // interact with the projected field content
    this.forwardEvents();
    this.observeInsets();
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
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
    // Whether a `placeholder` blocks the label from resting is the position's call, not the field's:
    // `inside` yields the value area to it, `inside-placeholder` takes it over and hides it instead.
    if (position === 'inside') return this.canLabelRest && !this.placeholder ? 'resting' : 'floating';
    if (position === 'inside-placeholder') return this.canLabelRest ? 'resting' : 'floating';
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

  /**
   * The row collapses once the label has moved over the field: an adornment decorates that label, so on
   * its own it would be left stranded above a field it no longer belongs to.
   */
  protected get showsBeforeWrapper(): boolean {
    return !this.isLabelOverField && (this.hasLabel || this.hasLabelAdornment);
  }

  /**
   * The field's state, mirrored onto the host — this is where all of it is reachable at once. The label
   * lives here, so its colours are remapped from these classes; the projected field reads the same
   * classes with `:host-context()`, since custom properties set here inherit into it either way.
   */
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

  /** Only ever true with a `formidableFieldErrors` field inside: nothing else computes validity. */
  @HostBinding('class.is-invalid')
  get isInvalid(): boolean {
    return this.errors?.invalid ?? false;
  }

  /** The label stands in for the placeholder, so the field has to stop rendering its own. */
  @HostBinding('class.label-resting')
  get isLabelResting(): boolean {
    return this.labelState === 'resting';
  }

  /**
   * Whether the field renders a panel toggle inside its own box. The toggle is a fixed-size square at the
   * field's inner right edge, so the stylesheet turns this class into a right inset rather than measuring
   * it — which also spares a re-measure every time `readonly` / `disabled` add or remove the toggle.
   */
  @HostBinding('class.has-in-field-toggle')
  get hasInFieldToggle(): boolean {
    return !!this.projectedField?.hasInFieldToggle;
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

  /**
   * A projected prefix/suffix takes horizontal space from the field's box, which the stylesheet turns
   * into the field's padding and into the bounds of a label rendered over the value. Its wrapper
   * shrink-wraps it, so the wrapper's own width — padding included — is the whole inset, and collapses to
   * zero the moment nothing is projected. `ResizeObserver` covers every way that width moves: content
   * added or removed, a font loading, the wrapper hidden.
   */
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

  /** Moves the value clear of a prefix/suffix — and an inside label with it, so the two stay aligned. */
  private insetValue(): void {
    this.setInset('prefix', this.prefixWrapper?.nativeElement.offsetWidth ?? 0);
    this.setInset('suffix', this.suffixWrapper?.nativeElement.offsetWidth ?? 0);
  }

  /** Removing the property, rather than writing a zero, is what restores the field's own padding. */
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
