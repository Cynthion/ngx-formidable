import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, discardPeriodicTasks, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideNgxMask } from 'ngx-mask';
import { DateFieldComponent } from './date-field/date-field.component';
import { InputFieldComponent } from './input-field/input-field.component';

/**
 * `placeHolderCharacter` is the character a mask draws for a position nobody has filled, and the library
 * reads a value back out of the rendered text by looking for it. ngx-mask lets it be set globally, which
 * would change what the fields read without their knowing, so every masked field binds it explicitly.
 *
 * Setting it per field still works, and moves the display and the caret rules together.
 */

@Component({
  imports: [FormsModule, InputFieldComponent, DateFieldComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
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

  function build(providers: unknown[]): void {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(PlaceholderHost);

    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    tick();
  }

  function inputOf(name: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(`formidable-input-field[name="${name}"] input`);
  }

  function dateInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('formidable-date-field input');
  }

  function scenario(body: () => void): jasmine.ImplementationCallback {
    return fakeAsync(() => {
      body();
      flush();
      discardPeriodicTasks();
    });
  }

  /** Tab, which is what makes the field select what it holds. */
  function tabTo(element: HTMLInputElement): void {
    element.focus();
  }

  describe('a global setting does not reach the fields', () => {
    for (const [label, providers] of [
      ['ngx-mask defaults', [provideNgxMask()]],
      ['a global placeHolderCharacter', [provideNgxMask({ placeHolderCharacter: '*' })]]
    ] as const) {
      it(
        `renders its own slots with ${label}`,
        scenario(() => {
          build([...providers]);

          expect(inputOf('inherited').value).toBe('079 123 __ __');
        })
      );

      it(
        `still finds the end of the value with ${label}`,
        scenario(() => {
          build([...providers]);
          const element = inputOf('inherited');

          tabTo(element);
          tick();

          expect([element.selectionStart, element.selectionEnd]).toEqual([0, 7]);
        })
      );

      // The initial display comes from the mask pipe; this is ngx-mask's own directive re-rendering, which
      // is what the explicit binding protects.
      it(
        `keeps its own slots when the mask re-renders on typing, with ${label}`,
        scenario(() => {
          build([...providers]);
          const element = inputOf('inherited');

          element.focus();
          element.setSelectionRange(7, 7);
          document.execCommand('insertText', false, '4');
          tick();

          expect(element.value).toBe('079 123 4_ __');
        })
      );

      it(
        `leaves a date field's empty display alone with ${label}`,
        scenario(() => {
          build([...providers]);
          const element = dateInput();

          expect(element.value).toBe('__/__/____');

          tabTo(element);
          tick();

          // An empty date reads as empty, so the caret collapses at the front rather than selecting slots.
          expect(element.value).toBe('__/__/____');
          expect([element.selectionStart, element.selectionEnd]).toEqual([0, 0]);
        })
      );
    }
  });

  describe('a per-field setting moves the display and the rules together', () => {
    it(
      'renders the character the field asked for',
      scenario(() => {
        build([provideNgxMask()]);

        expect(inputOf('own').value).toBe('079 123 ** **');
      })
    );

    it(
      'and reads the value back out against it',
      scenario(() => {
        build([provideNgxMask()]);
        const element = inputOf('own');

        tabTo(element);
        tick();

        expect([element.selectionStart, element.selectionEnd]).toEqual([0, 7]);
      })
    );

    it(
      'and clamps a click to it',
      scenario(() => {
        build([provideNgxMask()]);
        const element = inputOf('own');

        element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        element.focus();
        element.setSelectionRange(11, 11);
        element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        tick();

        expect([element.selectionStart, element.selectionEnd]).toEqual([7, 7]);
      })
    );
  });

  it(
    'warns when the mask could draw the placeholder as content',
    scenario(() => {
      const warn = spyOn(console, 'warn');

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideNgxMask()] });

      @Component({
        imports: [FormsModule, InputFieldComponent],
        changeDetection: ChangeDetectionStrategy.Eager,
        // `_` is both the placeholder and a literal this mask draws, so the two cannot be told apart.
        template: `<formidable-input-field
          name="ambiguous"
          mask="000_000"
          ngModel />`
      })
      class AmbiguousHost {}

      const ambiguous = TestBed.createComponent(AmbiguousHost);
      ambiguous.detectChanges();
      tick();

      expect(warn).toHaveBeenCalled();
      expect(warn.calls.mostRecent().args[0]).toContain('placeHolderCharacter');

      ambiguous.destroy();
    })
  );
});
