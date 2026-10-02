import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { page, userEvent } from 'vitest/browser';
import { FieldLabel } from '../../directives/field-label';
import { FormidablePanelPosition } from '../../models/formidable.model';
import { corners, theme } from '../../testing/dom';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';
import { FieldDecorator } from '../field-decorator/field-decorator';
import { DateField } from './date-field/date-field';

/**
 * Contract of the date panel's responsiveness, per **Panels** in `user/fields.md`.
 *
 * Two claims:
 *
 * 1. `--formidable-date-field-panel-width` is what the calendar *prefers*, not what it is fixed at. Given
 *    room it takes that width; given a narrower panel it scales into it, because the panel clips its
 *    content and a calendar wider than its panel simply loses its right-hand columns.
 * 2. A `sheet` is pinned to the viewport rather than to the field, so it keeps its own top corners and
 *    squares off at the screen edge instead of mirroring the field the way an anchored panel does.
 *
 * Widths are compared between two live fields rather than against a number, so the assertions hold
 * whatever the root font size resolves the token to. Each calendar opens from a trusted click on its toggle.
 */

@Component({
  imports: [DateField, FieldDecorator, FieldLabel],
  template: `
    <div style="width: 250px">
      <formidable-field-decorator>
        <formidable-date-field [panelPosition]="'full'" />
        <div formidableFieldLabel>Narrow</div>
      </formidable-field-decorator>
    </div>
    <div style="width: 600px">
      <formidable-field-decorator>
        <formidable-date-field [panelPosition]="roomyPosition()" />
        <div formidableFieldLabel>Roomy</div>
      </formidable-field-decorator>
    </div>
  `
})
class TestHost {
  readonly roomyPosition = signal<FormidablePanelPosition>('right');
}

describe('date panel responsiveness', () => {
  let fixture: ComponentFixture<TestHost>;

  beforeEach(async () => {
    configureFormidableTestBed();

    fixture = TestBed.createComponent(TestHost);
    await settle(fixture);
  });

  /** Opens the calendar of the field labelled `name`, and returns the panel it opens in. */
  async function open(name: string): Promise<HTMLElement> {
    const field = page.getByRole('combobox', { name }).element().closest('formidable-date-field')!;

    await userEvent.click(field.querySelector('.toggle')!);
    await expect.element(page.getByRole('dialog', { name })).toBeVisible();

    return field.querySelector<HTMLElement>('.panel')!;
  }

  const calendar = (panel: HTMLElement) => panel.querySelector<HTMLElement>('.pika-lendar')!;

  describe('fluid calendar', () => {
    // The panel is `overflow: hidden`, so a calendar that will not shrink is not merely cramped — the days
    // past the panel's right edge are gone, and the last column of every week with them.
    it('scales the calendar into a panel narrower than its preferred width', async () => {
      const narrow = await open('Narrow');

      expect(calendar(narrow).offsetWidth).toBeGreaterThan(0);
      expect(calendar(narrow).offsetWidth).toBeLessThanOrEqual(narrow.clientWidth);
    });

    it('keeps the preferred width where there is room for it', async () => {
      const narrow = await open('Narrow');
      const roomy = await open('Roomy');

      expect(calendar(roomy).offsetWidth).toBeGreaterThan(calendar(narrow).offsetWidth);
    });
  });

  describe('bottom sheet', () => {
    // Distinct radii throughout, so an assertion cannot pass by the two happening to agree.
    beforeEach(async () => {
      theme('--formidable-field-border-radius', '8px');
      theme('--formidable-panel-border-radius', '2px');

      fixture.componentInstance.roomyPosition.set('sheet');
      await settle(fixture);
    });

    // `top` is not asserted: it is `auto` here, but `getComputedStyle` resolves an inset on a positioned
    // element to its used value, so it reads back as the static position in pixels either way.
    it('pins itself across the bottom of the viewport instead of to the field', async () => {
      const style = getComputedStyle(await open('Roomy'));

      expect(style.position).toBe('fixed');
      expect(style.bottom).toBe('0px');
      expect(style.left).toBe('0px');
      expect(style.right).toBe('0px');
    });

    // An anchored panel mirrors the two corners of the field it sits against. A sheet sits against the
    // screen, so it mirrors nothing: its own radius on top, square where it meets the edge.
    it('keeps its own top corners and squares off at the screen edge', async () => {
      expect(corners(await open('Roomy'))).toEqual(['2px', '2px', '0px', '0px']);
    });
  });
});
