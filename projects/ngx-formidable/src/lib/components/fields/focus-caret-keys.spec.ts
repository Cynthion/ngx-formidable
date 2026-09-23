import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentFixture, discardPeriodicTasks, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideNgxMask } from 'ngx-mask';
import { IFormidableOption } from '../../models/formidable.model';
import { AutocompleteFieldComponent } from './autocomplete-field/autocomplete-field.component';
import { InputFieldComponent } from './input-field/input-field.component';
import { TextareaFieldComponent } from './textarea-field/textarea-field.component';

/**
 * What the caret rules owe the keystroke that comes next. Focus entry is a one-off, and nothing the field
 * does may still be in flight when the user starts typing — which is why the pointer correction is made on
 * the `click` that ends the press rather than on a timer after it. `focus-caret.spec.ts` covers the entry.
 *
 * Editing runs through `document.execCommand`, which acts on the editor's real selection and fires the
 * `input` the mask listens for. Asserting against a selection the spec set itself would prove nothing.
 */

@Component({
  imports: [FormsModule, InputFieldComponent, TextareaFieldComponent, AutocompleteFieldComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <form>
      <formidable-input-field
        name="text"
        [ngModel]="text" />
      <formidable-input-field
        name="masked"
        mask="000 000 00 00"
        [maskConfig]="{ showMaskTyped: true }"
        [ngModel]="masked" />
      <formidable-textarea-field
        name="notes"
        [ngModel]="text" />
      <!-- Options that follow the filter, the way a consumer supplying them does. -->
      <formidable-autocomplete-field
        name="auto"
        [options]="visible()"
        [ngModel]="auto"
        (filterChanged)="filter($event)" />
    </form>
  `
})
class KeyHostComponent {
  private readonly all: IFormidableOption[] = [
    { value: 'ch', label: 'Langstrasse 84' },
    { value: 'de', label: 'Wiesenstrasse 5' }
  ];

  readonly visible = signal<IFormidableOption[]>(this.all);

  text: string | null = null;
  masked: string | null = null;
  auto: string | null = null;
  /** Off for the one spec that supplies its options by hand, to model a list that arrives late. */
  follows = true;

  filter(text: string): void {
    if (!this.follows) return;

    this.visible.set(this.all.filter((o) => o.label!.toLowerCase().includes(text.toLowerCase())));
  }
}

type Editor = HTMLInputElement | HTMLTextAreaElement;

describe('caret from the first keystroke', () => {
  let fixture: ComponentFixture<KeyHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KeyHostComponent],
      providers: [provideNgxMask()]
    }).compileComponents();

    (document.activeElement as HTMLElement | null)?.blur();
  });

  afterEach(() => fixture?.destroy());

  function build(model: Partial<KeyHostComponent> = {}): void {
    fixture = TestBed.createComponent(KeyHostComponent);
    Object.assign(fixture.componentInstance, model);

    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    tick();
  }

  function editorOf(selector: string): Editor {
    return fixture.nativeElement.querySelector(selector) as Editor;
  }

  const text = () => editorOf('formidable-input-field[name="text"] input');
  const masked = () => editorOf('formidable-input-field[name="masked"] input');
  const notes = () => editorOf('formidable-textarea-field textarea');
  const auto = () => editorOf('formidable-autocomplete-field input');

  function tabTo(element: Editor): void {
    element.focus();
  }

  function clickAt(element: Editor, caret: number): void {
    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    element.focus();
    element.setSelectionRange(caret, caret);
    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }

  function press(element: Editor, key: string, command: string, modifiers: Partial<KeyboardEventInit> = {}): void {
    element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers }));
    document.execCommand(command);
  }

  function type(element: Editor, characters: string): void {
    for (const character of characters) {
      element.dispatchEvent(new KeyboardEvent('keydown', { key: character, bubbles: true, cancelable: true }));
      document.execCommand('insertText', false, character);
    }
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

  describe('the first character typed', () => {
    it(
      'replaces what the keyboard selected, unmasked',
      scenario(() => {
        build({ text: 'ABCDEFGH' });

        tabTo(text());
        type(text(), 'X');
        tick();

        expect(text().value).toBe('X');
      })
    );

    it(
      'replaces what the keyboard selected, masked',
      scenario(() => {
        build({ masked: '0791234567' });

        tabTo(masked());
        type(masked(), '4');
        tick();

        expect(masked().value).toBe('4__ ___ __ __');
      })
    );

    it(
      'replaces only the filled part of a half-filled mask',
      scenario(() => {
        build({ masked: '079123' });

        tabTo(masked());
        type(masked(), '4');
        tick();

        expect(masked().value).toBe('4__ ___ __ __');
      })
    );

    it(
      'starts at the front of an empty mask',
      scenario(() => {
        build();

        tabTo(masked());
        type(masked(), '7');
        tick();

        expect(masked().value).toBe('7__ ___ __ __');
      })
    );

    it(
      'lands at the caret a click placed, unmasked',
      scenario(() => {
        build({ text: 'ABCDEFGH' });

        clickAt(text(), 4);
        type(text(), 'X');
        tick();

        expect(text().value).toBe('ABCDXEFGH');
      })
    );

    // No timer stands between the click and the keystroke, so the character lands on the clicked caret
    // even when it arrives in the same task.
    it(
      'lands at the caret a click placed in a mask',
      scenario(() => {
        build({ masked: '079123' });

        clickAt(masked(), 1);
        type(masked(), '5');
        tick();

        expect(masked().value).toBe('057 912 3_ __');
      })
    );

    it(
      'lands at the end when the click aimed past the value',
      scenario(() => {
        build({ masked: '079123' });

        clickAt(masked(), 12);
        type(masked(), '5');
        tick();

        expect(masked().value).toBe('079 123 5_ __');
      })
    );

    it(
      'is processed exactly once',
      scenario(() => {
        build({ text: 'AB' });

        tabTo(text());
        type(text(), 'X');
        tick();
        flush();

        expect(text().value).toBe('X');
      })
    );
  });

  describe('the first deletion', () => {
    it(
      'Backspace wipes what the keyboard selected',
      scenario(() => {
        build({ text: 'ABCDEFGH' });

        tabTo(text());
        press(text(), 'Backspace', 'delete');
        tick();

        expect(text().value).toBe('');
      })
    );

    it(
      'Delete wipes it too',
      scenario(() => {
        build({ text: 'ABCDEFGH' });

        tabTo(text());
        press(text(), 'Delete', 'forwardDelete');
        tick();

        expect(text().value).toBe('');
      })
    );

    it(
      'empties a masked field the keyboard selected',
      scenario(() => {
        build({ masked: '0791234567' });

        tabTo(masked());
        press(masked(), 'Backspace', 'delete');
        tick();

        expect(masked().value).toBe('___ ___ __ __');
      })
    );

    it(
      'Backspace takes the character before a clicked caret',
      scenario(() => {
        build({ text: 'ABCDEFGH' });

        clickAt(text(), 4);
        press(text(), 'Backspace', 'delete');
        tick();

        expect(text().value).toBe('ABCEFGH');
        expect(selectionOf(text())).toEqual([3, 3]);
      })
    );

    it(
      'Delete takes the one after it',
      scenario(() => {
        build({ text: 'ABCDEFGH' });

        clickAt(text(), 4);
        press(text(), 'Delete', 'forwardDelete');
        tick();

        expect(text().value).toBe('ABCDFGH');
        expect(selectionOf(text())).toEqual([4, 4]);
      })
    );

    it(
      'Delete at the end is a boundary no-op, not a swallowed key',
      scenario(() => {
        build({ text: 'ABCDEFGH' });

        clickAt(text(), 8);
        press(text(), 'Delete', 'forwardDelete');
        tick();
        expect(text().value).toBe('ABCDEFGH');

        text().setSelectionRange(7, 7);
        press(text(), 'Delete', 'forwardDelete');
        tick();
        expect(text().value).toBe('ABCDEFG');
      })
    );

    it(
      'Backspace at the front is a no-op',
      scenario(() => {
        build({ text: 'ABCDEFGH' });

        clickAt(text(), 0);
        press(text(), 'Backspace', 'delete');
        tick();

        expect(text().value).toBe('ABCDEFGH');
      })
    );
  });

  describe('select all', () => {
    for (const [label, modifiers] of [
      ['Ctrl+A', { ctrlKey: true }],
      ['Cmd+A', { metaKey: true }]
    ] as const) {
      it(
        `${label} selects everything on the first press`,
        scenario(() => {
          build({ text: 'ABCDEFGH' });

          clickAt(text(), 4);
          press(text(), 'a', 'selectAll', modifiers);
          tick();

          expect(selectionOf(text())).toEqual([0, 8]);
        })
      );

      it(
        `${label} then typing replaces the lot`,
        scenario(() => {
          build({ text: 'ABCDEFGH' });

          clickAt(text(), 4);
          press(text(), 'a', 'selectAll', modifiers);
          type(text(), 'X');
          tick();

          expect(text().value).toBe('X');
        })
      );
    }

    it(
      'works on the first press in a masked field too',
      scenario(() => {
        build({ masked: '0791234567' });

        clickAt(masked(), 2);
        press(masked(), 'a', 'selectAll', { ctrlKey: true });
        press(masked(), 'Backspace', 'delete');
        tick();

        expect(masked().value).toBe('___ ___ __ __');
      })
    );
  });

  describe('arrow keys', () => {
    // A dispatched arrow runs no default action, so the move the browser would make is made here; what is
    // under test is that nothing the field did reaches back and undoes it.
    function arrow(element: Editor, key: 'ArrowLeft' | 'ArrowRight', to: number): void {
      element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      element.setSelectionRange(to, to);
    }

    it(
      'ArrowLeft collapses a keyboard selection on the first press',
      scenario(() => {
        build({ text: 'ABCDEFGH' });

        tabTo(text());
        expect(selectionOf(text())).toEqual([0, 8]);
        arrow(text(), 'ArrowLeft', 0);
        tick();
        flush();

        expect(selectionOf(text())).toEqual([0, 0]);
      })
    );

    it(
      'ArrowRight works on the first press too',
      scenario(() => {
        build({ text: 'ABCDEFGH' });

        tabTo(text());
        arrow(text(), 'ArrowRight', 8);
        tick();
        flush();

        expect(selectionOf(text())).toEqual([8, 8]);
      })
    );

    it(
      'a full mask does not lock the caret at the end',
      scenario(() => {
        build({ masked: '0791234567' });

        clickAt(masked(), 13);
        arrow(masked(), 'ArrowLeft', 12);
        tick();
        flush();

        expect(selectionOf(masked())).toEqual([12, 12]);
      })
    );
  });

  describe('nothing is left in flight', () => {
    it(
      'a click leaves no work to undo an edit made right after it',
      scenario(() => {
        build({ masked: '079123' });

        clickAt(masked(), 1);
        type(masked(), '5');
        tick();
        flush();

        expect(masked().value).toBe('057 912 3_ __');
        expect(selectionOf(masked())).toEqual([2, 2]);
      })
    );

    it(
      'nor to undo a caret the user moved',
      scenario(() => {
        build({ masked: '0791234567' });

        clickAt(masked(), 6);
        masked().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
        masked().setSelectionRange(5, 5);
        tick();
        flush();

        expect(selectionOf(masked())).toEqual([5, 5]);
      })
    );

    it(
      'nor to undo a deletion',
      scenario(() => {
        build({ text: 'ABCDEFGH' });

        clickAt(text(), 4);
        press(text(), 'Backspace', 'delete');
        tick();
        flush();

        expect(text().value).toBe('ABCEFGH');
        expect(selectionOf(text())).toEqual([3, 3]);
      })
    );

    it(
      'and time alone changes nothing',
      scenario(() => {
        build({ masked: '0791234567' });

        clickAt(masked(), 4);
        tick();
        flush();

        expect(masked().value).toBe('079 123 45 67');
        expect(selectionOf(masked())).toEqual([4, 4]);
      })
    );
  });

  describe('a textarea keeps the browser behaviour', () => {
    it(
      'is not select-alled on focus',
      scenario(() => {
        build({ text: 'A long note the user would rather not lose.' });

        notes().setSelectionRange(5, 5);
        notes().focus();
        tick();

        expect(selectionOf(notes())).toEqual([5, 5]);
      })
    );

    it(
      'so the first Backspace takes one character, not the paragraph',
      scenario(() => {
        build({ text: 'ABCDEFGH' });

        notes().focus();
        notes().setSelectionRange(8, 8);
        press(notes(), 'Backspace', 'delete');
        tick();

        expect(notes().value).toBe('ABCDEFG');
      })
    );
  });

  /**
   * The autocomplete re-applies a written value when its options change, so a value whose option had not
   * arrived yet can still be placed. It used to do so even once placed — and a consumer filtering on
   * `filterChanged` refreshes the options on every keystroke, so the first two deletions were overwritten
   * as they were made.
   */
  describe('the autocomplete editor', () => {
    it(
      'clears on the first Backspace after the keyboard selected its label',
      scenario(() => {
        build({ auto: 'ch' });
        expect(auto().value).toBe('Langstrasse 84');

        tabTo(auto());
        press(auto(), 'Backspace', 'delete');
        tick();

        expect(auto().value).toBe('');
      })
    );

    it(
      'keeps it cleared once the filter has settled',
      scenario(() => {
        build({ auto: 'ch' });

        tabTo(auto());
        press(auto(), 'Backspace', 'delete');
        tick(250); // past the filter debounce
        fixture.detectChanges();
        tick();

        expect(auto().value).toBe('');
      })
    );

    it(
      'deletes one character at a time from the end',
      scenario(() => {
        build({ auto: 'ch' });

        clickAt(auto(), 14);
        press(auto(), 'Backspace', 'delete');
        tick();
        expect(auto().value).toBe('Langstrasse 8');

        press(auto(), 'Backspace', 'delete');
        tick();
        expect(auto().value).toBe('Langstrasse ');
      })
    );

    // The re-apply still does its job: a value written before its option exists is placed when it arrives.
    it(
      'still places a value whose option arrives late',
      scenario(() => {
        fixture = TestBed.createComponent(KeyHostComponent);
        fixture.componentInstance.follows = false;
        fixture.componentInstance.visible.set([]);
        fixture.componentInstance.auto = 'de';
        fixture.detectChanges();
        tick();
        fixture.detectChanges();
        tick();

        expect(auto().value).toBe('');

        fixture.componentInstance.visible.set([{ value: 'de', label: 'Wiesenstrasse 5' }]);
        fixture.detectChanges();
        tick();

        expect(auto().value).toBe('Wiesenstrasse 5');
      })
    );
  });
});
