import { Component, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';
import { DateField } from './date-field/date-field';

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
  imports: [ReactiveFormsModule, DateField],
  template: `
    <div style="height: 200vh"></div>
    <formidable-date-field
      name="when"
      [formControl]="when" />
  `
})
class TestHost {
  public readonly when = new FormControl<Date | null>(null);
  public readonly field = viewChild.required(DateField);
}

describe('panel field scrolling', () => {
  let fixture: ComponentFixture<TestHost>;
  let field: DateField;
  let scrolled: jasmine.Spy;

  beforeEach(async () => {
    configureFormidableTestBed();

    // Stubbed rather than spied through: a real scroll would leave the Karma page scrolled for the specs
    // that hit-test after this one.
    scrolled = spyOn(Element.prototype, 'scrollIntoView');

    fixture = TestBed.createComponent(TestHost);
    await settle(fixture); // ngAfterViewInit builds the calendar
    field = fixture.componentInstance.field();
  });

  it('does not scroll when a value is written into an off-screen field', async () => {
    fixture.componentInstance.when.setValue(new Date(2026, 8, 25));
    await settle(fixture, 50);

    expect(scrolled).not.toHaveBeenCalled();
  });

  it('scrolls the off-screen field into view when its panel opens', async () => {
    field.togglePanel(true);
    await settle(fixture, 50);

    expect(scrolled).toHaveBeenCalled();
  });

  it('does not scroll when the panel closes again', async () => {
    field.togglePanel(true);
    await settle(fixture, 50);
    scrolled.calls.reset();

    field.togglePanel(false);
    await settle(fixture, 50);

    expect(scrolled).not.toHaveBeenCalled();
  });
});
