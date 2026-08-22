import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideNgxMask } from 'ngx-mask';
import { ExampleFormComponent } from './example-form.component';

/**
 * The demo form is `OnPush`, like every other component in the repo. Almost all of its state moves through
 * template event handlers, which Angular marks dirty for free — so this pins the one path it does not:
 * `simulateHobbyLookup` flips a flag inside a `setTimeout`, where only its own `markForCheck()` repaints.
 * Without that call the spinner stays on screen forever, and nothing else would notice.
 */

describe('example-form OnPush contract', () => {
  let fixture: ComponentFixture<ExampleFormComponent>;
  let root: HTMLElement;

  function settle(): void {
    fixture.detectChanges();
    tick(50);
    fixture.detectChanges();
  }

  function click(el: Element | null): void {
    (el as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    settle();
  }

  beforeEach(fakeAsync(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideNgxMask()] });
    fixture = TestBed.createComponent(ExampleFormComponent);
    root = fixture.nativeElement as HTMLElement;
    settle();
  }));

  it('clears the async hobby spinner once its timer resolves', fakeAsync(() => {
    // The spinner is an adornment action, and those are off by default.
    click(root.querySelector('.control-toggle button'));
    const boxes = Array.from(root.querySelectorAll('.control-body input[type="checkbox"]')) as HTMLInputElement[];
    const showActions = boxes[2]!;
    showActions.checked = true;
    showActions.dispatchEvent(new Event('change', { bubbles: true }));
    settle();

    // An autocomplete commits on selection, and committing `hobby` is what starts the lookup.
    const field = root.querySelectorAll('formidable-autocomplete-field')[0] as HTMLElement;
    click(field.querySelector('input'));

    const options = Array.from(field.querySelectorAll('formidable-field-option')) as HTMLElement[];
    const option = options.find((o) => o.getAttribute('aria-disabled') !== 'true');
    expect(option).withContext('the panel offers an enabled option').toBeTruthy();

    // The option's `(click)` sits on an inner `div`, and events bubble up — the host would swallow it.
    click(option!.querySelector('div'));
    tick(10);
    fixture.detectChanges();

    expect(root.querySelector('.adornment-spinner')).withContext('spinner shows while loading').not.toBeNull();

    tick(1000);
    fixture.detectChanges();

    expect(root.querySelector('.adornment-spinner')).withContext('spinner cleared by markForCheck').toBeNull();
  }));
});
