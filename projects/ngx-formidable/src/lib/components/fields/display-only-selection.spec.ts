import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { IFormidableOption } from '../../models/formidable.model';
import { DropdownFieldComponent } from './dropdown-field/dropdown-field.component';

/**
 * A dropdown's value is a label the field draws, not text the user owns. The input showing it is
 * `readonly` and takes no pointer events, so no mouse gesture reaches it — but a select-all does, and
 * leaves a highlight the mouse could never have produced. CSS cannot close that: Chrome honours
 * `user-select: none` for a drag and ignores it for the editing command behind `Cmd/Ctrl+A`, so the
 * field prevents the key instead. A native `<select>` has no selectable text either.
 */

const options: IFormidableOption[] = [
  { value: 'red', label: 'Red' },
  { value: 'blue', label: 'Blue' }
];

@Component({
  imports: [FormsModule, DropdownFieldComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <formidable-dropdown-field
      name="colour"
      [options]="options" />
  `
})
class HostComponent {
  options: IFormidableOption[] = options;
}

describe('display-only value selection', () => {
  let fixture: ComponentFixture<HostComponent>;
  let input: HTMLInputElement;

  afterEach(() => fixture?.destroy());

  beforeEach(fakeAsync(() => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    input = (fixture.nativeElement as HTMLElement).querySelector('.wrapped-input') as HTMLInputElement;
  }));

  /** `cancelable` is what makes `preventDefault()` observable; a synthetic event defaults to `false`. */
  function press(init: KeyboardEventInit): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { cancelable: true, ...init });
    input.dispatchEvent(event);
    fixture.detectChanges();

    return event;
  }

  it('prevents a select-all with the meta key', () => {
    expect(press({ key: 'a', metaKey: true }).defaultPrevented).toBeTrue();
  });

  it('prevents a select-all with the control key', () => {
    expect(press({ key: 'a', ctrlKey: true }).defaultPrevented).toBeTrue();
  });

  it('prevents it regardless of the reported case', () => {
    expect(press({ key: 'A', metaKey: true }).defaultPrevented).toBeTrue();
  });

  it('leaves a bare "a" to the typeahead', () => {
    expect(press({ key: 'a' }).defaultPrevented).toBeFalse();
  });

  it('leaves other modifier combos alone, so a copy or a reload still reaches the browser', () => {
    expect(press({ key: 'c', metaKey: true }).defaultPrevented).toBeFalse();
    expect(press({ key: 'r', metaKey: true }).defaultPrevented).toBeFalse();
  });
});
