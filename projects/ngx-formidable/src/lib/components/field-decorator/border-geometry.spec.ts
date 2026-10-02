import { page, userEvent } from 'vitest/browser';
import { bindField, BindFieldOptions, BoundField } from '../../testing/bind-field';
import { corners, theme } from '../../testing/dom';
import { configureFormidableTestBed } from '../../testing/test-bed';

/**
 * Contract of the field's border geometry.
 *
 * Four claims, and they are the reason the tokens were split apart:
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
 *    numbers are the two the whole field rises to while a panel is open. See `tech/layering.md`.
 *
 * Radii are read back through a probe rather than off the tokens, so a fallback pointing at the wrong
 * source cannot pass.
 */

const OPTIONS = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' }
];

/** Resolves a custom property as a radius, in the element's own inheritance context. */
function radiusOf(host: HTMLElement, property: string): string[] {
  const probe = document.createElement('div');

  probe.style.position = 'absolute';
  probe.style.borderRadius = `var(${property})`;
  host.appendChild(probe);

  const resolved = corners(probe);

  probe.remove();

  return resolved;
}

/** A box shadow's layers. Split on commas outside parentheses, because a serialized colour carries its own. */
function shadows(element: Element): string[] {
  return getComputedStyle(element).boxShadow.split(/,(?![^(]*\))/);
}

/** One length of a shadow layer: `<color> <offset-x> <offset-y> <blur> <spread>`, counted from the offsets. */
function length(layer: string | undefined, index: number): number {
  return parseFloat(layer?.match(/-?[\d.]+px/g)?.[index] ?? '0');
}

/** The painted thickness of the underline: the vertical offset of the element's inset shadow layer. */
function underline(element: Element): number {
  return Math.abs(
    length(
      shadows(element).find((shadow) => shadow.includes('inset')),
      1
    )
  );
}

/** The spread of the focus ring: the shadow layer that is not the inset underline. */
function ring(element: Element): number {
  return length(
    shadows(element).find((shadow) => !shadow.includes('inset')),
    3
  );
}

function layer(element: Element): number {
  return parseInt(getComputedStyle(element).zIndex, 10);
}

/** A public layer as the theme declares it. */
function token(property: string): number {
  return parseInt(getComputedStyle(document.documentElement).getPropertyValue(property), 10);
}

const textbox = () => page.getByRole('textbox', { name: 'Name' });
const group = () => page.getByRole('radiogroup', { name: 'Name' });
const combobox = () => page.getByRole('combobox', { name: 'Name' });

/** Binds a decorated field labelled `Name`. */
const bind = (kind: 'input' | 'radio-group' | 'dropdown', options: BindFieldOptions = {}, position = 'outside') =>
  bindField(kind, 'signal', {
    decorated: true,
    decoration: `<div formidableFieldLabel position="${position}">Name</div>`,
    ...options
  });

/** Binds a group whose options a user can click, which focuses it. */
const bindGroup = (options: BindFieldOptions = {}) =>
  bind('radio-group', { ...options, inputs: { options: OPTIONS, ...options.inputs } });

const focusGroup = () => userEvent.click(page.getByRole('radio', { name: 'Alpha' }));

/**
 * Overrides a variable below `:root`, on the fixture's host, so every test using it also proves the override
 * survives being set somewhere other than the document root.
 */
function local(field: BoundField, property: string, value: string): void {
  (field.fixture.nativeElement as HTMLElement).style.setProperty(property, value);
}

describe('border geometry', () => {
  beforeEach(() => {
    configureFormidableTestBed();
    // The ring and the underline transition, so a read straight after focus would land part-way.
    theme('--formidable-animation-duration', '0s');
  });

  describe('per-corner radius', () => {
    let field: BoundField;

    // A field box, beside a toggle that is rounded without being one.
    beforeEach(async () => {
      field = await bind('input', { after: '<formidable-toggle-field />' });
    });

    const input = () => textbox().element();
    const toggleTrack = () => page.getByRole('switch').element().querySelector('.toggle-track')!;
    const base = () => radiusOf(field.element, '--formidable-border-radius')[0];

    it('defaults every corner to the field radius', () => {
      local(field, '--formidable-field-border-radius', '8px');

      expect(corners(input())).toEqual(['8px', '8px', '8px', '8px']);
    });

    // A theme wanting a top-rounded field names the two corners it wants; the rest keep the field radius.
    it('takes each corner on its own', () => {
      local(field, '--formidable-field-border-radius', '8px');
      local(field, '--formidable-field-border-end-start-radius', '0px');
      local(field, '--formidable-field-border-end-end-radius', '0px');

      expect(corners(input())).toEqual(['8px', '8px', '0px', '0px']);
    });

    // The corner properties are read at the use site rather than declared in `:root` precisely so this
    // works: a `var()` in a custom property's *value* is substituted where that property is declared, so
    // routing the field radius through a `:root` declaration would freeze it there and quietly ignore an
    // override set further down the tree. This is the test that fails the day someone "tidies that up".
    it('follows a radius set on the field itself', () => {
      (input() as HTMLElement).style.setProperty('--formidable-field-border-radius', '9px');

      expect(corners(input())).toEqual(['9px', '9px', '9px', '9px']);
    });

    it('keeps that shape off everything that is not a field box', () => {
      local(field, '--formidable-field-border-radius', '8px');
      local(field, '--formidable-field-border-end-start-radius', '0px');

      const shared = [base(), base(), base(), base()];
      const host = field.fixture.nativeElement as HTMLElement;

      expect(radiusOf(host, '--formidable-toggle-field-track-border-radius')).toEqual(shared);
      expect(radiusOf(host, '--formidable-toggle-field-thumb-border-radius')).toEqual(shared);
      expect(radiusOf(host, '--formidable-slider-track-border-radius')).toEqual(shared);
      expect(radiusOf(host, '--formidable-slider-thumb-border-radius')).toEqual(shared);
      expect(radiusOf(host, '--formidable-slider-thumb-label-border-radius')).toEqual(shared);
      expect(radiusOf(host, '--formidable-slider-tick-mark-border-radius')).toEqual(shared);
      expect(radiusOf(host, '--formidable-panel-border-radius')).toEqual(shared);
      // and the elements really do read those tokens, not the field's
      expect(corners(toggleTrack())).toEqual(shared);
    });

    it('rounds the whole library from the shared base', () => {
      theme('--formidable-border-radius', '3px');

      expect(corners(input())).toEqual(['3px', '3px', '3px', '3px']);
      expect(corners(toggleTrack())).toEqual(['3px', '3px', '3px', '3px']);
      expect(radiusOf(field.element, '--formidable-panel-border-radius')).toEqual(['3px', '3px', '3px', '3px']);
    });

    // The tick mark's radius used to fall back to the border *thickness*, which made its own token
    // unreachable and reshaped it whenever a theme changed the border.
    it('leaves the tick mark alone when the border thickness changes', () => {
      const shared = [base(), base(), base(), base()];

      theme('--formidable-field-border-thickness', '5px');

      expect(radiusOf(field.element, '--formidable-slider-tick-mark-border-radius')).toEqual(shared);
    });
  });

  describe('underline', () => {
    const input = () => textbox().element();

    it('paints nothing by default', async () => {
      await bind('input');

      expect(underline(input())).toBe(0);

      await userEvent.click(textbox());
      await expect.element(textbox()).toHaveFocus();

      expect(underline(input())).toBe(0);
    });

    it('thickens on focus, in its own colour', async () => {
      const field = await bind('input');

      local(field, '--formidable-field-underline-thickness', '1px');
      local(field, '--formidable-field-underline-thickness-focus', '3px');
      local(field, '--formidable-color-field-underline-focus', 'rgb(1, 2, 3)');

      expect(underline(input())).toBe(1);

      await userEvent.click(textbox());

      await expect.poll(() => underline(input())).toBe(3);
      expect(getComputedStyle(input()).boxShadow).toContain('rgb(1, 2, 3)');
    });

    // A focused field is touched by definition, so focused-and-invalid is the common case. `invalid-colors`
    // has to point focus's own variables at the invalid ones, exactly as it does for the border colours.
    it('lets invalid outrank focus', async () => {
      const field = await bind('input', { inputs: { revealOn: 'always' }, state: { invalid: true } });

      local(field, '--formidable-field-underline-thickness-focus', '3px');
      local(field, '--formidable-field-underline-thickness-invalid', '5px');

      expect(underline(input())).toBe(5);

      await userEvent.click(textbox());
      await expect.element(textbox()).toHaveFocus();

      expect(underline(input())).toBe(5);
    });

    // The whole reason it is a shadow and not a `border-bottom-width`: a real border would take its
    // thickness out of the content box, and every state that changed it would move the value with it.
    it('moves nothing when a state thickens it', async () => {
      const field = await bind('input', {}, 'inside-floating');
      const label = () => (input() as HTMLInputElement).labels![0]!;

      local(field, '--formidable-field-underline-thickness-focus', '5px');

      const box = input().getBoundingClientRect();
      const content = input().clientHeight;
      const labelTop = label().getBoundingClientRect().top;

      await userEvent.click(textbox());

      await expect.poll(() => underline(input())).toBe(5);
      expect(input().clientHeight).toBe(content);
      expect(input().getBoundingClientRect().height).toBeCloseTo(box.height, 2);
      expect(label().getBoundingClientRect().top).toBeCloseTo(labelTop, 2);
    });

    it('goes with the border when a state hides it', async () => {
      const field = await bind('input');

      local(field, '--formidable-field-underline-thickness', '2px');
      local(field, '--formidable-color-field-border-readonly', 'rgb(9, 8, 7)');

      await field.state({ readonly: true });

      expect(getComputedStyle(input()).boxShadow).toContain('rgb(9, 8, 7)');
    });

    // A group is a tall multi-row box, so a line across its bottom reads as a divider between its options
    // rather than as the field's own edge. It takes the focus ring and nothing else, whatever a theme asks
    // for — which is why the thicknesses below are set and then not expected to show up anywhere.
    it('never reaches a group, however thick a theme sets it', async () => {
      const field = await bindGroup();

      local(field, '--formidable-field-underline-thickness', '4px');
      local(field, '--formidable-field-underline-thickness-focus', '6px');

      expect(underline(group().element())).toBe(0);

      await focusGroup();

      // …and losing the underline did not cost it the focus ring, which shares the same declaration
      await expect.poll(() => ring(group().element())).toBeGreaterThan(0);
      expect(underline(group().element())).toBe(0);
    });
  });

  /**
   * The ring's width used to be buried inside three colour-named composites, each of them literally
   * `0 0 0 <a border thickness> <colour>`. A theme that wanted a wider ring — or any ring at all on a
   * borderless field — had to restate all three. It is one length now, and the composites are colour only.
   */
  describe('the focus ring', () => {
    it('follows the border thickness by default', async () => {
      theme('--formidable-field-border-thickness', '3px');
      await bind('input');

      await userEvent.click(textbox());

      await expect.poll(() => ring(textbox().element())).toBe(3);
    });

    // The bug: a borderless theme had no ring at all, and no way to ask for one short of restating the
    // whole composite. The border stays at `0px` throughout, so only the ring's own width can be read here.
    it('is reachable on a borderless field', async () => {
      theme('--formidable-field-border-thickness', '0px');
      await bind('input');

      await userEvent.click(textbox());
      await expect.element(textbox()).toHaveFocus();

      expect(ring(textbox().element())).toBe(0);

      theme('--formidable-field-focus-ring-width', '2px');

      expect(ring(textbox().element())).toBe(2);
    });

    // A focused field keeps its ring while invalid, so the invalid composite carries the width as well.
    it('keeps that width while invalid', async () => {
      theme('--formidable-field-border-thickness', '0px');
      theme('--formidable-field-focus-ring-width', '2px');
      await bind('input', { inputs: { revealOn: 'always' }, state: { invalid: true } });

      await userEvent.click(textbox());

      await expect.poll(() => ring(textbox().element())).toBe(2);
    });

    // A group has no underline to fall back on, and no ring until it is focused.
    it('takes that width on an invalid group too, once focused', async () => {
      theme('--formidable-field-border-thickness', '0px');
      theme('--formidable-field-focus-ring-width', '2px');
      await bindGroup({ inputs: { revealOn: 'always' }, state: { invalid: true } });

      expect(ring(group().element())).toBe(0);

      await focusGroup();

      await expect.poll(() => ring(group().element())).toBe(2);
    });

    // One width for every ring the library paints. The group's composite used to size itself off the
    // group's *border*, which made the width two concepts and left a borderless group ring unreachable
    // without thickening a border the theme had deliberately removed.
    it('is one width, not one per family', async () => {
      theme('--formidable-field-border-thickness', '0px');
      theme('--formidable-field-group-border-thickness', '4px');
      theme('--formidable-field-focus-ring-width', '2px');
      await bindGroup();

      await focusGroup();

      await expect.poll(() => ring(group().element())).toBe(2);
    });
  });

  describe('with a panel', () => {
    const spacer = '<div style="height: 100vh"></div>';

    /** Binds a dropdown under a `border` label. */
    const bindDropdown = (options: BindFieldOptions = {}) =>
      bind('dropdown', { ...options, inputs: { options: OPTIONS, ...options.inputs } }, 'border');

    const box = (field: BoundField) => field.element.querySelector<HTMLElement>('.field')!;
    const panel = (field: BoundField) => field.element.querySelector<HTMLElement>('.panel')!;
    const decorator = (field: BoundField) => field.element.closest('formidable-field-decorator')!;
    const label = () => (combobox().element() as HTMLInputElement).labels![0]!;
    const centre = (element: Element) =>
      element.getBoundingClientRect().top + element.getBoundingClientRect().height / 2;

    /** Opens the panel as a user does. The display input takes no pointer events, so the field takes the click. */
    async function open(): Promise<void> {
      await userEvent.click(combobox(), { force: true });
      await expect.element(combobox()).toHaveAttribute('aria-expanded', 'true');
    }

    /** Binds the dropdown just above the fold and opens it, so its panel has no room below and flips above. */
    async function openAbove(options: BindFieldOptions = {}): Promise<BoundField> {
      const field = await bindDropdown({ before: spacer, after: spacer, ...options });

      window.scrollBy(0, box(field).getBoundingClientRect().bottom - innerHeight + 8);
      await open();
      await expect.poll(() => centre(panel(field)) < centre(box(field))).toBe(true);

      return field;
    }

    describe('panel corner mirroring', () => {
      // Distinct radii throughout, so an assertion cannot pass by the two happening to agree.
      beforeEach(() => {
        theme('--formidable-field-border-radius', '8px');
        theme('--formidable-panel-border-radius', '2px');
      });

      // What gating the mirroring on `open` buys: a closed panel is still laid out, and has no field to
      // agree with yet.
      it('keeps its own corners while closed', async () => {
        const field = await bindDropdown();

        expect(corners(panel(field))).toEqual(['2px', '2px', '2px', '2px']);
      });

      it('adopts the field bottom corners onto its top ones when it opens below', async () => {
        const field = await bindDropdown();

        await open();

        expect(corners(panel(field))).toEqual(['8px', '8px', '2px', '2px']);
      });

      it('adopts the field top corners onto its bottom ones when it flips above', async () => {
        theme('--formidable-field-border-start-start-radius', '4px');
        theme('--formidable-field-border-start-end-radius', '4px');

        const field = await openAbove();

        // The top pair goes back to the panel's own radius, and the bottom pair takes the field's *top*
        // corners — not the bottom ones it would have mirrored below.
        expect(corners(panel(field))).toEqual(['2px', '2px', '4px', '4px']);
      });

      it('mirrors a single corner the field shapes on its own', async () => {
        theme('--formidable-field-border-end-start-radius', '10px');
        const field = await bindDropdown();

        await open();

        expect(corners(panel(field))).toEqual(['10px', '8px', '2px', '2px']);
      });

      // The panel is a child of the field, so the cascade reaches it wherever the radius was set.
      it('follows a radius set on the field element itself', async () => {
        const field = await bindDropdown();

        box(field).style.setProperty('--formidable-field-border-radius', '9px');
        await open();

        expect(corners(panel(field))).toEqual(['9px', '9px', '2px', '2px']);
      });

      // The point of the rework: mirroring runs one way. A field that squared its own corners for a panel
      // put a squared corner wherever the panel's far edge happened to fall — which, under a shrink-wrapped
      // `panel-left`, was most of a field's width away from anything.
      it('never reshapes the field', async () => {
        const field = await bindDropdown();

        await open();

        expect(corners(box(field))).toEqual(['8px', '8px', '8px', '8px']);
      });
    });

    /**
     * A panel is outlined by its own border, so a theme that dropped the field's border to go underlined lost
     * every panel's outline with it and was left with the box-shadow alone. The alignments still read the
     * *field's* thickness — they put the panel's box on the field's border-box edges, which is the field's
     * geometry and not the panel's — so the two are independent and the panel's own border paints inside.
     */
    describe("a panel's border", () => {
      const thickness = (element: Element) => parseFloat(getComputedStyle(element).borderTopWidth);

      it('follows the field thickness by default', async () => {
        theme('--formidable-field-border-thickness', '3px');
        const field = await bindDropdown();

        expect(thickness(panel(field))).toBe(3);
      });

      // The bug, pinned: borderless erased the outline, and the hatch is the only way back.
      it('survives a borderless field', async () => {
        theme('--formidable-field-border-thickness', '0px');
        const field = await bindDropdown();

        expect(thickness(panel(field))).toBe(0);

        theme('--formidable-panel-border-thickness', '1px');

        expect(thickness(panel(field))).toBe(1);
      });

      it('can be dropped on its own, leaving the field its border', async () => {
        const field = await bindDropdown();
        const own = thickness(box(field));

        theme('--formidable-panel-border-thickness', '0px');

        expect(thickness(panel(field))).toBe(0);
        expect(own).toBeGreaterThan(0);
        expect(thickness(box(field))).toBe(own);
      });

      // Written out at the use site rather than declared in `:root` for the reason `field-radius()` gives: a
      // `var()` in a custom property's *value* is substituted where that property is declared, so routing the
      // chain through `:root` would freeze it there and quietly ignore a thickness set further down the tree.
      // This is the test that fails the day someone "tidies that up".
      it('follows a field thickness set below the document root', async () => {
        const field = await bindDropdown();

        box(field).style.setProperty('--formidable-field-border-thickness', '4px');

        expect(thickness(panel(field))).toBe(4);
      });

      // The alignments size the panel's box to the field's border box, so a panel border of its own has to
      // paint inside that box. Without `box-sizing: border-box` it was added on top, and every panel sat two
      // of its own borders wider than the field it belonged to.
      it('paints inside the width the alignment gave it', async () => {
        theme('--formidable-panel-border-thickness', '5px');
        const field = await bindDropdown();

        await open();

        expect(panel(field).getBoundingClientRect().width).toBeCloseTo(box(field).getBoundingClientRect().width, 1);
      });
    });

    /**
     * A flipped panel's bottom edge lands on the field's top border-box edge, which is the one stretch of the
     * field a `border` label reaches above. Both live inside the decorator's own stacking context, so the
     * ordinals alone decide, and they are the same ordinals whatever the consumer's page is doing.
     */
    describe('a border label against a flipped panel', () => {
      it('really is overlapped by the panel it has to beat', async () => {
        const field = await openAbove();

        // The panel's rect covers everything the label has above the field's top edge — its band included.
        expect(panel(field).getBoundingClientRect().bottom).toBeGreaterThan(label().getBoundingClientRect().top);
      });

      it('paints over it', async () => {
        const field = await openAbove();

        expect(layer(label())).toBeGreaterThan(layer(panel(field)));
      });

      // The ordinals are private: they order the atom's own contents and mean nothing outside it, so no
      // public variable may move them.
      it('keeps its ordinal whatever the public variables are set to', async () => {
        const field = await openAbove();
        const ordinals = [layer(panel(field)), layer(label())];

        theme('--formidable-panel-z-index', '7');
        theme('--formidable-sheet-z-index', '9');

        expect([layer(panel(field)), layer(label())]).toEqual(ordinals);
      });

      // A sheet spans the viewport and covers whatever is behind it, its own field's border label included.
      it('still yields to a sheet', async () => {
        const field = await bindDropdown({ inputs: { panelPosition: 'sheet' } });

        await open();

        expect(layer(panel(field))).toBeGreaterThan(layer(label()));
      });
    });

    /**
     * The reason the ordinals can stay small: the decorator is a stacking context, so a closed field cannot
     * reach anything a consumer stacks around it — and an open panel rises as a whole rather than by leaking
     * one part of itself upwards.
     */
    describe('the atom', () => {
      it('is a stacking context, so nothing inside it competes with the page', async () => {
        const field = await bindDropdown();

        expect(getComputedStyle(decorator(field)).isolation).toBe('isolate');
      });

      // The defect this architecture exists for: a `border` label used to carry z-index 1000 in the *page's*
      // stacking context, so it painted over a consumer's sticky chrome even with the field closed.
      it('carries no z-index of its own while closed', async () => {
        const field = await bindDropdown();

        expect(getComputedStyle(decorator(field)).zIndex).toBe('auto');
      });

      it('rises to the panel layer while an anchored panel is open', async () => {
        const field = await bindDropdown();

        await open();

        expect(layer(decorator(field))).toBe(token('--formidable-panel-z-index'));
      });

      it('rises to the sheet layer instead when the panel is a sheet', async () => {
        const field = await bindDropdown({ inputs: { panelPosition: 'sheet' } });

        await open();

        expect(token('--formidable-sheet-z-index')).not.toBe(token('--formidable-panel-z-index'));
        expect(layer(decorator(field))).toBe(token('--formidable-sheet-z-index'));
      });

      it('drops back to no z-index once the panel closes', async () => {
        const field = await bindDropdown();

        await open();
        await userEvent.keyboard('{Escape}');

        await expect.element(combobox()).toHaveAttribute('aria-expanded', 'false');
        expect(getComputedStyle(decorator(field)).zIndex).toBe('auto');
      });

      it('takes both layers from the theme', async () => {
        theme('--formidable-panel-z-index', '40');
        theme('--formidable-sheet-z-index', '60');
        const field = await bindDropdown({ inputs: { panelPosition: 'full' } });

        await open();

        expect(layer(decorator(field))).toBe(40);

        await field.set('panelPosition', 'sheet');

        expect(layer(decorator(field))).toBe(60);
      });
    });
  });
});
