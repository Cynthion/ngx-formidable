import { Component, ChangeDetectionStrategy } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideNgxMask } from 'ngx-mask';
import { InputFieldComponent } from './input-field/input-field.component';
import { TextareaFieldComponent } from './textarea-field/textarea-field.component';

/**
 * Contract of the value round trip: what a field is written stays comparable with what a user then types.
 *
 * `BaseFieldDirective.onValueChange` drops a change equal to the last one it saw, so a field does not
 * report the same value twice. `writeValue` therefore has to record what it wrote — otherwise the field
 * displays a value the base has never seen, and clearing it reads as "still empty" and never reaches the
 * model. A required rule on such a field would never fire.
 */

@Component({
  imports: [FormsModule, InputFieldComponent, TextareaFieldComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <form>
      <formidable-input-field
        name="text"
        [ngModel]="text"
        (ngModelChange)="text = $event" />
      <formidable-textarea-field
        name="notes"
        [ngModel]="notes"
        (ngModelChange)="notes = $event" />
    </form>
  `
})
class HostComponent {
  text: string | null = 'Cynthion';
  notes: string | null = 'Some notes';
}

describe('value round trip', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<HostComponent>>;
  let host: HostComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideNgxMask()] });

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  /** `NgModel` inside a `<form>` registers across a microtask, so the write lands after the view exists. */
  function settle(): void {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }

  function clear(selector: string): void {
    const el = fixture.nativeElement.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;

    el.value = '';
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('reports a written-in value being cleared', fakeAsync(() => {
    settle();
    clear('input');

    expect(host.text).toBeNull();
  }));

  it('reports it for a textarea too', fakeAsync(() => {
    settle();
    clear('textarea');

    expect(host.notes).toBeNull();
  }));

  it('still reports an ordinary edit', fakeAsync(() => {
    settle();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    input.value = 'Anna';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(host.text).toBe('Anna');
  }));
});
