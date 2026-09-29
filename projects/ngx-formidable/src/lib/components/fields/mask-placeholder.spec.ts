import { Component, Provider } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideNgxMask } from 'ngx-mask';
import { bindField, FORMS_APIS } from '../../testing/bind-field';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';
import { DateField } from './date-field/date-field';
import { InputField } from './input-field/input-field';

/**
 * `placeHolderCharacter` is the character a mask draws for a position nobody has filled, and the library
 * reads a value back out of the rendered text by looking for it. ngx-mask lets it be set globally, which
 * would change what the fields read without their knowing, so every masked field binds it explicitly.
 *
 * Setting it per field still works, and moves the display and the caret rules together.
 */

@Component({
  imports: [FormsModule, InputField, DateField],
  template: `
    <form>
      <formidable-input-field
        name="inherited"
        mask="000 000 00 00"
        [maskConfig]="{ showMaskTyped: true }"
        [ngModel]="partial" />
      <formidable-input-field
        name="own"
        mask="000 000 00 00"
        [maskConfig]="{ showMaskTyped: true, placeHolderCharacter: '*' }"
        [ngModel]="partial" />
      <formidable-date-field
        name="date"
        unicodeTokenFormat="dd/MM/yyyy" />
    </form>
  `
})
class PlaceholderHost {
  partial = '079123';
}

describe('mask placeholder character', () => {
  let fixture: ComponentFixture<PlaceholderHost>;

  afterEach(() => fixture?.destroy());

  async function build(providers: Provider[]): Promise<void> {
    TestBed.resetTestingModule();
    configureFormidableTestBed({ providers });
    fixture = TestBed.createComponent(PlaceholderHost);

    await settle(fixture);
  }

  function inputOf(name: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(`formidable-input-field[name="${name}"] input`);
  }

  function dateInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('formidable-date-field input');
  }

  /** Tab, which is what makes the field select what it holds. */
  function tabTo(element: HTMLInputElement): void {
    element.focus();
  }

  describe('a global setting does not reach the fields', () => {
    for (const [label, providers] of [
      ['ngx-mask defaults', []],
      ['a global placeHolderCharacter', [provideNgxMask({ placeHolderCharacter: '*' })]]
    ] as const) {
      it(`renders its own slots with ${label}`, async () => {
        await build([...providers]);

        expect(inputOf('inherited').value).toBe('079 123 __ __');
      });

      it(`still finds the end of the value with ${label}`, async () => {
        await build([...providers]);
        const element = inputOf('inherited');

        tabTo(element);
        await settle(fixture);

        expect([element.selectionStart, element.selectionEnd]).toEqual([0, 7]);
      });

      // The initial display comes from the mask pipe; this is ngx-mask's own directive re-rendering, which
      // is what the explicit binding protects.
      it(`keeps its own slots when the mask re-renders on typing, with ${label}`, async () => {
        await build([...providers]);
        const element = inputOf('inherited');

        element.focus();
        element.setSelectionRange(7, 7);
        document.execCommand('insertText', false, '4');
        await settle(fixture);

        expect(element.value).toBe('079 123 4_ __');
      });

      it(`leaves a date field's empty display alone with ${label}`, async () => {
        await build([...providers]);
        const element = dateInput();

        expect(element.value).toBe('__/__/____');

        tabTo(element);
        await settle(fixture);

        // An empty date reads as empty, so the caret collapses at the front rather than selecting slots.
        expect(element.value).toBe('__/__/____');
        expect([element.selectionStart, element.selectionEnd]).toEqual([0, 0]);
      });
    }
  });

  describe('a per-field setting moves the display and the rules together', () => {
    it('renders the character the field asked for', async () => {
      await build([]);

      expect(inputOf('own').value).toBe('079 123 ** **');
    });

    it('and reads the value back out against it', async () => {
      await build([]);
      const element = inputOf('own');

      tabTo(element);
      await settle(fixture);

      expect([element.selectionStart, element.selectionEnd]).toEqual([0, 7]);
    });

    it('and clamps a click to it', async () => {
      await build([]);
      const element = inputOf('own');

      element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      element.focus();
      element.setSelectionRange(11, 11);
      element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await settle(fixture);

      expect([element.selectionStart, element.selectionEnd]).toEqual([7, 7]);
    });
  });

  // `_` is both the placeholder and a literal these masks draw, so the two cannot be told apart.
  for (const kind of ['input', 'textarea'] as const) {
    for (const api of FORMS_APIS) {
      it(`${kind} warns once when the mask could draw the placeholder as content, and again when it changes (${api})`, async () => {
        const warn = spyOn(console, 'warn');
        const warnings = () => warn.calls.allArgs().filter(([text]) => String(text).includes('placeHolderCharacter'));

        TestBed.resetTestingModule();
        configureFormidableTestBed();
        const field = await bindField(kind, api, { inputs: { mask: '000_000' } });

        expect(warnings().length).toBe(1);

        await field.set('mask', '00_00');

        expect(warnings().length).toBe(2);
      });
    }
  }
});
