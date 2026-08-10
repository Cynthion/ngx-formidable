import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNgxMask } from 'ngx-mask';
import { FieldLabelDirective } from '../../directives/field-label.directive';
import { FormidablePanelPosition } from '../../models/formidable.model';
import { DropdownFieldComponent } from '../fields/dropdown-field/dropdown-field.component';
import { InputFieldComponent } from '../fields/input-field/input-field.component';
import { RadioGroupFieldComponent } from '../fields/radio-group-field/radio-group-field.component';
import { ToggleFieldComponent } from '../fields/toggle-field/toggle-field.component';
import { FieldDecoratorComponent } from './field-decorator.component';

/**
 * Contract of the field's border geometry.
 *
 * Three claims, and they are the reason the tokens were split apart:
 *
 * 1. `--formidable-field-border-radius` shapes the field box and nothing else, one corner at a time
 *    through the four `--formidable-field-border-<corner>-radius` properties it is the default for.
 *    Everything else that happens to be rounded — the toggle, the slider, the panels — falls back to
 *    `--formidable-border-radius` instead.
 * 2. A field's corners are its own. An open panel adopts the two it sits against; the field never
 *    reshapes itself for a panel.
 * 3. The underline is paint, not layout. It is an inset shadow rather than a `border-bottom-width` so a
 *    state can thicken it without shrinking the field's content box, which would nudge the value. Groups
 *    do not get one at all.
 * 4. A `border` label owns the field's top edge. A panel flipped above the field lands its bottom edge on
 *    that edge, so the two overlap and paint order decides: label above an anchored panel, both below a
 *    sheet. Those three are private ordinals inside the decorator's own stacking context; the only public
 *    numbers are the two the whole field rises to while a panel is open. See `layering.md`.
 *
 * Radii are read back through a probe rather than off the tokens, so a fallback pointing at the wrong
 * source cannot pass.
 */

/** Resolves a custom property as a radius, in the element's own inheritance context. */
function radiusOf(host: HTMLElement, property: string): string[] {
  const probe = document.createElement('div');

  probe.style.position = 'absolute';
  probe.style.borderRadius = `var(${property})`;
  host.appendChild(probe);

  const style = getComputedStyle(probe);
  const corners = [
    style.borderTopLeftRadius,
    style.borderTopRightRadius,
    style.borderBottomRightRadius,
    style.borderBottomLeftRadius
  ];

  probe.remove();

  return corners;
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

/**
 * The painted thickness of the underline: the vertical offset of the element's inset shadow layer. Split
 * on commas outside parentheses, because a serialized colour carries commas of its own.
 */
function underline(element: HTMLElement): number {
  const layer = getComputedStyle(element)
    .boxShadow.split(/,(?![^(]*\))/)
    .find((shadow) => shadow.includes('inset'));
  const lengths = layer?.match(/-?[\d.]+px/g) ?? [];

  // <color> <offset-x> <offset-y> <blur> <spread>
  return Math.abs(parseFloat(lengths[1] ?? '0'));
}

@Component({
  standalone: true,
  imports: [
    FieldDecoratorComponent,
    InputFieldComponent,
    ToggleFieldComponent,
    DropdownFieldComponent,
    RadioGroupFieldComponent,
    FieldLabelDirective
  ],
  template: `
    <formidable-field-decorator>
      <formidable-input-field
        name="input"
        [readonly]="readonly" />
      <div
        formidableFieldLabel
        position="inside-floating">
        Label
      </div>
    </formidable-field-decorator>
    <formidable-field-decorator>
      <formidable-toggle-field name="toggle" />
    </formidable-field-decorator>
    <formidable-field-decorator>
      <formidable-dropdown-field
        name="dropdown"
        [panelPosition]="panelPosition" />
      <div
        formidableFieldLabel
        position="border">
        Label
      </div>
    </formidable-field-decorator>
    <formidable-field-decorator>
      <formidable-radio-group-field name="group" />
    </formidable-field-decorator>
  `
})
class HostComponent {
  readonly = false;
  panelPosition: FormidablePanelPosition = 'full';
}

describe('border geometry', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let root: HTMLElement;
  const themed = new Set<string>();

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideNgxMask()] });

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    root = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    themed.forEach((property) => document.documentElement.style.removeProperty(property));
    themed.clear();
  });

  function input(): HTMLInputElement {
    return root.querySelector('formidable-input-field .field') as HTMLInputElement;
  }

  function label(): HTMLElement {
    return root.querySelector('.label-wrapper') as HTMLElement;
  }

  function toggleTrack(): HTMLElement {
    return root.querySelector('.toggle-track') as HTMLElement;
  }

  function dropdown(): HTMLElement {
    return root.querySelector('formidable-dropdown-field .field') as HTMLElement;
  }

  function panel(): HTMLElement {
    return root.querySelector('formidable-dropdown-field .panel') as HTMLElement;
  }

  function group(): HTMLElement {
    return root.querySelector('formidable-radio-group-field .field') as HTMLElement;
  }

  function decorator(): HTMLElement {
    return root.querySelector('formidable-field-decorator') as HTMLElement;
  }

  /** The `border` label of the dropdown's own decorator — `label()` above is the input field's. */
  function borderLabel(): HTMLElement {
    return dropdown().closest('formidable-field-decorator')!.querySelector('.label-border') as HTMLElement;
  }

  function openPanel(): void {
    (dropdown().querySelector('.input-wrapper') as HTMLElement).dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true })
    );
    fixture.detectChanges();
  }

  /** The panel flips by class; which way it flips is `updatePanelPosition`'s call, pinned in its spec. */
  function flipAbove(): void {
    panel().classList.add('above');
  }

  function layer(element: HTMLElement): number {
    return parseInt(getComputedStyle(element).zIndex, 10);
  }

  /**
   * Overrides a variable the field reads directly. Writes to the fixture host — below `:root` — so every
   * test using it also proves the override survives being set somewhere other than the document root.
   */
  function set(property: string, value: string): void {
    root.style.setProperty(property, value);
    fixture.detectChanges();
  }

  /**
   * Overrides a variable other variables are *derived* from. Substitution happens where the derived
   * property is declared — `:root` — so a base has to be overridden there, which is also the only place a
   * consumer is asked to theme from.
   */
  function theme(property: string, value: string): void {
    document.documentElement.style.setProperty(property, value);
    themed.add(property);
    fixture.detectChanges();
  }

  /** The base radius as the browser resolves it, so these never hard-code the theme's own value. */
  function base(): string {
    return radiusOf(root, '--formidable-border-radius')[0] as string;
  }

  /**
   * The states are class-driven, and the decorator's `is-invalid` is a host binding — so, as in
   * `field-state.spec.ts`, they are set by hand and read back without a change-detection pass that would
   * take them away again.
   */
  function setState(state: 'focused' | 'invalid' | 'focused-invalid'): void {
    if (state !== 'invalid') input().classList.add('focused');
    if (state !== 'focused') decorator().classList.add('is-invalid');
  }

  describe('per-corner radius', () => {
    it('defaults every corner to the field radius', () => {
      set('--formidable-field-border-radius', '8px');

      expect(corners(input())).toEqual(['8px', '8px', '8px', '8px']);
    });

    // A theme wanting a top-rounded field names the two corners it wants; the rest keep the field radius.
    it('takes each corner on its own', () => {
      set('--formidable-field-border-radius', '8px');
      set('--formidable-field-border-end-start-radius', '0px');
      set('--formidable-field-border-end-end-radius', '0px');

      expect(corners(input())).toEqual(['8px', '8px', '0px', '0px']);
    });

    // The corner properties are read at the use site rather than declared in `:root` precisely so this
    // works: a `var()` in a custom property's *value* is substituted where that property is declared, so
    // routing the field radius through a `:root` declaration would freeze it there and quietly ignore an
    // override set further down the tree. This is the test that fails the day someone "tidies that up".
    it('follows a radius set below the document root', () => {
      input().style.setProperty('--formidable-field-border-radius', '9px');

      expect(corners(input())).toEqual(['9px', '9px', '9px', '9px']);
    });

    it('keeps that shape off everything that is not a field box', () => {
      set('--formidable-field-border-radius', '8px');
      set('--formidable-field-border-end-start-radius', '0px');

      const shared = [base(), base(), base(), base()];

      expect(radiusOf(root, '--formidable-toggle-field-track-border-radius')).toEqual(shared);
      expect(radiusOf(root, '--formidable-toggle-field-thumb-border-radius')).toEqual(shared);
      expect(radiusOf(root, '--formidable-slider-track-border-radius')).toEqual(shared);
      expect(radiusOf(root, '--formidable-slider-thumb-border-radius')).toEqual(shared);
      expect(radiusOf(root, '--formidable-slider-thumb-label-border-radius')).toEqual(shared);
      expect(radiusOf(root, '--formidable-slider-tick-mark-border-radius')).toEqual(shared);
      expect(radiusOf(root, '--formidable-panel-border-radius')).toEqual(shared);
      // and the elements really do read those tokens, not the field's
      expect(corners(toggleTrack())).toEqual(shared);
    });

    it('rounds the whole library from the shared base', () => {
      theme('--formidable-border-radius', '3px');

      expect(corners(input())).toEqual(['3px', '3px', '3px', '3px']);
      expect(corners(toggleTrack())).toEqual(['3px', '3px', '3px', '3px']);
      expect(radiusOf(root, '--formidable-panel-border-radius')).toEqual(['3px', '3px', '3px', '3px']);
    });

    // The tick mark's radius used to fall back to the border *thickness*, which made its own token
    // unreachable and reshaped it whenever a theme changed the border.
    it('leaves the tick mark alone when the border thickness changes', () => {
      const shared = [base(), base(), base(), base()];

      theme('--formidable-field-border-thickness', '5px');

      expect(radiusOf(root, '--formidable-slider-tick-mark-border-radius')).toEqual(shared);
    });
  });

  describe('underline', () => {
    it('paints nothing by default', () => {
      expect(underline(input())).toBe(0);

      setState('focused');

      expect(underline(input())).toBe(0);
    });

    it('thickens on focus, in its own colour', () => {
      set('--formidable-field-underline-thickness', '1px');
      set('--formidable-field-underline-thickness-focus', '3px');
      set('--formidable-color-field-underline-focus', 'rgb(1, 2, 3)');

      expect(underline(input())).toBe(1);

      setState('focused');

      expect(underline(input())).toBe(3);
      expect(getComputedStyle(input()).boxShadow).toContain('rgb(1, 2, 3)');
    });

    // A focused field is touched by definition, so focused-and-invalid is the common case. `invalid-colors`
    // has to point focus's own variables at the invalid ones, exactly as it does for the border colours.
    it('lets invalid outrank focus', () => {
      set('--formidable-field-underline-thickness-focus', '3px');
      set('--formidable-field-underline-thickness-invalid', '5px');

      setState('invalid');

      expect(underline(input())).toBe(5);

      input().classList.add('focused');

      expect(underline(input())).toBe(5);
    });

    // The whole reason it is a shadow and not a `border-bottom-width`: a real border would take its
    // thickness out of the content box, and every state that changed it would move the value with it.
    it('moves nothing when a state thickens it', () => {
      set('--formidable-field-underline-thickness-focus', '5px');

      const box = input().getBoundingClientRect();
      const content = input().clientHeight;
      const labelTop = label().getBoundingClientRect().top;

      setState('focused');

      expect(underline(input())).toBe(5);
      expect(input().clientHeight).toBe(content);
      expect(input().getBoundingClientRect().height).toBeCloseTo(box.height, 2);
      expect(label().getBoundingClientRect().top).toBeCloseTo(labelTop, 2);
    });

    it('goes with the border when a state hides it', () => {
      set('--formidable-field-underline-thickness', '2px');
      set('--formidable-color-field-border-readonly', 'rgb(9, 8, 7)');

      host.readonly = true;
      fixture.detectChanges();

      expect(getComputedStyle(input()).boxShadow).toContain('rgb(9, 8, 7)');
    });

    // A group is a tall multi-row box, so a line across its bottom reads as a divider between its options
    // rather than as the field's own edge. It takes the focus ring and nothing else, whatever a theme asks
    // for — which is why the thicknesses below are set and then not expected to show up anywhere.
    it('never reaches a group, however thick a theme sets it', () => {
      set('--formidable-field-underline-thickness', '4px');
      set('--formidable-field-underline-thickness-focus', '6px');

      const resting = getComputedStyle(group()).boxShadow;

      expect(underline(group())).toBe(0);

      group().classList.add('focused');

      expect(underline(group())).toBe(0);
      // …and losing the underline did not cost it the focus ring, which shares the same declaration
      expect(getComputedStyle(group()).boxShadow).not.toBe(resting);
      expect(getComputedStyle(group()).boxShadow).toContain('1px');
    });
  });

  describe('panel corner mirroring', () => {
    // Distinct radii throughout, so an assertion cannot pass by the two happening to agree.
    beforeEach(() => {
      set('--formidable-field-border-radius', '8px');
      set('--formidable-panel-border-radius', '2px');
    });

    // What gating the mirroring on `open` buys: a closed panel is still laid out, and has no field to
    // agree with yet.
    it('keeps its own corners while closed', () => {
      expect(corners(panel())).toEqual(['2px', '2px', '2px', '2px']);
    });

    it('adopts the field bottom corners onto its top ones when it opens below', () => {
      openPanel();

      expect(corners(panel())).toEqual(['8px', '8px', '2px', '2px']);
    });

    it('adopts the field top corners onto its bottom ones when it flips above', () => {
      set('--formidable-field-border-start-start-radius', '4px');
      set('--formidable-field-border-start-end-radius', '4px');
      openPanel();
      flipAbove();

      // The top pair goes back to the panel's own radius, and the bottom pair takes the field's *top*
      // corners — not the bottom ones it would have mirrored below.
      expect(corners(panel())).toEqual(['2px', '2px', '4px', '4px']);
    });

    it('mirrors a single corner the field shapes on its own', () => {
      set('--formidable-field-border-end-start-radius', '10px');
      openPanel();

      expect(corners(panel())).toEqual(['10px', '8px', '2px', '2px']);
    });

    // The panel is a child of the field, so the cascade reaches it wherever the radius was set.
    it('follows a radius set on the field element itself', () => {
      dropdown().style.setProperty('--formidable-field-border-radius', '9px');
      openPanel();

      expect(corners(panel())).toEqual(['9px', '9px', '2px', '2px']);
    });

    // The point of the rework: mirroring runs one way. A field that squared its own corners for a panel
    // put a squared corner wherever the panel's far edge happened to fall — which, under a shrink-wrapped
    // `panel-left`, was most of a field's width away from anything.
    it('never reshapes the field', () => {
      const before = corners(dropdown());

      openPanel();

      expect(corners(dropdown())).toEqual(before);
      expect(corners(dropdown())).toEqual(['8px', '8px', '8px', '8px']);
      expect(dropdown().classList.contains('has-panel-below')).toBe(false);
      expect(dropdown().classList.contains('has-panel-above')).toBe(false);
    });
  });

  /**
   * A flipped panel's bottom edge lands on the field's top border-box edge, which is the one stretch of the
   * field a `border` label reaches above. Both live inside the decorator's own stacking context, so the
   * ordinals alone decide, and they are the same ordinals whatever the consumer's page is doing.
   */
  describe('a border label against a flipped panel', () => {
    it('really is overlapped by the panel it has to beat', () => {
      openPanel();
      flipAbove();

      // The panel's rect covers everything the label has above the field's top edge — its band included.
      expect(panel().getBoundingClientRect().bottom).toBeGreaterThan(borderLabel().getBoundingClientRect().top);
    });

    it('paints over it', () => {
      openPanel();
      flipAbove();

      expect(layer(borderLabel())).toBeGreaterThan(layer(panel()));
    });

    // The ordinals are private: they order the atom's own contents and mean nothing outside it, so no
    // public variable may move them. The values are picked so that a ladder derived from the public
    // variable — which is what these used to be — cannot land on them by coincidence.
    it('keeps its ordinal whatever the public variables are set to', () => {
      theme('--formidable-panel-z-index', '7');
      theme('--formidable-sheet-z-index', '9');

      expect(layer(panel())).toBe(2);
      expect(layer(borderLabel())).toBe(3);
    });

    // A sheet spans the viewport and covers whatever is behind it, its own field's border label included.
    it('still yields to a sheet', () => {
      host.panelPosition = 'sheet';
      fixture.detectChanges();

      expect(layer(panel())).toBeGreaterThan(layer(borderLabel()));
    });
  });

  /**
   * The reason the ordinals can stay small: the decorator is a stacking context, so a closed field cannot
   * reach anything a consumer stacks around it — and an open panel rises as a whole rather than by leaking
   * one part of itself upwards.
   */
  describe('the atom', () => {
    function dropdownDecorator(): HTMLElement {
      return dropdown().closest('formidable-field-decorator') as HTMLElement;
    }

    it('is a stacking context, so nothing inside it competes with the page', () => {
      expect(getComputedStyle(decorator()).isolation).toBe('isolate');
    });

    // The defect this architecture exists for: a `border` label used to carry z-index 1000 in the *page's*
    // stacking context, so it painted over a consumer's sticky chrome even with the field closed.
    it('carries no z-index of its own while closed', () => {
      expect(getComputedStyle(dropdownDecorator()).zIndex).toBe('auto');
      expect(layer(borderLabel())).toBeLessThan(10);
    });

    it('rises to the panel layer while an anchored panel is open', () => {
      openPanel();

      expect(dropdownDecorator().classList.contains('has-open-panel')).toBe(true);
      expect(layer(dropdownDecorator())).toBe(999);
    });

    it('rises to the sheet layer instead when the panel is a sheet', () => {
      host.panelPosition = 'sheet';
      fixture.detectChanges();
      openPanel();

      expect(dropdownDecorator().classList.contains('has-open-sheet')).toBe(true);
      expect(dropdownDecorator().classList.contains('has-open-panel')).toBe(false);
      expect(layer(dropdownDecorator())).toBe(1000);
    });

    it('drops back to no z-index once the panel closes', () => {
      openPanel();
      openPanel();

      expect(dropdownDecorator().classList.contains('has-open-panel')).toBe(false);
      expect(getComputedStyle(dropdownDecorator()).zIndex).toBe('auto');
    });

    it('takes both layers from the theme', () => {
      theme('--formidable-panel-z-index', '40');
      theme('--formidable-sheet-z-index', '60');
      openPanel();

      expect(layer(dropdownDecorator())).toBe(40);

      host.panelPosition = 'sheet';
      fixture.detectChanges();

      expect(layer(dropdownDecorator())).toBe(60);
    });
  });
});
