import {
  afterRenderEffect,
  AfterViewInit,
  Component,
  computed,
  contentChild,
  ElementRef,
  inject,
  input,
  OnDestroy,
  signal,
  untracked,
  viewChild
} from '@angular/core';
import { addDays, format } from 'date-fns';
import { NgxMaskDirective } from 'ngx-mask';
import Pikaday, { PikadayI18nConfig, PikadayOptions } from 'pikaday';
import { filter, fromEvent, merge, takeUntil } from 'rxjs';
import { FieldToggleIcon } from '../../../directives/field-toggle-icon';
import { normalizeTimePart, UNICODE_DATE_TOKENS } from '../../../helpers/format.helpers';
import { onSignalChange } from '../../../helpers/utility.helpers';
import {
  FORMIDABLE_DEFAULTS,
  FORMIDABLE_FIELD,
  FormidablePanelField,
  FormidablePanelPosition
} from '../../../models/formidable.model';
import { BaseDateTimeField } from '../base-date-time-field';

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
  templateUrl: './date-field.html',
  styleUrls: ['./date-field.scss'],
  imports: [NgxMaskDirective],
  providers: [
    // required to provide this component as FormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: DateField
    }
  ]
})
export class DateField extends BaseDateTimeField implements AfterViewInit, OnDestroy {
  readonly dateRef = viewChild.required<ElementRef<HTMLDivElement>>('dateRef');
  readonly pickerRef = viewChild<ElementRef<HTMLDivElement>>('pickerRef');

  private readonly projectedToggleIcon = contentChild(FieldToggleIcon);

  // False while no `[formidableFieldToggleIcon]` is projected, which is when the default CSS arrow is drawn.
  protected readonly hasToggleIcon = computed(() => !!this.projectedToggleIcon());

  protected keyboardCallback = (event: KeyboardEvent) => this.handleKeydown(event);
  protected registeredKeys = ['Escape', 'Tab', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Enter'];

  protected readonly defaultUnicodeTokenFormat = 'yyyy-MM-dd';
  protected readonly unicodeTokens = UNICODE_DATE_TOKENS;

  private readonly staticOptions: PikadayOptions = {
    field: undefined, // not supported: the field parses and formats its own text
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
    onSelect: (date: Date) => this.commit(date),
    onDraw: () => this.decoratePikadayControls()
  };

  private readonly defaultOptions: PikadayOptions = {
    ariaLabel: undefined,
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

  private picker?: Pikaday;

  constructor() {
    super();

    // Every Pikaday passthrough input, which is exactly what `updateOptions()` reads. It is guarded on the
    // picker rather than skipping the first run: the instance is built in `ngAfterViewInit`, because it
    // needs `pickerRef` to live in, and there is nothing to reconfigure before that.
    onSignalChange(
      () => this.pikadayOptionInputs(),
      () => {
        if (this.picker) this.updateOptions();
      }
    );

    // The calendar shows the model's date.
    afterRenderEffect(() => {
      const date = this.value();

      untracked(() => this.picker?.setDate(date, true)); // silent: the model already holds it
    });
  }

  // Read as one list so the effect above depends on all of them.
  private pikadayOptionInputs(): unknown[] {
    return [
      this.ariaLabel(),
      this.defaultDate(),
      this.setDefaultDate(),
      this.firstDay(),
      this.minDate(),
      this.maxDate(),
      this.disableWeekends(),
      this.disableDayFn(),
      this.yearRange(),
      this.i18n(),
      this.yearSuffix(),
      this.showMonthAfterYear(),
      this.showDaysInNextAndPreviousMonths(),
      this.enableSelectionDaysInNextAndPreviousMonths(),
      this.numberOfMonths()
    ];
  }

  override ngAfterViewInit(): void {
    super.ngAfterViewInit();

    this.updateOptions();

    // Pikaday redraws its whole calendar on a pick, a step or a change of month, and a focused element taken
    // out of the page blurs. So focus on one of its selects goes back to the input first, captured ahead of
    // Pikaday's own listeners — except on a press on a select, which opens only while it keeps focus.
    const picker = this.pickerRef()!.nativeElement;

    merge(
      fromEvent(picker, 'mousedown', { capture: true }),
      fromEvent(picker, 'keydown', { capture: true }),
      fromEvent(picker, 'change', { capture: true })
    )
      .pipe(
        filter((event) => !(event.type === 'mousedown' && event.target instanceof HTMLSelectElement)),
        filter(() => picker.contains(document.activeElement)),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.focus());
  }

  override ngOnDestroy(): void {
    this.picker?.destroy();

    super.ngOnDestroy();
  }

  private handleKeydown(event: KeyboardEvent): boolean {
    const isOpen = this.isPanelOpen();

    switch (event.key) {
      case 'Escape':
      case 'Tab':
      case 'Enter':
        if (this.isPanelOpen()) this.togglePanel(false);
        // Commit what's in the input — it reflects both typing and calendar arrow-navigation — never the
        // picker's default cursor (which is "today").
        this.commitText();
        // `Tab` still moves on, and an `Escape` with no panel to close belongs to whatever holds the field.
        return event.key === 'Enter' || (event.key === 'Escape' && isOpen);
      case 'ArrowDown':
        // Alt+Arrow works the panel, the way a native <select> and the ARIA combobox pattern do.
        // Plain arrows never open it — they belong to the value.
        if (event.altKey) {
          this.togglePanel(true);
        } else if (!this.isPanelOpen()) {
          this.stepSegment(-1);
        } else {
          this.moveCalendar(7);
        }
        return true;
      case 'ArrowUp':
        if (event.altKey) {
          this.togglePanel(false);
        } else if (!this.isPanelOpen()) {
          this.stepSegment(1);
        } else {
          this.moveCalendar(-7);
        }
        return true;
      case 'ArrowLeft':
        // While the calendar is open, the horizontal arrows move it instead of the caret.
        if (isOpen) this.moveCalendar(-1);
        return isOpen;
      case 'ArrowRight':
        if (isOpen) this.moveCalendar(1);
        return isOpen;
      default:
        return false;
    }
  }

  // Moves the calendar's cursor without committing, and shows the date it lands on in the input, which is
  // what `Enter` commits.
  private moveCalendar(days: number): void {
    const date = this.picker?.getDate();
    if (!this.picker || !date) return;

    this.picker.setDate(addDays(date, days), true); // silent: moving is not a pick
    this.inputRef().nativeElement.value = format(this.picker.getDate()!, this.tokenFormat());
  }

  protected normalize(value: Date): Date {
    return normalizeTimePart(value);
  }

  protected stepSeed(): Date {
    return this.getDefaultDate(this.minDate(), this.maxDate(), this.defaultDate());
  }

  protected select(value: Date | null): void {
    this.selectDate(value);
  }

  // A step is refused rather than clamped, so arrows can never reach a date the calendar forbids.
  protected override isOutOfRange(date: Date): boolean {
    const minDate = this.minDate();
    const maxDate = this.maxDate();

    if (minDate && date < normalizeTimePart(minDate)) return true;
    if (maxDate && date > normalizeTimePart(maxDate)) return true;

    return false;
  }

  // #region FormidableField

  get fieldRef(): ElementRef<HTMLElement> {
    return this.dateRef() as ElementRef<HTMLElement>;
  }

  // Mirrors the template: there is nothing to open once the field is readonly or disabled.
  readonly hasInFieldToggle = computed(() => !this.readonly() && !this.disabled());

  // #endregion

  // #region Date

  /**
   * A Unicode date format (`y`, `M`, `d` tokens). Decides the mask, the display, and which segment the arrow
   * keys step. An unrecognized format warns and falls back to the default.
   */
  public readonly unicodeTokenFormat = input(this.defaultUnicodeTokenFormat);

  /** Commits a date as the user's pick, as the calendar and the arrow keys do. The same day is no change. */
  public selectDate(date: Date | null): void {
    // the panel can close without a change of date
    if (this.isSameValue(this.value(), date)) return;

    this.setValue(date ? this.normalize(date) : null);
    this.togglePanel(false);
  }

  // #endregion

  // #region Pikaday Options

  /** Accessible name for the calendar itself, which is a `dialog` and so needs one of its own. */
  public readonly ariaLabel = input<string | undefined>(undefined);

  /** Where the calendar opens, and what an arrow key steps from, when the field is empty. */
  public readonly defaultDate = input<Date | undefined>(undefined);

  /** Whether `defaultDate` is also selected on open, rather than only shown. */
  public readonly setDefaultDate = input<boolean | undefined>(undefined);

  /** First day of the week, `0` for Sunday. */
  public readonly firstDay = input<number | undefined>(undefined);

  /** Earliest selectable date. Also refuses an arrow step past it, rather than clamping to it. */
  public readonly minDate = input<Date | undefined>(undefined);

  /** Latest selectable date. Also refuses an arrow step past it, rather than clamping to it. */
  public readonly maxDate = input<Date | undefined>(undefined);

  /** Makes Saturdays and Sundays unselectable, without needing a `disableDayFn` for it. */
  public readonly disableWeekends = input<boolean | undefined>(undefined);

  /** Returns `true` for a date that cannot be selected — holidays, blackout dates. */
  public readonly disableDayFn = input<((date: Date) => boolean) | undefined>(undefined);

  /** A number of years either side of the current one, or an explicit `[from, to]` pair. */
  public readonly yearRange = input<number | number[] | undefined>(undefined);

  /** Month and weekday names, and the navigation labels. Replace it whole; there is no per-key merge. */
  public readonly i18n = input<PikadayI18nConfig | undefined>(undefined);

  /** Appended to the year in the calendar's header — a era marker, or a localized "year" word. */
  public readonly yearSuffix = input<string | undefined>(undefined);

  /** Puts the year before the month in the header, for locales that read it that way. */
  public readonly showMonthAfterYear = input<boolean | undefined>(undefined);

  /** Fills the leading and trailing cells of the grid with the neighbouring months' days. */
  public readonly showDaysInNextAndPreviousMonths = input<boolean | undefined>(undefined);

  /** Makes those neighbouring-month days selectable rather than only visible. */
  public readonly enableSelectionDaysInNextAndPreviousMonths = input<boolean | undefined>(undefined);

  /** How many months the calendar shows side by side. */
  public readonly numberOfMonths = input<number | undefined>(undefined);

  private updateOptions(): void {
    const viewDate = this.getDefaultDate(this.minDate(), this.maxDate(), this.defaultDate());

    const dynamicOptions: PikadayOptions = {
      ...this.defaultOptions,
      ariaLabel: this.ariaLabel() ?? this.defaultOptions.ariaLabel,
      defaultDate: viewDate,
      setDefaultDate: this.setDefaultDate() ?? this.defaultOptions.setDefaultDate,
      firstDay: this.firstDay() ?? this.defaultOptions.firstDay,
      minDate: this.minDate() ?? this.defaultOptions.minDate,
      maxDate: this.maxDate() ?? this.defaultOptions.maxDate,
      disableWeekends: this.disableWeekends() ?? this.defaultOptions.disableWeekends,
      disableDayFn: this.disableDayFn() ?? this.defaultOptions.disableDayFn,
      yearRange: this.yearRange() ?? this.defaultOptions.yearRange,
      i18n: this.i18n() || this.defaultOptions.i18n,
      yearSuffix: this.yearSuffix() ?? this.defaultOptions.yearSuffix,
      showMonthAfterYear: this.showMonthAfterYear() ?? this.defaultOptions.showMonthAfterYear,
      showDaysInNextAndPreviousMonths:
        this.showDaysInNextAndPreviousMonths() ?? this.defaultOptions.showDaysInNextAndPreviousMonths,
      enableSelectionDaysInNextAndPreviousMonths:
        this.enableSelectionDaysInNextAndPreviousMonths() ??
        this.defaultOptions.enableSelectionDaysInNextAndPreviousMonths,
      numberOfMonths: this.numberOfMonths() ?? this.defaultOptions.numberOfMonths
    };

    const updatedOptions: PikadayOptions = { ...this.staticOptions, ...dynamicOptions };

    if (!this.picker) {
      this.picker = new Pikaday(updatedOptions);

      // Pikaday places its calendar only beside a `field`. The draw it ran while being built was of a
      // calendar nothing held yet, so its selects are named once it is placed.
      this.pickerRef()!.nativeElement.appendChild(this.picker.el);
      this.decoratePikadayControls();
      return;
    }

    // Pikaday's config() only merges the options into the instance — it neither redraws nor
    // rebuilds the month views. So reset the derived min/max year first (config skips that when the
    // date is cleared, and both setters redraw, which a not-yet-rebuilt calendar cannot survive),
    // then let gotoDate() rebuild and redraw with the merged options.
    this.picker.setMinDate(this.minDate() ?? null);
    this.picker.setMaxDate(this.maxDate() ?? null);
    this.picker.config(updatedOptions);
    this.picker.gotoDate(this.value() ?? viewDate);
  }

  // #endregion

  // #region FormidablePanelField

  readonly panelRef = viewChild<ElementRef<HTMLDivElement>>('panelRef');

  /** Whether the calendar is currently open. Call `togglePanel` to open or close it from outside. */
  public readonly isPanelOpen = signal(false);

  private readonly defaultPanelPosition = inject(FORMIDABLE_DEFAULTS).panelPosition ?? 'right';

  /**
   * Where the calendar opens. The three anchored positions flip above the field when there is no room below.
   * Unset or `undefined`, the app default applies.
   */
  public readonly panelPosition = input(this.defaultPanelPosition, {
    transform: (position: FormidablePanelPosition | undefined) => position ?? this.defaultPanelPosition
  });

  protected override get panel(): FormidablePanelField {
    return this;
  }

  /** Opens or closes the calendar. */
  public togglePanel(isOpen: boolean): void {
    this.isPanelOpen.set(isOpen);
    this.onPanelToggle(isOpen);
  }

  // #endregion

  // #region Pikaday

  private getDefaultDate(minDate?: Date, maxDate?: Date, initialDate: Date = new Date()): Date {
    const initialDateMs = initialDate.getTime();

    if (minDate && minDate.getTime() > initialDateMs) {
      return minDate;
    } else if (maxDate && maxDate.getTime() < initialDateMs) {
      return maxDate;
    }

    return initialDate;
  }

  // Developer Note:
  // Pikaday’s internal <select> elements for month/year do not include `id` or `name` attributes by
  // default. This triggers Chrome’s "A form field element should have an id or name" warning during
  // audits. While it’s not strictly required for functionality, adding these attributes:
  //   - Removes the Chrome warning.
  //   - Improves accessibility (screen readers can target the controls).
  //   - Produces predictable, unique IDs for easier testing/debugging.
  //
  // Pikaday rebuilds its whole calendar on every draw and calls `onDraw` after each one, so that hook sets
  // both `id` and `name` from the field's `name`/`fieldId`.
  //
  // This is a cosmetic/accessibility fix — it does not affect Pikaday’s behavior.
  private decoratePikadayControls(): void {
    const host = this.pickerRef()?.nativeElement;
    if (!host) return;

    const monthSelects = Array.from(host.querySelectorAll<HTMLSelectElement>('select.pika-select-month'));
    const yearSelects = Array.from(host.querySelectorAll<HTMLSelectElement>('select.pika-select-year'));

    // Prefix with field info for uniqueness & readability
    const prefix = `${this.name() || 'date'}-${this.fieldId}`;

    monthSelects.forEach((el, i) => {
      const id = `${prefix}-month${monthSelects.length > 1 ? `-${i}` : ''}`;
      el.id = id;
      el.name = id; // name is what Chrome’s warning cares about, too
      el.setAttribute('aria-label', 'Month');
      el.setAttribute('autocomplete', 'off');
    });

    yearSelects.forEach((el, i) => {
      const id = `${prefix}-year${yearSelects.length > 1 ? `-${i}` : ''}`;
      el.id = id;
      el.name = id;
      el.setAttribute('aria-label', 'Year');
      el.setAttribute('autocomplete', 'off');
    });
  }

  // #endregion
}
