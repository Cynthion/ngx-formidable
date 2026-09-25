import {
  ChangeDetectionStrategy,
  Component,
  provideZonelessChangeDetection,
  signal,
  Type,
  viewChild
} from '@angular/core';
import { ComponentFixture, discardPeriodicTasks, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideNgxMask } from 'ngx-mask';
import { FieldLabelDirective } from '../../directives/field-label.directive';
import { IFormidableOption } from '../../models/formidable.model';
import { FieldDecoratorComponent } from '../field-decorator/field-decorator.component';
import { DateFieldComponent } from './date-field/date-field.component';
import { DropdownFieldComponent } from './dropdown-field/dropdown-field.component';
import { InputFieldComponent } from './input-field/input-field.component';
import { TextareaFieldComponent } from './textarea-field/textarea-field.component';

/**
 * Contract of the paths that repaint with no Angular listener anywhere in the callstack: a third party's
 * callback, a bare `document` listener, a bare `requestAnimationFrame` and a bare `queueMicrotask`.
 * Everywhere else a template listener or an output marks the view, whatever the change-detection mode.
 *
 * This is the only zoneless file in the suite, and `provideZonelessChangeDetection()` is what makes it one.
 * Every other spec runs under zone change detection, because `@angular/build:karma` injects
 * `provideZoneChangeDetection()` into the test environment whenever `zone.js` is in the target's
 * `polyfills` — which it must stay, since `fakeAsync` needs it. The NG0914 warning the provider logs is
 * that same fact reported back, and is expected here.
 *
 * **Never call `detectChanges()` after the act.** Zonelessly it refreshes only what something marked, so a
 * repaint that arrives is the library's own doing — and a `detectChanges()` that reaches a view anyway
 * would be reporting the harness rather than the contract. Mount, act, then `flush()`.
 */

const options: IFormidableOption[] = [
  { value: 'red', label: 'Red' },
  { value: 'blue', label: 'Blue' }
];

@Component({
  imports: [FormsModule, DateFieldComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<formidable-date-field name="date" />`
})
class DateHostComponent {}

@Component({
  imports: [FormsModule, DropdownFieldComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <formidable-dropdown-field
      name="dropdown"
      [options]="options()" />
  `
})
class DropdownHostComponent {
  // A signal, so a changed list marks this host too. Zonelessly `detectChanges()` refreshes only what
  // something marked, and a plain field on an `Eager` host is not that.
  readonly options = signal(options);
  readonly dropdown = viewChild.required(DropdownFieldComponent);
}

@Component({
  imports: [FormsModule, FieldDecoratorComponent, FieldLabelDirective, InputFieldComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <form>
      <formidable-field-decorator>
        <label formidableFieldLabel>Name</label>
        <formidable-input-field
          name="name"
          [ngModel]="value" />
      </formidable-field-decorator>
    </form>
  `
})
class LabelHostComponent {
  readonly value = 'written in';
}

@Component({
  imports: [TextareaFieldComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <formidable-textarea-field
      name="code"
      mask="000-000"
      [showLengthIndicator]="true" />
  `
})
class TextareaHostComponent {
  readonly textarea = viewChild.required(TextareaFieldComponent);
}

describe('zoneless change detection', () => {
  let fixture: ComponentFixture<unknown>;
  let root: HTMLElement;

  beforeEach(() => TestBed.configureTestingModule({ providers: [provideNgxMask(), provideZonelessChangeDetection()] }));

  afterEach(() => {
    fixture?.destroy();
    // An opening panel calls `scrollIntoView`, and a page left scrolled breaks the next spec that hit-tests
    // against viewport coordinates.
    window.scrollTo(0, 0);
  });

  /** Creates the view and lets the field's own deferred work land — nothing here is an act. */
  function mount<T>(host: Type<T>): T {
    fixture = TestBed.createComponent(host);
    fixture.detectChanges();
    flush();

    root = fixture.nativeElement as HTMLElement;

    return fixture.componentInstance as T;
  }

  function element(selector: string): HTMLElement {
    return root.querySelector(selector) as HTMLElement;
  }

  /**
   * End-to-end guard rather than a marking proof, and deliberately so: the roadmap called this the worst
   * zoneless case, and it is not one. A day cell sits inside the panel, whose `(mousedown)` template
   * listener marks the view on the way past — and `selectDate` writes `isFieldFilled` and `isPanelOpen` as
   * well, so three separate things would have to fail before a pick went unpainted. Nothing in the suite
   * covered the pick itself, which is what this is here for.
   */
  it('renders a calendar pick and closes the panel, from Pikaday’s own callback', fakeAsync(() => {
    mount(DateHostComponent);

    element('.toggle').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    flush();

    expect(element('.panel').classList.contains('open')).toBe(true);

    const day = root.querySelector('.pika-button:not(.is-empty)') as HTMLElement;
    day.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    flush();

    expect(element('.panel').classList.contains('open')).toBe(false);
    expect((element('input') as HTMLInputElement).value).not.toBe('');

    discardPeriodicTasks();
  }));

  /**
   * The outside-click listener is a bare `fromEvent(document, 'click')` registered in `ngOnInit`, so the
   * close is carried by the `isPanelOpen` signal and by nothing else.
   */
  it('closes a dropdown panel from a bare document click listener', fakeAsync(() => {
    const host = mount(DropdownHostComponent);

    host.dropdown().togglePanel(true);
    flush();

    expect(element('.panel').classList.contains('open')).toBe(true);

    document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    flush();

    expect(element('.panel').classList.contains('open')).toBe(false);

    discardPeriodicTasks();
  }));

  /**
   * The label gate opens one bare `requestAnimationFrame` after the first render. Two claims: the initial
   * resting-to-floating correction happens before the gate, so it is never animated; and the gate's own
   * signal write is what repaints, with nothing else marking the decorator.
   */
  it('releases the label gate after the correction, from a bare requestAnimationFrame', fakeAsync(() => {
    fixture = TestBed.createComponent(LabelHostComponent);
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;

    const label = () => element('.label-wrapper');

    // `NgForm` registers the control through a microtask, so the field's first render has no value yet.
    expect(label().classList.contains('label-resting')).toBe(true);

    tick(0); // the write lands, and the scheduler repaints what it marked

    // The correction the gate exists to hide: floating already, and still not animated.
    expect(label().classList.contains('label-floating')).toBe(true);
    expect(label().classList.contains('label-animated')).toBe(false);

    tick(16); // the frame the decorator waits for

    expect(label().classList.contains('label-animated')).toBe(true);

    flush();
    discardPeriodicTasks();
  }));

  /**
   * An option list resolves in a `queueMicrotask` that no render owns. With the panel already open and
   * nothing else moving, `activeOptions` is the only thing that can carry a changed list onto the screen.
   */
  it('renders options that resolved in a bare microtask', fakeAsync(() => {
    const host = mount(DropdownHostComponent);

    host.dropdown().togglePanel(true);
    flush();

    expect(root.querySelectorAll('formidable-field-option').length).toBe(2);

    host.options.set([...options, { value: 'green', label: 'Green' }]);
    flush();

    expect(root.querySelectorAll('formidable-field-option').length).toBe(3);

    discardPeriodicTasks();
  }));

  /**
   * A masked write lands in a bare `setTimeout`, and its correction finds the value unchanged, so nothing
   * but the count's own signal can carry the new length onto the screen.
   */
  it('counts a programmatic masked write', fakeAsync(() => {
    const host = mount(TextareaHostComponent);

    host.textarea().writeValue('123456');
    flush();

    expect(element('.length-indicator').textContent!.trim()).toBe('7'); // `123-456`, as `maxlength` counts it
  }));
});
