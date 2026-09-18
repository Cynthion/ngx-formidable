import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, fakeAsync, flush, TestBed } from '@angular/core/testing';
import { ExampleTooltipComponent } from './example-tooltip.component';

/**
 * The tooltip closes itself from capture-phase `document` listeners it registers in `ngOnInit`, so nothing
 * Angular owns is on that stack. Its `open` flag is a signal, which is what marks the view there; make it a
 * plain field again and the panel stays on screen while the component believes it is closed — after which
 * the next trigger click opens it again and it can never be dismissed.
 *
 * Zoneless on purpose, because the demo is: see `zoneless.spec.ts` in the library for why the rest of the
 * suite is not, and why the NG0914 warning is expected.
 */
describe('example-tooltip outside dismissal', () => {
  let fixture: ComponentFixture<ExampleTooltipComponent>;
  let root: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(ExampleTooltipComponent);
    fixture.componentRef.setInput('text', 'Help');
    fixture.componentRef.setInput('trigger', 'click');
    fixture.detectChanges();

    root = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => fixture.destroy());

  function panel(): HTMLElement {
    return root.querySelector('.tooltip-panel') as HTMLElement;
  }

  function open(): void {
    (root.querySelector('.tooltip-trigger') as HTMLElement).click();
    flush();
  }

  it('closes on a click outside, and reopens afterwards', fakeAsync(() => {
    open();
    expect(panel().classList.contains('open')).toBe(true);

    document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    flush();

    expect(panel().classList.contains('open')).toBe(false);

    // The flag and the DOM agreed, so the trigger opens it again rather than closing something already shut.
    open();
    expect(panel().classList.contains('open')).toBe(true);
  }));

  it('closes on Escape', fakeAsync(() => {
    open();
    expect(panel().classList.contains('open')).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    flush();

    expect(panel().classList.contains('open')).toBe(false);
  }));
});
