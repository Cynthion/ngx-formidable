import { Component, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';
import { DateField } from './date-field/date-field';

/**
 * The scroll a panel field makes, per **Panels** in `user/fields.md`: opening a panel brings the field back
 * into view where the viewport cuts it off, and nothing else moves the page, neither a value written into the
 * field nor the panel closing again.
 *
 * The field sits below the fold, so a scroll that should not happen shows. Its consumer opens and closes it
 * through `togglePanel`: a user's own focus would already have brought it into view.
 */

@Component({
  imports: [ReactiveFormsModule, DateField],
  template: `
    <div style="height: 200vh"></div>
    <formidable-date-field [formControl]="when" />
  `
})
class TestHost {
  readonly when = new FormControl<Date | null>(null);
  readonly field = viewChild.required(DateField);
}

describe('panel field scrolling', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;

  const input = () => (fixture.nativeElement as HTMLElement).querySelector('input')!;

  beforeEach(async () => {
    configureFormidableTestBed();

    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    await settle(fixture);
  });

  it('does not scroll when a value is written into an off-screen field', async () => {
    host.when.setValue(new Date(2026, 8, 25));
    await settle(fixture, 50);

    expect(window.scrollY).toBe(0);
  });

  it('scrolls the off-screen field into view when its panel opens', async () => {
    host.field().togglePanel(true);

    await expect.poll(() => input().getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight);
  });

  it('does not scroll when the panel closes again', async () => {
    // Opened in view, so opening has nothing to scroll; then the page is scrolled away from it.
    input().scrollIntoView({ block: 'center' });
    host.field().togglePanel(true);
    await settle(fixture, 50);
    window.scrollTo(0, 0);

    host.field().togglePanel(false);
    await settle(fixture, 50);

    expect(window.scrollY).toBe(0);
  });
});
