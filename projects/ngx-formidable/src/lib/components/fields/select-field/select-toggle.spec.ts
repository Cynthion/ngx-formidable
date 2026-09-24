import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectFieldComponent } from './select-field.component';

/**
 * Contract of the select field's dropdown arrow.
 *
 * `field-reset` strips the user agent's arrow with `appearance: none`, so the field draws its own. A native
 * `<select>` opens its list from anywhere in its box, which is what the rules below pin down: the arrow is a
 * picture stacked over the control, never a target that swallows the click, and the room it takes is the
 * select's own `padding-right` — reserved only while an arrow is actually rendered.
 */
describe('SelectFieldComponent in-field arrow', () => {
  let fixture: ComponentFixture<SelectFieldComponent>;
  let host: HTMLElement;

  function select(): HTMLSelectElement {
    return host.querySelector('select.field') as HTMLSelectElement;
  }

  function toggle(): HTMLElement | null {
    return host.querySelector('.toggle');
  }

  function paddingRight(): number {
    return parseFloat(getComputedStyle(select()).paddingRight);
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectFieldComponent);
    fixture.componentRef.setInput('options', [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' }
    ]);
    fixture.detectChanges();

    host = fixture.nativeElement as HTMLElement;
  });

  it('renders the arrow while the field can open its list', () => {
    expect(toggle()).not.toBeNull();
    expect(fixture.componentInstance.hasInFieldToggle()).toBe(true);
  });

  for (const state of ['readonly', 'disabled'] as const) {
    it(`renders no arrow while ${state}, and hands the room back to the value`, () => {
      const reserved = paddingRight();

      fixture.componentRef.setInput(state, true);
      fixture.detectChanges();

      expect(toggle()).toBeNull();
      expect(fixture.componentInstance.hasInFieldToggle()).toBe(false);
      expect(paddingRight()).toBeLessThan(reserved);
    });
  }

  it('reserves exactly the toggle box beside the value', () => {
    const arrow = toggle() as HTMLElement;
    const bare = parseFloat(getComputedStyle(select()).paddingLeft);

    expect(paddingRight() - bare).toBeCloseTo(arrow.getBoundingClientRect().width, 1);
  });

  // The whole reason the arrow overlays the select instead of sitting beside it: a toggle in flow would
  // carve a strip out of the box that no longer opens the platform's list.
  it('lets a click on the arrow through to the select', () => {
    const rect = (toggle() as HTMLElement).getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);

    expect(hit).toBe(select());
  });
});
