import { ChangeDetectionStrategy, Component } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideNgxMask } from 'ngx-mask';
import { InputFieldComponent } from './input-field/input-field.component';
import { TextareaFieldComponent } from './textarea-field/textarea-field.component';

/**
 * The caret belongs to the user. A write from the form puts it at the end, because the text it just
 * replaced is not what the user was editing — but a write of the value the field already shows replaces
 * nothing, and a consumer that echoes its model back (a `valueChanges` subscription that patches, a
 * `[ngModel]` bound to a derived signal) does exactly that on every keystroke. Moving the caret there
 * drags it out from under a click or a selection the user has just made.
 */

@Component({
  imports: [FormsModule, InputFieldComponent, TextareaFieldComponent],
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
      <formidable-textarea-field
        name="notes"
        [ngModel]="notes" />
    </form>
  `
})
class HostComponent {
  text = 'ABCDEFGH';
  masked = '0791234567';
  notes = 'ABCDEFGH';
}

describe('caret', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<HostComponent>>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideNgxMask()] });
    fixture = TestBed.createComponent(HostComponent);
  });

  /** `NgModel` inside a `<form>` registers across a microtask, and a masked write waits a task beyond it. */
  function settle(): void {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    tick();
  }

  function elementOf(selector: string): HTMLInputElement | HTMLTextAreaElement {
    return fixture.nativeElement.querySelector(selector);
  }

  function accessorOf(name: string): { writeValue: (value: string) => void } {
    return fixture.debugElement.query((node) => node.attributes['name'] === name).componentInstance;
  }

  it('leaves a caret put when the form rewrites the value already shown', fakeAsync(() => {
    settle();
    const el = elementOf('formidable-input-field[name="text"] input');
    el.setSelectionRange(3, 3);

    accessorOf('text').writeValue('ABCDEFGH');
    tick();

    expect(el.selectionStart).toBe(3);
  }));

  it('leaves a selection alone too', fakeAsync(() => {
    settle();
    const el = elementOf('formidable-input-field[name="text"] input');
    el.setSelectionRange(2, 5);

    accessorOf('text').writeValue('ABCDEFGH');
    tick();

    expect([el.selectionStart, el.selectionEnd]).toEqual([2, 5]);
  }));

  it('does the same in a masked field', fakeAsync(() => {
    settle();
    const el = elementOf('formidable-input-field[name="masked"] input');
    el.setSelectionRange(4, 4);

    accessorOf('masked').writeValue('0791234567');
    tick();

    expect(el.selectionStart).toBe(4);
  }));

  it('does the same in a textarea', fakeAsync(() => {
    settle();
    const el = elementOf('formidable-textarea-field[name="notes"] textarea');
    el.setSelectionRange(3, 3);

    accessorOf('notes').writeValue('ABCDEFGH');
    tick();

    expect(el.selectionStart).toBe(3);
  }));

  it('still moves the caret to the end when the write changes the text', fakeAsync(() => {
    settle();
    const el = elementOf('formidable-input-field[name="text"] input');
    el.setSelectionRange(3, 3);

    accessorOf('text').writeValue('IJKLMNOPQRST');
    tick();

    expect(el.selectionStart).toBe(el.value.length);
  }));
});
