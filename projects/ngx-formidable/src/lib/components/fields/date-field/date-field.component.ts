import { CommonModule } from '@angular/common';
import {
  AfterContentInit,
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  ElementRef,
  forwardRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { addDays, format, isEqual } from 'date-fns';
import { NgxMaskConfig, NgxMaskDirective } from 'ngx-mask';
import Pikaday, { PikadayI18nConfig, PikadayOptions } from 'pikaday';
import { FieldToggleIconDirective } from '../../../directives/field-toggle-icon.directive';
import {
  findSegmentAtCaret,
  formatToDateTokenMask,
  isValidDateObject,
  normalizeTimePart,
  parseUnicodeDateTime,
  stepDateTimeUnit,
  UNICODE_DATE_TOKENS,
  validateUnicodeDateTokenFormat
} from '../../../helpers/format.helpers';
import { renderEmptyMask } from '../../../helpers/input.helpers';
import { scrollIntoView, updatePanelPosition } from '../../../helpers/position.helpers';
import {
  FieldDecoratorLayout,
  FORMIDABLE_FIELD,
  FormidableEmptyHint,
  FormidablePanelPosition,
  IFormidableDateField
} from '../../../models/formidable.model';
import { BaseFieldDirective } from '../base-field.directive';

/**
 * A date entered three ways over one value: typed into a mask derived from `unicodeTokenFormat`, picked from a
 * Pikaday calendar in the panel, or stepped with the arrow keys on the segment under the caret.
 *
 * Typing commits on blur, because a half-typed date is not a date — the exception is clearing the field,
 * which commits at once so the arrows step from the default again. The calendar and the arrows commit
 * immediately. A step outside `minDate`/`maxDate` is refused rather than clamped.
 *
 * Project `[formidableFieldToggleIcon]` content to replace the calendar toggle's default icon. The inputs
 * below `unicodeTokenFormat` are passed straight through to Pikaday under the same names.
 *
 * `time-field` is the same interface for a time of day, without a panel.
 */
@Component({
  selector: 'formidable-date-field',
  templateUrl: './date-field.component.html',
  styleUrls: ['./date-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, NgxMaskDirective],
  providers: [
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateFieldComponent),
      multi: true
    },
    // required to provide this component as IFormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: DateFieldComponent
    }
  ]
})
export class DateFieldComponent
  extends BaseFieldDirective<Date | null>
  implements IFormidableDateField, OnInit, AfterContentInit, AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild('dateRef', { static: true }) dateRef!: ElementRef<HTMLDivElement>;
  @ViewChild('inputRef', { static: true }) inputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('pickerRef') pickerRef?: ElementRef<HTMLDivElement>;

  @ContentChild(FieldToggleIconDirective) private projectedToggleIcon?: FieldToggleIconDirective;

  // False while no `[formidableFieldToggleIcon]` is projected, which is when the default CSS arrow is drawn.
  protected hasToggleIcon = false;

  protected keyboardCallback = (event: KeyboardEvent) => this.handleKeydown(event);
  protected externalClickCallback = () => this.handleExternalClick();
  // Synchronous: the base debounces resize/scroll, so the new layout has already settled.
  protected windowResizeScrollCallback = () => updatePanelPosition(this.dateRef, this.panelRef);
  protected registeredKeys = ['Escape', 'Tab', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Enter'];

  private maskChar = '0';
  private readonly defaultUnicodeTokenFormat = 'yyyy-MM-dd';

  private readonly staticOptions: PikadayOptions = {
    field: undefined, // not supported
    trigger: undefined, // not supported
    bound: false, // not supported
    position: undefined, // not supported
    reposition: false, // not supported
    container: undefined, // not supported
    showWeekNumber: false, // not supported
    pickWholeWeek: false, // not supported
    isRTL: false, // not supported
    mainCalendar: 'left', // not supported
    events: [], // not supported
    theme: undefined, // not supported
    blurFieldOnSelect: false, // not supported
    formatStrict: false, // not supported
    keyboardInput: false, // not supported
    toString: (date: Date, unicodeTokenFormat: string): string => this.onFormat(date, unicodeTokenFormat),
    parse: (dateString: string, unicodeTokenFormat: string): Date | null =>
      this.onParse(dateString, unicodeTokenFormat),
    onSelect: (date: Date) => this.selectDate(date),
    onDraw: () => this.decoratePikadayControls()
  };

  private readonly defaultOptions: PikadayOptions = {
    ariaLabel: undefined,
    format: this.defaultUnicodeTokenFormat,
    defaultDate: undefined,
    setDefaultDate: true,
    firstDay: 1,
    minDate: undefined,
    maxDate: undefined,
    disableWeekends: false,
    disableDayFn: undefined,
    yearRange: 2,
    i18n: {
      previousMonth: 'Previous Month',
      nextMonth: 'Next Month',
      months: [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
      ],
      weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      weekdaysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    },
    yearSuffix: '',
    showMonthAfterYear: false,
    showDaysInNextAndPreviousMonths: true,
    enableSelectionDaysInNextAndPreviousMonths: true,
    numberOfMonths: 1
  };

  // The inputs `updateOptions()` reads. Every Pikaday passthrough input has a `defaultOptions` key of the
  // same name (it needs one for its fallback); only `format` is fed by `unicodeTokenFormat`.
  private readonly optionInputs = new Set([...Object.keys(this.defaultOptions), 'unicodeTokenFormat']);

  private picker?: Pikaday;

  override ngOnInit(): void {
    super.ngOnInit();

    if (!validateUnicodeDateTokenFormat(this.unicodeTokenFormat)) {
      console.warn(
        `[ngx-formidable] Invalid unicodeTokenFormat: "${this.unicodeTokenFormat}". ` +
          `Falling back to default "${this.defaultUnicodeTokenFormat}". Supported tokens: ${UNICODE_DATE_TOKENS.join(', ')}.`
      );

      this.unicodeTokenFormat = this.defaultUnicodeTokenFormat;
    }

    // must run before the first binding pass, so the input carries the correct mask
    this.updateMask();
  }

  ngAfterContentInit(): void {
    this.hasToggleIcon = !!this.projectedToggleIcon;
    this.cdRef.markForCheck();
  }

  override ngAfterViewInit(): void {
    super.ngAfterViewInit();

    this.updateOptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const changedOptions = Object.entries(changes)
      .filter(([key, change]) => !change.firstChange && this.optionInputs.has(key))
      .map(([key]) => key);

    if (changedOptions.length === 0) return;

    if (changedOptions.includes('unicodeTokenFormat')) this.updateMask();

    this.updateOptions();

    // re-render the current value, since the format it was rendered with has changed
    if (changedOptions.includes('unicodeTokenFormat')) this.setDate(this.selectedDate);
  }

  // Typing commits on blur — a half-typed date is not a date — so value changes are handled in the
  // selectDate method. Wiping the text is the exception: it commits at once, or the cleared date would stay
  // the model's and `stepSegment` would keep stepping from it.
  protected override onValueChange(): void {
    if (this.selectedDate && this.isInputCleared) {
      this.setDate(null);
      return;
    }

    this.isFieldFilled = !!this.value;
  }

  protected doOnValueChange(): void {
    // No additional actions needed
  }

  protected doOnFocusChange(isFocused: boolean): void {
    // A readonly field has nothing to type into: it neither hands its display to ngxMask nor commits on blur.
    if (this.readonly) return;

    // hand the empty display over to ngxMask while focused (see renderEmpty)
    if (isFocused) {
      if (this.selectedDate == null) this.renderEmpty();
      return;
    }

    // try set date on blur
    this.trySetDateFromInput(this.inputRef.nativeElement.value);
  }

  // Focus moved onto this field's own panel, so the blur that follows is neither a commit nor a touch.
  protected override ignoresBlur(): boolean {
    const ignore = this.ignoreNextBlur;
    this.ignoreNextBlur = false;

    return ignore;
  }

  private handleKeydown(event: KeyboardEvent): void {
    const date = this.picker?.getDate();

    // While the calendar is open, arrow keys navigate it — stop them from also
    // moving the text caret in the input (base directive lets Left/Right through).
    if (this.isPanelOpen && event.key.startsWith('Arrow')) {
      event.preventDefault();
    }

    switch (event.key) {
      case 'Escape':
      case 'Tab':
      case 'Enter':
        if (this.isPanelOpen) this.togglePanel(false);
        // Commit what's in the input — it reflects both typing and calendar
        // arrow-navigation — never the picker's default cursor (which is "today").
        this.trySetDateFromInput(this.inputRef.nativeElement.value);
        break;
      case 'ArrowDown':
        // Alt+Arrow works the panel, the way a native <select> and the ARIA combobox pattern do.
        // Plain arrows never open it — they belong to the value.
        if (event.altKey) {
          this.togglePanel(true);
        } else if (!this.isPanelOpen) {
          this.stepSegment(-1);
        } else if (date) {
          const nextDate = addDays(date, 7);
          this.picker?.setDate(nextDate, true); // silent update
        }
        break;
      case 'ArrowUp':
        if (event.altKey) {
          this.togglePanel(false);
        } else if (!this.isPanelOpen) {
          this.stepSegment(1);
        } else if (date) {
          const nextDate = addDays(date, -7);
          this.picker?.setDate(nextDate, true); // silent update
        }
        break;
      case 'ArrowLeft':
        if (this.isPanelOpen && date) {
          const nextDate = addDays(date, -1);
          this.picker?.setDate(nextDate, true); // silent update
        }
        break;
      case 'ArrowRight':
        if (this.isPanelOpen && date) {
          const nextDate = addDays(date, 1);
          this.picker?.setDate(nextDate, true); // silent update
        }
        break;
    }
  }

  // Steps the date part under the caret by one, and leaves that part selected so repeated arrows keep to
  // it — and so the next digit typed replaces it.
  //
  // The input text is what gets stepped, not `selectedDate`: it also carries what was typed but not yet
  // committed. An empty field is seeded first, so arrows alone can fill it.
  private stepSegment(direction: 1 | -1): void {
    const input = this.inputRef.nativeElement;
    const segment = findSegmentAtCaret(this.unicodeTokenFormat, input.selectionStart ?? 0);
    if (!segment) return;

    const base =
      this.onParse(input.value, this.unicodeTokenFormat) ??
      this.selectedDate ??
      this.getDefaultDate(this.minDate, this.maxDate, this.defaultDate);

    const nextDate = normalizeTimePart(stepDateTimeUnit(base, segment.unit, direction));
    if (this.isOutOfRange(nextDate)) return;

    this.setDate(nextDate);

    // setDate re-renders the input from a setTimeout of its own; ours has to land after it
    setTimeout(() => input.setSelectionRange(segment.start, segment.end));
  }

  // A step is refused rather than clamped, so arrows can never reach a date the calendar forbids.
  private isOutOfRange(date: Date): boolean {
    if (this.minDate && date < normalizeTimePart(this.minDate)) return true;
    if (this.maxDate && date > normalizeTimePart(this.maxDate)) return true;

    return false;
  }

  private handleExternalClick(): void {
    if (!this.isPanelOpen) return;

    this.togglePanel(false);
  }

  // #region ControlValueAccessor

  protected doWriteValue(value: Date | null): void {
    this.trySetDateFromInput(value);
  }

  // #endregion

  // #region IFormidableField

  get value(): Date | null {
    return this.selectedDate || null;
  }

  get fieldRef(): ElementRef<HTMLElement> {
    return this.dateRef as ElementRef<HTMLElement>;
  }

  protected override get focusElement(): HTMLElement {
    return this.inputRef.nativeElement;
  }

  // Mirrors the template: there is nothing to open once the field is readonly or disabled.
  get hasInFieldToggle(): boolean {
    return !this.readonly && !this.disabled;
  }

  decoratorLayout: FieldDecoratorLayout = 'horizontal';

  // #endregion

  // #region IFormidableDateField

  /**
   * A Unicode date format (`y`, `M`, `d` tokens). Decides the mask, the display, and which segment the arrow
   * keys step. An unrecognized format warns and falls back to the default.
   */
  @Input() unicodeTokenFormat = this.defaultUnicodeTokenFormat;
  /** What an empty, unfocused field shows: underscores (default, "____-__-__") or the `unicodeTokenFormat` ("dd . MM . yyyy"). */
  @Input() emptyHint: FormidableEmptyHint = 'underscores';

  protected ngxMask = formatToDateTokenMask(this.unicodeTokenFormat!, this.maskChar);

  protected ngxMaskConfig: Pick<NgxMaskConfig, 'showMaskTyped' | 'leadZeroDateTime' | 'dropSpecialCharacters'> = {
    showMaskTyped: true,
    leadZeroDateTime: false, // must be enforced by unicodeTokenFormat, if required
    dropSpecialCharacters: false // keep special characters like '-', '.' or '/' in the input
  };

  // An empty date field always shows its `emptyHint` in the value area, so a label can never rest there.
  protected override get showsEmptyValueHint(): boolean {
    return true;
  }

  // ngxMask's own empty display: the mask with every slot as its placeholder character.
  private get maskPlaceholder(): string {
    return this.ngxMask.replace(/\w/g, '_');
  }

  // The resting display of an empty field for the current `emptyHint`: the format string, or
  // `maskPlaceholder`.
  private get emptyDisplay(): string {
    return this.emptyHint === 'format' ? (this.unicodeTokenFormat ?? '') : this.maskPlaceholder;
  }

  // ngxMask either empties the input outright or leaves the slots it renders for a focused empty field.
  private get isInputCleared(): boolean {
    const value = this.inputRef.nativeElement.value;

    return value === '' || value === this.maskPlaceholder;
  }

  // Shows the `emptyHint` at rest, but lets ngxMask own the text while focused.
  private renderEmpty(): void {
    renderEmptyMask(this.inputRef.nativeElement, this.emptyDisplay, this.maskPlaceholder, this.isFieldFocused);
  }

  private selectedDate: Date | null = null;

  public selectDate(date: Date | null): void {
    // only trigger value changes if there are changes
    // (panel could close without date change)
    if (this.selectedDate === null && date === null) return;
    if (this.selectedDate === undefined && date === undefined) return;
    if (this.selectedDate && date && isEqual(normalizeTimePart(this.selectedDate), normalizeTimePart(date))) return;

    this.selectedDate = date ? normalizeTimePart(date) : null;

    this.valueChangeSubject$.next(this.selectedDate);
    this.valueChanged.emit(this.selectedDate);
    this.isFieldFilled = !!this.selectedDate;
    this.commit(this.selectedDate); // notify ControlValueAccessor of the change
    this.touch();
    this.togglePanel(false);
  }

  // #endregion

  // #region IFormidablePikadayOptions

  /** Accessible name for the calendar itself, which is a `dialog` and so needs one of its own. */
  @Input() ariaLabel?: string;

  /** Where the calendar opens, and what an arrow key steps from, when the field is empty. */
  @Input() defaultDate?: Date;

  /** Whether `defaultDate` is also selected on open, rather than only shown. */
  @Input() setDefaultDate?: boolean;

  /** First day of the week, `0` for Sunday. */
  @Input() firstDay?: number;

  /** Earliest selectable date. Also refuses an arrow step past it, rather than clamping to it. */
  @Input() minDate?: Date;

  /** Latest selectable date. Also refuses an arrow step past it, rather than clamping to it. */
  @Input() maxDate?: Date;

  /** Makes Saturdays and Sundays unselectable, without needing a `disableDayFn` for it. */
  @Input() disableWeekends?: boolean;

  /** Returns `true` for a date that cannot be selected — holidays, blackout dates. */
  @Input() disableDayFn?: (date: Date) => boolean;

  /** A number of years either side of the current one, or an explicit `[from, to]` pair. */
  @Input() yearRange?: number | number[];

  /** Month and weekday names, and the navigation labels. Replace it whole; there is no per-key merge. */
  @Input() i18n?: PikadayI18nConfig = undefined;

  /** Appended to the year in the calendar's header — a era marker, or a localized "year" word. */
  @Input() yearSuffix?: string;

  /** Puts the year before the month in the header, for locales that read it that way. */
  @Input() showMonthAfterYear?: boolean;

  /** Fills the leading and trailing cells of the grid with the neighbouring months' days. */
  @Input() showDaysInNextAndPreviousMonths?: boolean;

  /** Makes those neighbouring-month days selectable rather than only visible. */
  @Input() enableSelectionDaysInNextAndPreviousMonths?: boolean;

  /** How many months the calendar shows side by side. */
  @Input() numberOfMonths?: number;

  private updateOptions(): void {
    const viewDate = this.getDefaultDate(this.minDate, this.maxDate, this.defaultDate);

    const dynamicOptions: PikadayOptions = {
      ...this.defaultOptions,
      ariaLabel: this.ariaLabel ?? this.defaultOptions.ariaLabel,
      format: this.unicodeTokenFormat ?? this.defaultOptions.format,
      defaultDate: viewDate,
      setDefaultDate: this.setDefaultDate ?? this.defaultOptions.setDefaultDate,
      firstDay: this.firstDay ?? this.defaultOptions.firstDay,
      minDate: this.minDate ?? this.defaultOptions.minDate,
      maxDate: this.maxDate ?? this.defaultOptions.maxDate,
      disableWeekends: this.disableWeekends ?? this.defaultOptions.disableWeekends,
      disableDayFn: this.disableDayFn ?? this.defaultOptions.disableDayFn,
      yearRange: this.yearRange ?? this.defaultOptions.yearRange,
      i18n: this.i18n || this.defaultOptions.i18n,
      yearSuffix: this.yearSuffix ?? this.defaultOptions.yearSuffix,
      showMonthAfterYear: this.showMonthAfterYear ?? this.defaultOptions.showMonthAfterYear,
      showDaysInNextAndPreviousMonths:
        this.showDaysInNextAndPreviousMonths ?? this.defaultOptions.showDaysInNextAndPreviousMonths,
      enableSelectionDaysInNextAndPreviousMonths:
        this.enableSelectionDaysInNextAndPreviousMonths ??
        this.defaultOptions.enableSelectionDaysInNextAndPreviousMonths,
      numberOfMonths: this.numberOfMonths ?? this.defaultOptions.numberOfMonths
    };

    const updatedOptions: PikadayOptions = {
      ...this.staticOptions,
      ...dynamicOptions,
      field: this.inputRef.nativeElement, // must be set to use onFormat/onParse
      bound: false,
      container: this.pickerRef?.nativeElement
    };

    if (!this.picker) {
      this.picker = new Pikaday(updatedOptions);
      return;
    }

    // Pikaday's config() only merges the options into the instance — it neither redraws nor
    // rebuilds the month views. So reset the derived min/max year first (config skips that when the
    // date is cleared, and both setters redraw, which a not-yet-rebuilt calendar cannot survive),
    // then let gotoDate() rebuild and redraw with the merged options.
    this.picker.setMinDate(this.minDate ?? null);
    this.picker.setMaxDate(this.maxDate ?? null);
    this.picker.config(updatedOptions);
    this.picker.gotoDate(this.selectedDate ?? viewDate);
  }

  private updateMask(): void {
    this.ngxMask = formatToDateTokenMask(this.unicodeTokenFormat!, this.maskChar);
  }

  // #endregion

  // #region IFormidablePanelField

  @ViewChild('panelRef') panelRef?: ElementRef<HTMLDivElement>;

  /**
   * Opens and closes the calendar from outside. Nothing opens it on focus, and a plain `ArrowDown` steps the
   * value rather than opening it — `Alt` with an arrow is what opens it from the keyboard.
   */
  @Input()
  get isPanelOpen(): boolean {
    return this._isPanelOpen;
  }
  set isPanelOpen(val: boolean) {
    this.togglePanel(val);
  }

  /** Where the calendar opens. The three anchored positions flip above the field when there is no room below. */
  @Input() panelPosition: FormidablePanelPosition = 'right';

  private _isPanelOpen = false;
  private ignoreNextBlur = false;

  // Mousedown is used to prevent sending focusChanged events.
  protected toggleMouseDown(event: MouseEvent): void {
    event.preventDefault();
    this.inputRef.nativeElement.focus(); // ensure input remains focused, so keyboard events work
    this.togglePanel(!this.isPanelOpen);
  }

  // Workaround: Because the <input> element might have regained focus (for keyboard events), the focus
  // needs to be set to the panel first. Otherwise, clicking the nested <select>, etc. would not work as
  // expected.
  protected panelMouseDown(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    const isFocusable =
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLButtonElement ||
      target.hasAttribute('tabindex');

    if (isFocusable) {
      this.ignoreNextBlur = true;
      this.panelRef?.nativeElement.focus();
    }
  }

  protected togglePanel(isOpen: boolean): void {
    this._isPanelOpen = isOpen;

    // Reads the panel's box, so it has to wait for the open state to render — a microtask would run
    // before change detection.
    setTimeout(() => scrollIntoView(this.dateRef, this.panelRef, isOpen));

    if (isOpen) {
      // Synchronous on purpose: a closed panel is `visibility: hidden`, not `display: none`, so it is
      // already laid out and measurable. Deferring would flip it after paint, which is a visible jump.
      // The panel is not focused here: it is still `visibility: hidden` at this point and so cannot take
      // focus, and deferring the call until it can would pull focus off the input and run its
      // commit-on-blur path. `panelMouseDown` focuses it once it is open and visible.
      updatePanelPosition(this.dateRef, this.panelRef);
    }

    this.cdRef.markForCheck();
  }

  // #endregion

  // #region Pikaday

  /** Uses the selected Date, formats it and writes the resulting string into the field. */
  private onFormat(date: Date | null, unicodeTokenFormat: string): string {
    const formattedDate = date ? format(date, unicodeTokenFormat) : '';

    return formattedDate;
  }

  /** Uses the entered string, parses it and writes/selects the resulting Date into the picker. */
  private onParse(dateString: string, unicodeTokenFormat: string): Date | null {
    return parseUnicodeDateTime(dateString, unicodeTokenFormat);
  }

  // #endregion

  private getDefaultDate(minDate?: Date, maxDate?: Date, initialDate: Date = new Date()): Date {
    const initialDateMs = initialDate.getTime();

    if (minDate && minDate.getTime() > initialDateMs) {
      return minDate;
    } else if (maxDate && maxDate.getTime() < initialDateMs) {
      return maxDate;
    }

    return initialDate;
  }

  private trySetDateFromInput(value: Date | null | string): void {
    if (value === null || value === undefined || value === '') {
      this.setDate(null);
      return;
    }

    if (isValidDateObject(value)) {
      this.setDate(value as Date);
      return;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        this.setDate(null);
        return;
      }

      const parsedDate = this.onParse(trimmed, this.unicodeTokenFormat || this.defaultUnicodeTokenFormat);

      if (parsedDate) {
        this.setDate(parsedDate);
        return;
      }
    }

    this.setDate(null);
  }

  private setDate(date: Date | null): void {
    this.selectDate(date);

    // Waits for the ngxMask directive to initialize on the input, which it does across a full task —
    // a microtask would land before it. `stepSegment` restores the caret from a timer queued behind
    // this one, so this must stay a macrotask.
    setTimeout(() => {
      this.picker?.setDate(date, false); // don't silent update to achieve valueChanged/focusChanged events

      // ngxMask leaves an empty input untouched, so render the empty state ourselves
      if (date == null) {
        this.renderEmpty();
      }
    });
  }

  // #region Pikaday fix

  // Developer Note:
  // Pikaday’s internal <select> elements for month/year do not include `id` or `name` attributes by
  // default. This triggers Chrome’s "A form field element should have an id or name" warning during
  // audits. While it’s not strictly required for functionality, adding these attributes:
  //   - Removes the Chrome warning.
  //   - Improves accessibility (screen readers can target the controls).
  //   - Produces predictable, unique IDs for easier testing/debugging.
  //
  // We hook into Pikaday’s `onDraw` (and run once on init) to set both `id` and `name` based on the field’s
  // `name`/`fieldId`. A MutationObserver is also attached to catch any DOM rebuilds outside of `onDraw`.
  //
  // This is a cosmetic/accessibility fix — it does not affect Pikaday’s behavior.

  private mo?: MutationObserver;

  private decoratePikadayControls(): void {
    const host = this.pickerRef?.nativeElement;
    if (!host) return;

    const monthSelects = Array.from(host.querySelectorAll<HTMLSelectElement>('select.pika-select-month'));
    const yearSelects = Array.from(host.querySelectorAll<HTMLSelectElement>('select.pika-select-year'));

    // Prefix with field info for uniqueness & readability
    const prefix = `${this.name || 'date'}-${this.fieldId}`;

    monthSelects.forEach((el, i) => {
      const id = `${prefix}-month${monthSelects.length > 1 ? `-${i}` : ''}`;
      el.id = id;
      el.name = id; // name is what Chrome’s warning cares about, too
      el.setAttribute('aria-label', this.i18n?.months ? 'Month' : 'Month');
      el.setAttribute('autocomplete', 'off');
    });

    yearSelects.forEach((el, i) => {
      const id = `${prefix}-year${yearSelects.length > 1 ? `-${i}` : ''}`;
      el.id = id;
      el.name = id;
      el.setAttribute('aria-label', 'Year');
      el.setAttribute('autocomplete', 'off');
    });

    // Optional: observe future redraws if UI mutates outside of onDraw
    if (!this.mo) {
      this.mo = new MutationObserver(() => this.decoratePikadayControls());
      this.mo.observe(host, { subtree: true, childList: true });
    }
  }

  override ngOnDestroy(): void {
    this.mo?.disconnect();

    super.ngOnDestroy();
  }

  // #endregion
}
