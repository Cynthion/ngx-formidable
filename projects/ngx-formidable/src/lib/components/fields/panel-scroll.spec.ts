import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideNgxMask } from 'ngx-mask';
import { DateFieldComponent } from './date-field/date-field.component';

/**
 * Contract of the scroll a panel field performs: it brings a field its opening panel would overflow back
 * into view, and it does nothing else.
 *
 * The regression this pins: the date field routes every value write through `selectDate`, which closes an
 * already-closed panel — so while the scroll also ran on close, seeding an initial value scrolled the page.
 * A form with a date below the fold moved on load, with nothing focused.
 *
 * The spacer is what makes the first claim testable: an in-view field is never scrolled either way.
 */

@Component({
  imports: [DateFieldComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div style="height: 200vh"></div>
    <formidable-date-field name="when" />
  `
})
class HostComponent {
  public readonly field = viewChild.required(DateFieldComponent);
}

describe('panel field scrolling', () => {
  let fixture: ComponentFixture<HostComponent>;
  let field: DateFieldComponent;
  let scrolled: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideNgxMask()] });

    // Stubbed rather than spied through: a real scroll would leave the Karma page scrolled for the specs
    // that hit-test after this one.
    scrolled = spyOn(Element.prototype, 'scrollIntoView');

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges(); // ngAfterViewInit builds the calendar
    field = fixture.componentInstance.field();
  });

  it('does not scroll when a value is written into an off-screen field', fakeAsync(() => {
    field.writeValue(new Date(2026, 8, 25));
    fixture.detectChanges();
    tick(50);

    expect(scrolled).not.toHaveBeenCalled();
  }));

  it('scrolls the off-screen field into view when its panel opens', fakeAsync(() => {
    field.togglePanel(true);
    fixture.detectChanges();
    tick(50);

    expect(scrolled).toHaveBeenCalled();
  }));

  it('does not scroll when the panel closes again', fakeAsync(() => {
    field.togglePanel(true);
    fixture.detectChanges();
    tick(50);
    scrolled.calls.reset();

    field.togglePanel(false);
    fixture.detectChanges();
    tick(50);

    expect(scrolled).not.toHaveBeenCalled();
  }));
});
