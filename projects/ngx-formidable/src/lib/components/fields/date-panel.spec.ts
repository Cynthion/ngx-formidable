import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideNgxMask } from 'ngx-mask';
import { FormidablePanelPosition } from '../../models/formidable.model';
import { DateFieldComponent } from './date-field/date-field.component';

/**
 * Contract of the date panel's responsiveness.
 *
 * Two claims:
 *
 * 1. `--formidable-date-field-panel-width` is what the calendar *prefers*, not what it is fixed at. Given
 *    room it takes that width; given a narrower panel it scales into it, because the panel clips its
 *    content and a calendar wider than its panel simply loses its right-hand columns.
 * 2. A `bottom` sheet is pinned to the viewport rather than to the field, so it keeps its own top corners
 *    and squares off at the screen edge instead of mirroring the field the way an anchored panel does.
 *
 * Widths are compared between two live fields rather than against a number, so the assertions hold
 * whatever the root font size resolves the token to.
 */

@Component({
  imports: [DateFieldComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div [style.width.px]="narrowWidth">
      <formidable-date-field
        name="narrow"
        [panelPosition]="'full'" />
    </div>
    <div style="width: 600px">
      <formidable-date-field
        name="roomy"
        [panelPosition]="roomyPosition" />
    </div>
  `
})
class HostComponent {
  narrowWidth = 250;
  roomyPosition: FormidablePanelPosition = 'right';
}

describe('date panel responsiveness', () => {
  let fixture: ComponentFixture<HostComponent>;
  let root: HTMLElement;
  const themed = new Set<string>();

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideNgxMask()] });

    fixture = TestBed.createComponent(HostComponent);
    root = fixture.nativeElement;
    fixture.detectChanges(); // ngAfterViewInit builds the calendar
  });

  afterEach(() => {
    themed.forEach((property) => document.documentElement.style.removeProperty(property));
    themed.clear();
  });

  function set(property: string, value: string): void {
    document.documentElement.style.setProperty(property, value);
    themed.add(property);
  }

  function field(name: string): HTMLElement {
    return root.querySelector(`formidable-date-field[name='${name}']`) as HTMLElement;
  }

  function open(name: string): void {
    (field(name).querySelector('.toggle') as HTMLElement).dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    fixture.detectChanges();
    tick();
  }

  function panel(name: string): HTMLElement {
    return field(name).querySelector('.panel') as HTMLElement;
  }

  function calendar(name: string): HTMLElement {
    return field(name).querySelector('.pika-lendar') as HTMLElement;
  }

  function corners(element: HTMLElement): string[] {
    const style = getComputedStyle(element);

    return [
      style.borderTopLeftRadius,
      style.borderTopRightRadius,
      style.borderBottomRightRadius,
      style.borderBottomLeftRadius
    ];
  }

  describe('fluid calendar', () => {
    // The panel is `overflow: hidden`, so a calendar that will not shrink is not merely cramped — the days
    // past the panel's right edge are gone, and the last column of every week with them.
    it('scales the calendar into a panel narrower than its preferred width', fakeAsync(() => {
      open('narrow');

      expect(calendar('narrow').offsetWidth).toBeGreaterThan(0);
      expect(calendar('narrow').offsetWidth).toBeLessThanOrEqual(panel('narrow').clientWidth);
    }));

    it('keeps the preferred width where there is room for it', fakeAsync(() => {
      open('narrow');
      open('roomy');

      expect(calendar('roomy').offsetWidth).toBeGreaterThan(calendar('narrow').offsetWidth);
    }));
  });

  describe('bottom sheet', () => {
    // Distinct radii throughout, so an assertion cannot pass by the two happening to agree.
    beforeEach(() => {
      set('--formidable-field-border-radius', '8px');
      set('--formidable-panel-border-radius', '2px');

      fixture.componentInstance.roomyPosition = 'sheet';
      fixture.detectChanges();
    });

    // `top` is not asserted: it is `auto` here, but `getComputedStyle` resolves an inset on a positioned
    // element to its used value, so it reads back as the static position in pixels either way.
    it('pins itself across the bottom of the viewport instead of to the field', fakeAsync(() => {
      open('roomy');

      const style = getComputedStyle(panel('roomy'));

      expect(style.position).toBe('fixed');
      expect(style.bottom).toBe('0px');
      expect(style.left).toBe('0px');
      expect(style.right).toBe('0px');
    }));

    // An anchored panel mirrors the two corners of the field it sits against. A sheet sits against the
    // screen, so it mirrors nothing: its own radius on top, square where it meets the edge.
    it('keeps its own top corners and squares off at the screen edge', fakeAsync(() => {
      open('roomy');

      expect(corners(panel('roomy'))).toEqual(['2px', '2px', '0px', '0px']);
    }));
  });
});
