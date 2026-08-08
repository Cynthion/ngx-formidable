import { Type } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideNgxMask } from 'ngx-mask';
import { FormidableEmptyHint } from '../../models/formidable.model';
import { DateFieldComponent } from './date-field/date-field.component';
import { TimeFieldComponent } from './time-field/time-field.component';

/**
 * Contract of the masked date/time fields: caret, value rendering and calendar options.
 *
 * These fields render their empty state themselves (the `emptyHint`), which historically desynced
 * ngxMask's caret math. The keystrokes below therefore go through the real DOM and must never
 * pre-position the caret — doing so is what hid the "second character lands before the first" bug.
 *
 * Value rendering covers what the input must show for a value it did not receive by typing: a
 * programmatic `writeValue`, and a `unicodeTokenFormat` change after init. Calendar options cover
 * the Pikaday passthrough inputs, which only reach the rendered calendar if the picker is
 * rebuilt — its `config()` merges options without redrawing.
 */

type MaskedField = DateFieldComponent | TimeFieldComponent;

/** Types a single character the way a browser does: keydown, then insert at the *live* caret. */
function press(input: HTMLInputElement, key: string): void {
  input.dispatchEvent(new KeyboardEvent('keydown', { key, code: `Digit${key}`, bubbles: true }));

  // let the browser do the insertion + caret placement where possible
  if (document.execCommand('insertText', false, key)) return;

  const start = input.selectionStart ?? 0;
  const end = input.selectionEnd ?? start;

  input.value = input.value.slice(0, start) + key + input.value.slice(end);
  input.setSelectionRange(start + 1, start + 1);
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: key }));
}

/** Result of one keystroke: what the field shows and where the caret sits. */
function state(input: HTMLInputElement): string {
  return `${input.value}|${input.selectionStart}`;
}

/** An arrow keydown. `bubbles` is mandatory — the base directive listens on the wrapper, not the input. */
function arrow(input: HTMLInputElement, key: 'ArrowUp' | 'ArrowDown', altKey = false): void {
  input.dispatchEvent(new KeyboardEvent('keydown', { key, altKey, bubbles: true }));
}

/** The range a step leaves selected. */
function selection(input: HTMLInputElement): [number | null, number | null] {
  return [input.selectionStart, input.selectionEnd];
}

function setup<T extends MaskedField>(
  component: Type<T>,
  unicodeTokenFormat: string,
  emptyHint: FormidableEmptyHint
): { fixture: ComponentFixture<T>; input: HTMLInputElement } {
  const fixture = TestBed.createComponent(component);

  fixture.componentInstance.unicodeTokenFormat = unicodeTokenFormat;
  fixture.componentInstance.emptyHint = emptyHint;

  fixture.detectChanges(); // ngOnInit + ngAfterViewInit (recomputes the mask)
  fixture.detectChanges(); // propagate the recomputed mask to ngxMask
  fixture.componentInstance.writeValue(null); // what Angular forms does on init
  tick();

  // Angular flags every input of a component's first ngOnChanges as a first change; spend that
  // cycle on an input the fields ignore, so setInput() in a test counts as a runtime change.
  setInput(fixture, 'name', 'field');

  return { fixture, input: fixture.nativeElement.querySelector('input') as HTMLInputElement };
}

/** Changes an input the way a parent binding does — through ngOnChanges. */
function setInput(fixture: ComponentFixture<MaskedField>, name: string, value: unknown): void {
  fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
}

describe('masked date/time field', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DateFieldComponent, TimeFieldComponent],
      providers: [provideNgxMask()]
    });
  });

  describe('date field, emptyHint "format"', () => {
    it('shows the format hint at rest and ngxMask slots while focused', fakeAsync(() => {
      const { input } = setup(DateFieldComponent, 'dd . MM . yyyy', 'format');

      expect(input.value).toBe('dd . MM . yyyy');

      input.focus();

      expect(input.value).toBe('__ . __ . ____');
      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe(0);
    }));

    it('fills left-to-right from a caret at 0 (the "21" bug)', fakeAsync(() => {
      const { input } = setup(DateFieldComponent, 'dd . MM . yyyy', 'format');

      input.focus();
      expect(input.selectionStart).toBe(0); // no pre-positioning

      press(input, '1');
      expect(state(input)).toBe('1_ . __ . ____|1');

      press(input, '2');
      expect(state(input)).toBe('12 . __ . ____|2');
    }));

    it('jumps separators and commits the parsed date on blur', fakeAsync(() => {
      const { fixture, input } = setup(DateFieldComponent, 'dd . MM . yyyy', 'format');
      const emitted: (Date | null)[] = [];
      fixture.componentInstance.valueChanged.subscribe((value) => emitted.push(value));

      input.focus();
      '12052024'.split('').forEach((key) => press(input, key));

      expect(input.value).toBe('12 . 05 . 2024');
      expect(input.selectionStart).toBe(14);

      input.blur();
      tick();

      expect(emitted).toEqual([new Date(2024, 4, 12)]);
      expect(input.value).toBe('12 . 05 . 2024');
    }));

    it('restores the hint on blur when the value is incomplete', fakeAsync(() => {
      const { fixture, input } = setup(DateFieldComponent, 'dd . MM . yyyy', 'format');

      input.focus();
      press(input, '1');
      input.blur();
      tick();

      expect(input.value).toBe('dd . MM . yyyy');
      expect(fixture.componentInstance.value).toBeNull();
    }));

    it('keeps the hint out of a focused input when cleared while focused', fakeAsync(() => {
      const { fixture, input } = setup(DateFieldComponent, 'dd . MM . yyyy', 'format');

      input.focus();
      fixture.componentInstance.writeValue(null);
      tick();

      expect(input.value).toBe('__ . __ . ____');

      press(input, '1');
      press(input, '2');

      expect(state(input)).toBe('12 . __ . ____|2');
    }));

    it('does not move the caret when focus lands on a filled field', fakeAsync(() => {
      const { input } = setup(DateFieldComponent, 'dd . MM . yyyy', 'format');

      input.focus();
      '12052024'.split('').forEach((key) => press(input, key));
      input.blur();
      tick();

      input.focus();

      // focusing a filled field must not rewrite it, nor reset the caret
      expect(input.value).toBe('12 . 05 . 2024');

      // a click-drag selects the second month digit; typing replaces just that digit
      input.setSelectionRange(6, 7);
      press(input, '9');

      expect(input.value).toBe('12 . 09 . 2024');
    }));
  });

  describe('date field, emptyHint "underscores"', () => {
    it('shows ngxMask slots at rest and types identically', fakeAsync(() => {
      const { input } = setup(DateFieldComponent, 'dd . MM . yyyy', 'underscores');

      expect(input.value).toBe('__ . __ . ____');

      input.focus();

      expect(input.value).toBe('__ . __ . ____');
      expect(input.selectionStart).toBe(0);

      press(input, '1');
      expect(state(input)).toBe('1_ . __ . ____|1');

      press(input, '2');
      expect(state(input)).toBe('12 . __ . ____|2');
    }));
  });

  describe('time field', () => {
    it('fills left-to-right from a caret at 0 with the format hint', fakeAsync(() => {
      const { input } = setup(TimeFieldComponent, 'HH : mm', 'format');

      expect(input.value).toBe('HH : mm');

      input.focus();

      expect(input.value).toBe('__ : __');
      expect(input.selectionStart).toBe(0);

      press(input, '1');
      expect(state(input)).toBe('1_ : __|1');

      press(input, '4');
      expect(state(input)).toBe('14 : __|2');
    }));

    it('commits the parsed time on blur and restores the hint when incomplete', fakeAsync(() => {
      const { fixture, input } = setup(TimeFieldComponent, 'HH : mm', 'underscores');
      const emitted: (Date | null)[] = [];
      fixture.componentInstance.valueChanged.subscribe((value) => emitted.push(value));

      input.focus();
      '1430'.split('').forEach((key) => press(input, key));

      expect(input.value).toBe('14 : 30');

      input.blur();
      tick();

      expect(emitted.length).toBe(1);
      expect(emitted[0]?.getHours()).toBe(14);
      expect(emitted[0]?.getMinutes()).toBe(30);

      input.focus();
      input.setSelectionRange(0, input.value.length);
      press(input, '9');
      input.blur();
      tick();

      expect(input.value).toBe('__ : __');
      expect(fixture.componentInstance.value).toBeNull();
    }));
  });

  describe('value rendering', () => {
    it('shows a time written programmatically', fakeAsync(() => {
      const { fixture, input } = setup(TimeFieldComponent, 'HH : mm', 'underscores');

      fixture.componentInstance.writeValue(new Date(2024, 0, 1, 9, 5));
      tick();

      expect(input.value).toBe('09 : 05');
    }));

    it('re-renders the time in the new format when it changes after init', fakeAsync(() => {
      const { fixture, input } = setup(TimeFieldComponent, 'HH : mm', 'underscores');

      fixture.componentInstance.writeValue(new Date(2024, 0, 1, 9, 5));
      tick();

      setInput(fixture, 'unicodeTokenFormat', 'HH.mm');
      tick();

      expect(input.value).toBe('09.05');
    }));

    it('re-renders the date in the new format when it changes after init', fakeAsync(() => {
      const { fixture, input } = setup(DateFieldComponent, 'dd . MM . yyyy', 'format');

      fixture.componentInstance.writeValue(new Date(2024, 4, 12));
      tick();

      expect(input.value).toBe('12 . 05 . 2024');

      setInput(fixture, 'unicodeTokenFormat', 'yyyy-MM-dd');
      tick();

      expect(input.value).toBe('2024-05-12');
    }));

    it('blur-commits again after a panel interaction skipped one', fakeAsync(() => {
      const { fixture, input } = setup(DateFieldComponent, 'dd . MM . yyyy', 'format');
      const panel = fixture.nativeElement.querySelector('.panel') as HTMLElement;

      input.focus();

      // handing focus to the panel (a nested select, say) must skip exactly one blur-commit
      panel.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      input.blur();
      tick();

      // an incomplete value is only cleared by the blur-commit — Pikaday's own change
      // listener ignores unparseable text — so the hint proves the commit ran
      input.focus();
      press(input, '1');
      input.blur();
      tick();

      expect(input.value).toBe('dd . MM . yyyy');
      expect(fixture.componentInstance.value).toBeNull();
    }));
  });

  describe('arrow keys', () => {
    /** May 2024, focused, with the caret parked where the test wants it. */
    function focusedAt(caret: number): { fixture: ComponentFixture<DateFieldComponent>; input: HTMLInputElement } {
      const { fixture, input } = setup(DateFieldComponent, 'dd . MM . yyyy', 'format');

      fixture.componentInstance.writeValue(new Date(2024, 4, 12));
      tick();

      input.focus();
      input.setSelectionRange(caret, caret);

      return { fixture, input };
    }

    it('steps the segment under the caret and leaves it selected', fakeAsync(() => {
      const { input } = focusedAt(10); // year

      arrow(input, 'ArrowUp');
      tick();

      expect(input.value).toBe('12 . 05 . 2025');
      expect(selection(input)).toEqual([10, 14]);

      // the selection keeps the caret in the year, so repeated arrows stay there
      arrow(input, 'ArrowDown');
      tick();
      arrow(input, 'ArrowDown');
      tick();

      expect(input.value).toBe('12 . 05 . 2023');
    }));

    it('steps only the unit under the caret', fakeAsync(() => {
      const { input } = focusedAt(0); // day

      arrow(input, 'ArrowUp');
      tick();
      expect(input.value).toBe('13 . 05 . 2024');

      input.setSelectionRange(5, 5); // month
      arrow(input, 'ArrowUp');
      tick();
      expect(input.value).toBe('13 . 06 . 2024');
      expect(selection(input)).toEqual([5, 7]);
    }));

    it('does not open the panel on a plain ArrowDown', fakeAsync(() => {
      const { fixture, input } = focusedAt(0);

      arrow(input, 'ArrowDown');
      tick();

      expect(fixture.componentInstance.isPanelOpen).toBe(false);
      expect(input.value).toBe('11 . 05 . 2024');
    }));

    it('opens and closes the panel on Alt+Arrow', fakeAsync(() => {
      const { fixture, input } = focusedAt(0);

      arrow(input, 'ArrowDown', true);
      tick();
      expect(fixture.componentInstance.isPanelOpen).toBe(true);
      expect(input.value).toBe('12 . 05 . 2024'); // an Alt+Arrow never touches the value

      arrow(input, 'ArrowUp', true);
      tick();
      expect(fixture.componentInstance.isPanelOpen).toBe(false);
    }));

    it('still moves the calendar by a week while the panel is open, committing only on Enter', fakeAsync(() => {
      const { fixture, input } = focusedAt(0);

      arrow(input, 'ArrowDown', true);
      tick();

      arrow(input, 'ArrowDown');
      tick();

      expect(input.value).toBe('19 . 05 . 2024');
      expect(fixture.componentInstance.value).toEqual(new Date(2024, 4, 12)); // navigation is not a commit

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      tick();

      expect(fixture.componentInstance.value).toEqual(new Date(2024, 4, 19));
      expect(fixture.componentInstance.isPanelOpen).toBe(false);
    }));

    it('seeds an empty date field before stepping it', fakeAsync(() => {
      const { fixture, input } = setup(DateFieldComponent, 'dd . MM . yyyy', 'format');

      input.focus();
      input.setSelectionRange(10, 10); // year
      arrow(input, 'ArrowUp');
      tick();

      expect(fixture.componentInstance.value?.getFullYear()).toBe(new Date().getFullYear() + 1);
    }));

    it('refuses a step that would leave minDate/maxDate', fakeAsync(() => {
      const { fixture, input } = focusedAt(0); // day

      setInput(fixture, 'maxDate', new Date(2024, 4, 13));

      arrow(input, 'ArrowUp');
      tick();
      expect(input.value).toBe('13 . 05 . 2024'); // on the boundary, still allowed

      arrow(input, 'ArrowUp');
      tick();
      expect(input.value).toBe('13 . 05 . 2024'); // past it, refused
    }));

    it('steps the hour and the minute of a time field', fakeAsync(() => {
      const { fixture, input } = setup(TimeFieldComponent, 'HH : mm', 'underscores');

      fixture.componentInstance.writeValue(new Date(2024, 0, 1, 14, 30));
      tick();

      input.focus();
      input.setSelectionRange(0, 0); // hour
      arrow(input, 'ArrowUp');
      tick();

      expect(input.value).toBe('15 : 30');
      expect(selection(input)).toEqual([0, 2]);

      input.setSelectionRange(5, 5); // minute
      arrow(input, 'ArrowDown');
      tick();

      expect(input.value).toBe('15 : 29');
      expect(selection(input)).toEqual([5, 7]);
    }));

    it('carries a minute step over midnight', fakeAsync(() => {
      const { fixture, input } = setup(TimeFieldComponent, 'HH : mm', 'underscores');

      fixture.componentInstance.writeValue(new Date(2024, 0, 1, 23, 59));
      tick();

      input.focus();
      input.setSelectionRange(5, 5);
      arrow(input, 'ArrowUp');
      tick();

      expect(input.value).toBe('00 : 00');
    }));

    it('seeds an empty time field with midnight before stepping it', fakeAsync(() => {
      const { input } = setup(TimeFieldComponent, 'HH : mm', 'underscores');

      input.focus();
      arrow(input, 'ArrowUp'); // caret sits at 0, the hour
      tick();

      expect(input.value).toBe('01 : 00');
    }));
  });

  describe('calendar options', () => {
    /** May 2024 on screen, so the assertions below have a known month to look at. */
    function setupCalendar(): { fixture: ComponentFixture<DateFieldComponent>; picker: HTMLElement } {
      const { fixture } = setup(DateFieldComponent, 'dd . MM . yyyy', 'format');

      fixture.componentInstance.writeValue(new Date(2024, 4, 12));
      tick();

      return { fixture, picker: fixture.nativeElement.querySelector('.picker-wrapper') as HTMLElement };
    }

    it('re-renders a plain option change', fakeAsync(() => {
      const { fixture, picker } = setupCalendar();

      setInput(fixture, 'yearSuffix', ' n. Chr.');

      expect(picker.querySelector('.pika-title')?.textContent).toContain('2024 n. Chr.');
    }));

    it('rebuilds the month views when numberOfMonths changes', fakeAsync(() => {
      const { fixture, picker } = setupCalendar();

      expect(picker.querySelectorAll('.pika-lendar').length).toBe(1);

      setInput(fixture, 'numberOfMonths', 2);

      expect(picker.querySelectorAll('.pika-lendar').length).toBe(2);
    }));

    it('applies and clears a minDate, days and year dropdown alike', fakeAsync(() => {
      const { fixture, picker } = setupCalendar();

      // the default yearRange of 2 around the shown year, 2024
      const years = () => picker.querySelectorAll('select.pika-select-year option').length;

      expect(picker.querySelectorAll('td.is-disabled').length).toBe(0);
      expect(years()).toBe(5);

      setInput(fixture, 'minDate', new Date(2024, 4, 20));

      expect(picker.querySelectorAll('td.is-disabled').length).toBeGreaterThan(0);
      expect(years()).toBe(3); // 2024 is now the earliest selectable year

      setInput(fixture, 'minDate', undefined);

      expect(picker.querySelectorAll('td.is-disabled').length).toBe(0);
      expect(years()).toBe(5);
    }));
  });
});
