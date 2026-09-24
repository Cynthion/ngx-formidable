import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, discardPeriodicTasks, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideNgxMask } from 'ngx-mask';
import { AutocompleteFieldComponent } from './autocomplete-field/autocomplete-field.component';
import { DateFieldComponent } from './date-field/date-field.component';
import { InputFieldComponent } from './input-field/input-field.component';
import { TextareaFieldComponent } from './textarea-field/textarea-field.component';
import { TimeFieldComponent } from './time-field/time-field.component';

/**
 * What a field does with the caret on the way in, per `user/fields.md`. The browser owns most of it — it
 * selects an input's content on keyboard focus and places the caret from a click — so the library only
 * has two jobs, both of them on a mask: keep a select-all off the empty slots, and keep a click from
 * landing behind the value, which ngx-mask would otherwise decide for itself.
 *
 * The browser's half is made explicitly here, because Karma cannot dispatch a trusted `Tab` or place a
 * caret from a synthetic `MouseEvent`; that half is measured against real Chrome, Firefox and Safari
 * instead (`tech/caret.md`). What these specs pin is what the field does with what it is handed.
 */

@Component({
  imports: [
    FormsModule,
    InputFieldComponent,
    TextareaFieldComponent,
    AutocompleteFieldComponent,
    DateFieldComponent,
    TimeFieldComponent
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <form>
      <formidable-input-field
        name="text"
        [ngModel]="text" />
      <formidable-input-field
        name="masked"
        mask="000 000 00 00"
        [ngModel]="masked" />
      <formidable-input-field
        name="slots"
        mask="000 000 00 00"
        [maskConfig]="{ showMaskTyped: true }"
        [ngModel]="masked" />
      <formidable-textarea-field
        name="notes"
        [ngModel]="text" />
      <formidable-textarea-field
        name="maskedNotes"
        mask="000 000 00 00"
        [maskConfig]="{ showMaskTyped: true }"
        [ngModel]="masked" />
      <formidable-autocomplete-field
        name="auto"
        [options]="options"
        [ngModel]="auto" />
      <formidable-date-field
        name="date"
        unicodeTokenFormat="dd/MM/yyyy"
        [ngModel]="date" />
      <formidable-time-field
        name="time"
        unicodeTokenFormat="HH.mm"
        [ngModel]="time" />
    </form>
  `
})
class CaretHostComponent {
  readonly options = [
    { value: 'ch', label: 'Switzerland' },
    { value: 'de', label: 'Germany' }
  ];

  text: string | null = null;
  masked: string | null = null;
  auto: string | null = null;
  date: Date | null = null;
  time: Date | null = null;
}

const EDITORS = {
  text: 'formidable-input-field[name="text"] input',
  masked: 'formidable-input-field[name="masked"] input',
  slots: 'formidable-input-field[name="slots"] input',
  notes: 'formidable-textarea-field[name="notes"] textarea',
  maskedNotes: 'formidable-textarea-field[name="maskedNotes"] textarea',
  auto: 'formidable-autocomplete-field input',
  date: 'formidable-date-field input',
  time: 'formidable-time-field input'
} as const;

type EditorName = keyof typeof EDITORS;
type Editor = HTMLInputElement | HTMLTextAreaElement;

const PARTIAL = { masked: '079123' };
const FULL = { masked: '0791234567' };
const DATED = { date: new Date(2024, 0, 15) };
const TIMED = { time: new Date(2024, 0, 15, 7, 45) };

describe('caret on focus entry', () => {
  let fixture: ComponentFixture<CaretHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CaretHostComponent],
      providers: [provideNgxMask()]
    }).compileComponents();

    (document.activeElement as HTMLElement | null)?.blur();
  });

  afterEach(() => fixture?.destroy());

  function build(model: Partial<CaretHostComponent> = {}): void {
    fixture = TestBed.createComponent(CaretHostComponent);
    Object.assign(fixture.componentInstance, model);

    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    tick();
  }

  function editorOf(name: EditorName): Editor {
    return fixture.nativeElement.querySelector(EDITORS[name]) as Editor;
  }

  /**
   * Focus the way the keyboard does: no pointer press comes first, which is all the field keys on. Karma
   * cannot dispatch a trusted `Tab`, and `Shift+Tab` reaches the field the same way.
   */
  function tabTo(element: Editor): void {
    element.focus();
  }

  /**
   * Click at a position. A dispatched `MouseEvent` runs no default action, so the two things the browser
   * would do — focus the editor, and place the caret where the press landed — are made here.
   */
  function clickAt(element: Editor, caret: number): void {
    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    element.focus();
    element.setSelectionRange(caret, caret);
    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }

  function selectionOf(element: Editor): [number | null, number | null] {
    return [element.selectionStart, element.selectionEnd];
  }

  function scenario(body: () => void): jasmine.ImplementationCallback {
    return fakeAsync(() => {
      body();
      flush();
      discardPeriodicTasks();
    });
  }

  describe('the editors render the states these specs assume', () => {
    const renders: Array<[EditorName, Partial<CaretHostComponent>, string]> = [
      ['text', { text: 'ABCDEFGH' }, 'ABCDEFGH'],
      ['masked', PARTIAL, '079 123'],
      ['masked', FULL, '079 123 45 67'],
      ['slots', {}, '___ ___ __ __'],
      ['slots', PARTIAL, '079 123 __ __'],
      ['slots', FULL, '079 123 45 67'],
      ['maskedNotes', PARTIAL, '079 123 __ __'],
      ['auto', { auto: 'ch' }, 'Switzerland'],
      ['date', {}, '__/__/____'],
      ['date', DATED, '15/01/2024'],
      ['time', {}, '__.__'],
      ['time', TIMED, '07.45']
    ];

    for (const [editor, model, text] of renders) {
      it(
        `${editor} renders "${text}"`,
        scenario(() => {
          build(model);

          expect(editorOf(editor).value).toBe(text);
        })
      );
    }
  });

  describe('keyboard focus selects the value', () => {
    // Each row: the editor, what it holds, and where the selection has to stop.
    const rows: Array<[EditorName, Partial<CaretHostComponent>, number, string]> = [
      ['slots', PARTIAL, 7, 'stops at the last filled slot, not at the end of the empty ones'],
      ['slots', FULL, 13, 'covers a full mask whole, trailing literals and all'],
      ['slots', {}, 0, 'collapses at the front when the mask holds nothing'],
      ['masked', PARTIAL, 7, 'covers a mask that renders no slots'],
      ['date', DATED, 10, 'covers a filled date'],
      ['date', {}, 0, 'and collapses at the front of an empty one'],
      ['time', TIMED, 5, 'covers a filled time'],
      ['time', {}, 0, 'and collapses at the front of an empty one']
    ];

    for (const [editor, model, end, why] of rows) {
      it(
        `${editor}: ${why}`,
        scenario(() => {
          build(model);
          const element = editorOf(editor);
          const before = element.value;

          tabTo(element);
          tick();

          expect(element.value).toBe(before);
          expect(selectionOf(element)).toEqual([0, end]);
        })
      );
    }

    // Filling the mask one position at a time moves the boundary every time.
    for (const [model, text, end] of [
      ['0', '0__ ___ __ __', 1],
      ['079', '079 ___ __ __', 3],
      ['0791', '079 1__ __ __', 5],
      ['079123', '079 123 __ __', 7],
      ['07912345', '079 123 45 __', 10]
    ] as const) {
      it(
        `stops at ${end} of "${text}"`,
        scenario(() => {
          build({ masked: model });
          const element = editorOf('slots');
          expect(element.value).toBe(text);

          tabTo(element);
          tick();

          expect(selectionOf(element)).toEqual([0, end]);
          expect(element.value.slice(end)).toMatch(/^[^a-z0-9]*$/i);
        })
      );
    }
  });

  describe('keyboard focus selects an unmasked editor whole', () => {
    for (const [editor, model] of [
      ['text', { text: 'ABCDEFGH' }],
      ['auto', { auto: 'ch' }]
    ] as const) {
      it(
        `${editor} selects its content`,
        scenario(() => {
          build(model);
          const element = editorOf(editor);

          tabTo(element);
          tick();

          expect(selectionOf(element)).toEqual([0, element.value.length]);
        })
      );

      it(
        `${editor} collapses at the front when it holds nothing`,
        scenario(() => {
          build();
          const element = editorOf(editor);

          tabTo(element);
          tick();

          expect(selectionOf(element)).toEqual([0, 0]);
        })
      );
    }

    /**
     * A textarea is the exception, and deliberately so: no browser select-alls one on `Tab`, and putting
     * a paragraph one keystroke from being wiped is not worth the consistency.
     */
    for (const [editor, model] of [
      ['notes', { text: 'ABCDEFGH' }],
      ['maskedNotes', PARTIAL]
    ] as const) {
      it(
        `${editor} takes a caret and no selection`,
        scenario(() => {
          build(model);
          const element = editorOf(editor);

          element.setSelectionRange(3, 3);
          tabTo(element);
          tick();

          expect(selectionOf(element)).toEqual([3, 3]);
        })
      );
    }
  });

  describe('a click lands where it aimed, and never behind the value', () => {
    // Each row: the editor, what it holds, `E`, and where three clicks have to end up.
    const rows: Array<[EditorName, Partial<CaretHostComponent>, number, number[]]> = [
      ['slots', PARTIAL, 7, [0, 4, 7, 9, 13]],
      ['slots', FULL, 13, [0, 4, 7, 9, 13]],
      ['slots', {}, 0, [0, 4, 7, 9, 13]],
      ['masked', PARTIAL, 7, [0, 3, 7]],
      ['maskedNotes', PARTIAL, 7, [0, 4, 13]],
      ['date', DATED, 10, [0, 5, 10]],
      ['date', {}, 0, [0, 5, 10]],
      ['time', TIMED, 5, [0, 3, 5]],
      ['time', {}, 0, [0, 3, 5]]
    ];

    for (const [editor, model, end, clicks] of rows) {
      for (const caret of clicks) {
        it(
          `${editor} click at ${caret} lands at ${Math.min(caret, end)}`,
          scenario(() => {
            build(model);
            const element = editorOf(editor);
            const before = element.value;

            clickAt(element, caret);
            tick();

            expect(element.value).toBe(before);
            expect(selectionOf(element)).toEqual([Math.min(caret, end), Math.min(caret, end)]);
          })
        );
      }
    }

    it(
      'holds a dragged selection, clamped to the value',
      scenario(() => {
        build(PARTIAL);
        const element = editorOf('slots');

        element.focus();
        element.setSelectionRange(2, 11);
        element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        tick();

        expect(selectionOf(element)).toEqual([2, 7]);
      })
    );

    for (const [editor, model] of [
      ['text', { text: 'ABCDEFGH' }],
      ['notes', { text: 'ABCDEFGH' }],
      ['auto', { auto: 'ch' }]
    ] as const) {
      it(
        `${editor} leaves an unmasked click to the browser`,
        scenario(() => {
          build(model);
          const element = editorOf(editor);

          element.focus();
          element.setSelectionRange(4, 4);
          element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          tick();

          expect(selectionOf(element)).toEqual([4, 4]);
        })
      );
    }
  });

  describe('the rules read the field again on every entry', () => {
    it(
      'a click after a keyboard focus repositions rather than re-selecting',
      scenario(() => {
        build(FULL);
        const element = editorOf('slots');

        tabTo(element);
        tick();
        expect(selectionOf(element)).toEqual([0, 13]);

        clickAt(element, 4);
        tick();

        expect(selectionOf(element)).toEqual([4, 4]);
      })
    );

    it(
      'a second click moves the caret again',
      scenario(() => {
        build(FULL);
        const element = editorOf('slots');

        clickAt(element, 11);
        tick();
        clickAt(element, 2);
        tick();

        expect(selectionOf(element)).toEqual([2, 2]);
      })
    );

    it(
      'refocusing reads the content the field holds by then',
      scenario(() => {
        build(FULL);
        const element = editorOf('slots');

        tabTo(element);
        tick();
        expect(selectionOf(element)).toEqual([0, 13]);

        // Wipe it, leave, and come back: the boundary follows the value.
        element.setSelectionRange(0, 13);
        document.execCommand('delete');
        element.blur();
        tick();
        tabTo(element);
        tick();
        expect(element.value).toBe('___ ___ __ __');
        expect(selectionOf(element)).toEqual([0, 0]);

        // Half fill it, and again.
        for (const digit of '079') document.execCommand('insertText', false, digit);
        tick();
        element.blur();
        tick();
        tabTo(element);
        tick();
        expect(element.value).toBe('079 ___ __ __');
        expect(selectionOf(element)).toEqual([0, 3]);
      })
    );
  });

  /**
   * The one way a date field is re-entered with its mask half filled: focus moved onto its own panel,
   * which is a blur it does not commit on, so the half-typed text is still there to come back to. It used
   * to be wiped, because focus handed the display back to ngx-mask whatever the input was showing.
   */
  it(
    'a half-typed date survives a blur onto its own panel',
    scenario(() => {
      build();
      const field = fixture.debugElement.query((node) => node.nativeElement?.matches?.('formidable-date-field'))
        .componentInstance as DateFieldComponent;
      const element = editorOf('date');
      const panel = fixture.nativeElement.querySelector('formidable-date-field .panel') as HTMLElement;

      tabTo(element);
      tick();
      for (const digit of '1501') document.execCommand('insertText', false, digit);
      tick();
      expect(element.value).toBe('15/01/____');

      field.togglePanel(true);
      panel.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      element.blur();
      tick();

      expect(element.value).toBe('15/01/____');

      tabTo(element);
      tick();

      expect(element.value).toBe('15/01/____');
      expect(selectionOf(element)).toEqual([0, 5]);
    })
  );
});
