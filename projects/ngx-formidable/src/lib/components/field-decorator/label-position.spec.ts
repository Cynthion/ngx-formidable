import { page, userEvent } from 'vitest/browser';
import { FieldLabelPosition } from '../../models/formidable.model';
import { bindField, BindFieldOptions, BoundField, FieldKind } from '../../testing/bind-field';
import { theme } from '../../testing/dom';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';

/**
 * Per **Labels** in `user/decoration.md`. An `outside` label sits above the field and never moves; every other
 * position renders the label over the field. With the label `inside`, a resting label stands centred in the
 * field at the value's own size, a floating one stacks with the value as one centred block, and the label
 * rests only while nothing occupies the value area. A `border` label straddles the top border and leaves the
 * value centred, as `outside` does; `border-prefix` aligns with a projected prefix instead of with the value.
 * Only the `horizontal` layout has room over the field.
 *
 * Every expectation relates what the browser laid out: the label's box, and the value's line box, derived the
 * way the browser centres it in the editor's content box. None is a length computed from the default theme.
 */

/** Every position that renders the label over the field. */
const OVER_FIELD: FieldLabelPosition[] = ['inside', 'inside-placeholder', 'inside-floating', 'border', 'border-prefix'];

const PREFIX = '<div formidableFieldPrefix style="width: 4rem">Prefix</div>';

const rect = (element: Element) => element.getBoundingClientRect();
const centre = (element: Element) => rect(element).top + rect(element).height / 2;

const textbox = (name = 'Name') => page.getByRole('textbox', { name });
const editor = (name = 'Name') => textbox(name).element() as HTMLInputElement;

/** The label that names the editor. */
const label = (named: HTMLInputElement = editor()) => named.labels![0]!;

/** A resting label stands centred in the field; a floating one above it. */
const floats = (named: HTMLInputElement = editor()) => centre(label(named)) < centre(named) - 1;

/** The field's box: the editor itself, or the box a panel field wraps its editor in. */
const box = (named: Element) => named.closest('.field')!;

/** Inside the box's border, where the label and the value share its height. */
function inner(named: Element): { top: number; bottom: number } {
  const style = getComputedStyle(box(named));

  return {
    top: rect(box(named)).top + parseFloat(style.borderTopWidth),
    bottom: rect(box(named)).bottom - parseFloat(style.borderBottomWidth)
  };
}

/** The value's line box, centred in the editor's content box as the browser places it. */
function valueLine(named: Element): { top: number; bottom: number } {
  const style = getComputedStyle(named);
  const paddingTop = parseFloat(style.paddingTop);
  const content = named.clientHeight - paddingTop - parseFloat(style.paddingBottom);
  const top =
    rect(named).top + parseFloat(style.borderTopWidth) + paddingTop + (content - parseFloat(style.lineHeight)) / 2;

  return { top, bottom: top + parseFloat(style.lineHeight) };
}

/** Where the value's text starts: the border and the padding sit between it and the editor's edge. */
function valueLeft(named: Element): number {
  const style = getComputedStyle(named);

  return rect(named).left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
}

/** Where the label's own text starts, discounting the gap its band reaches out by. */
function labelTextLeft(named: HTMLInputElement = editor()): number {
  return rect(label(named)).left + parseFloat(getComputedStyle(label(named)).paddingLeft);
}

/** The value alone is centred: as much room above its line as below it. */
function expectCentredValue(named: Element = editor()): void {
  expect(valueLine(named).top - inner(named).top).toBeCloseTo(inner(named).bottom - valueLine(named).bottom, 1);
}

/** The floating label and the value form one block, centred: the label ends where the value starts. */
function expectOneBlock(named: HTMLInputElement = editor()): void {
  const above = rect(label(named)).top - inner(named).top;

  expect(rect(label(named)).bottom).toBeCloseTo(valueLine(named).top, 1);
  expect(above).toBeGreaterThan(0);
  expect(inner(named).bottom - valueLine(named).bottom).toBeCloseTo(above, 1);
}

/** The label centred on the field's top border. */
function expectStraddled(named: HTMLInputElement = editor()): void {
  const border = parseFloat(getComputedStyle(named).borderTopWidth);

  expect(centre(label(named))).toBeCloseTo(rect(named).top + border / 2, 1);
}

/** Binds a decorated field labelled `Name` at `position`, with `decoration` beside the label. */
function bind(
  position: FieldLabelPosition,
  options: BindFieldOptions & { kind?: FieldKind } = {}
): Promise<BoundField> {
  const { kind = 'input', decoration = '', ...rest } = options;

  return bindField(kind, 'signal', {
    decorated: true,
    decoration: `<div formidableFieldLabel position="${position}">Name</div>${decoration}`,
    after: '<button type="button">Next</button>',
    ...rest
  });
}

describe('formidableFieldLabel [position]', () => {
  beforeEach(() => {
    configureFormidableTestBed();
    // The label animates its `top`, so a read straight after a change would land part-way. These are about
    // where it lands.
    theme('--formidable-animation-duration', '0s');
  });

  describe('outside', () => {
    it('sits above the field, which centres its value', async () => {
      await bind('outside');

      expect(rect(label()).bottom).toBeLessThanOrEqual(rect(editor()).top);
      expectCentredValue();
    });

    it('never moves, whatever the field does', async () => {
      const field = await bind('outside');
      const top = rect(label()).top;

      await userEvent.type(textbox(), 'anything');
      await expect.element(textbox()).toHaveValue('anything');
      await settle(field.fixture);

      expect(rect(label()).top).toBe(top);
    });
  });

  describe('inside — geometry', () => {
    // Where an empty field's value would sit under an `outside` label.
    it('rests centred in the field, at the value’s own size', async () => {
      await bind('inside');

      expect(rect(label()).height).toBeCloseTo(parseFloat(getComputedStyle(editor()).lineHeight), 1);
      expect(rect(label()).top - inner(editor()).top).toBeCloseTo(inner(editor()).bottom - rect(label()).bottom, 1);
    });

    it('floats with the value as one centred block once focused', async () => {
      await bind('inside');

      await userEvent.click(textbox());
      await expect.poll(() => floats()).toBe(true);

      expectOneBlock();
    });

    it('stays on one line and ellipsizes', async () => {
      const text = 'A label far too long to ever fit on one line of the field it names';

      await bindField('input', 'signal', {
        decorated: true,
        decoration: `<div formidableFieldLabel position="inside">${text}</div>`
      });
      const projected = page.getByText(text).element();

      expect(rect(label(editor(text))).height).toBeCloseTo(parseFloat(getComputedStyle(editor(text)).lineHeight), 1);
      expect(projected.scrollWidth).toBeGreaterThan(projected.clientWidth);
      expect(getComputedStyle(projected).textOverflow).toBe('ellipsis');
    });

    it('bounds the label to the value’s own horizontal band', async () => {
      await bind('inside');

      const style = getComputedStyle(editor());
      const inset = parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);

      expect(rect(label()).left).toBeCloseTo(valueLeft(editor()), 1);
      expect(rect(label()).left - rect(editor()).left).toBeCloseTo(inset, 1);
      expect(rect(editor()).right - rect(label()).right).toBeCloseTo(inset, 1);
    });

    // Below the documented `44px` floor the label and the value no longer fit; the field overflows instead.
    it('never rises out of a field shorter than the height floor', async () => {
      await bind('inside');

      await userEvent.click(textbox());
      await expect.poll(() => floats()).toBe(true);

      // the control: at the default height there is slack to distribute, and the label floats below the top
      expect(rect(label()).top).toBeGreaterThan(inner(editor()).top);

      theme('--formidable-field-height', '32px');

      expect(rect(label()).top).toBeCloseTo(inner(editor()).top, 1);
    });
  });

  describe('inside — when the label may rest', () => {
    it('rests while the field is empty and unfocused', async () => {
      await bind('inside');

      expect(floats()).toBe(false);
    });

    it('floats while focused', async () => {
      await bind('inside');

      await userEvent.click(textbox());

      await expect.poll(() => floats()).toBe(true);
    });

    it('keeps floating once filled and left', async () => {
      const field = await bind('inside');

      await userEvent.type(textbox(), 'Chris');
      await userEvent.tab();
      await expect.element(page.getByRole('button', { name: 'Next' })).toHaveFocus();
      await settle(field.fixture);

      expect(floats()).toBe(true);
    });

    it('floats instead of resting when a placeholder occupies the value area', async () => {
      await bind('inside', { inputs: { placeholder: 'Your name' } });

      expect(floats()).toBe(true);
    });

    it('floats instead of resting when mask slots occupy the value area', async () => {
      await bind('inside', { inputs: { mask: '000-000', maskConfig: { showMaskTyped: true } } });

      expect(floats()).toBe(true);
    });

    it('still rests behind a mask that hides its slots while empty', async () => {
      await bind('inside', { inputs: { mask: '000-000' } });

      expect(floats()).toBe(false);
    });
  });

  // The one position that does not yield the value area to the placeholder: the label takes its place
  // and the field's own placeholder stays hidden behind it until focus floats the label off it.
  describe('inside-placeholder', () => {
    const placeholderColour = () => getComputedStyle(editor(), '::placeholder').color;

    it('rests in place of the placeholder, and hides it', async () => {
      await bind('inside-placeholder', { inputs: { placeholder: 'Your name' } });

      expect(floats()).toBe(false);
      expect(placeholderColour()).toBe('rgba(0, 0, 0, 0)');
    });

    it('reveals the placeholder once focus floats the label', async () => {
      await bind('inside-placeholder', { inputs: { placeholder: 'Your name' } });

      await userEvent.click(textbox());

      await expect.poll(() => floats()).toBe(true);
      expect(placeholderColour()).not.toBe('rgba(0, 0, 0, 0)');
    });

    // Only the placeholder is the label's to take over. Mask slots are the field's own rendering.
    it('still floats when mask slots occupy the value area', async () => {
      await bind('inside-placeholder', {
        inputs: { placeholder: 'Your name', mask: '000-000', maskConfig: { showMaskTyped: true } }
      });

      expect(floats()).toBe(true);
    });
  });

  describe('inside-floating', () => {
    it('never rests, however empty the field is', async () => {
      await bind('inside-floating');

      expect(floats()).toBe(true);
      expectOneBlock();
    });

    it('stays put when the field is focused and filled', async () => {
      const field = await bind('inside-floating');
      const top = rect(label()).top;

      await userEvent.type(textbox(), 'Chris');
      await expect.element(textbox()).toHaveValue('Chris');
      await settle(field.fixture);

      expect(rect(label()).top).toBeCloseTo(top, 1);
    });
  });

  for (const position of ['border', 'border-prefix'] as FieldLabelPosition[]) {
    describe(`${position}, on the border`, () => {
      it('straddles the field’s top border', async () => {
        await bind(position);

        expectStraddled();
      });

      it('leaves the value centred, as outside does', async () => {
        await bind(position);

        expectCentredValue();
      });

      it('stays on the border, however the field is filled', async () => {
        const field = await bind(position);

        await userEvent.type(textbox(), 'Chris');
        await expect.element(textbox()).toHaveValue('Chris');
        await settle(field.fixture);

        expectStraddled();
      });
    });
  }

  describe('border', () => {
    /** How far the band reaches above the label's own centre, in px, resolved on the label. */
    function bandReach(): number {
      const probe = document.createElement('div');

      probe.style.position = 'absolute';
      probe.style.width = 'var(--formidable-label-border-band-reach)';
      label().appendChild(probe);

      const width = rect(probe).width;
      probe.remove();

      return width;
    }

    const band = () => getComputedStyle(label()).backgroundImage;

    it('starts its text where the value starts', async () => {
      await bind('border');

      expect(labelTextLeft()).toBeCloseTo(valueLeft(editor()), 1);
    });

    // A label spanning the field would hide the whole border; this one hugs its text and a gap either side.
    it('shrink-wraps, so its band hides only the border it covers', async () => {
      await bind('border');
      const range = document.createRange();
      const style = getComputedStyle(label());

      range.selectNodeContents(page.getByText('Name').element());

      expect(parseFloat(style.paddingLeft)).toBeGreaterThan(0);
      expect(rect(label()).width).toBeCloseTo(
        range.getBoundingClientRect().width + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight),
        0
      );
    });

    it('paints a band to hide the border behind it', async () => {
      await bind('border');

      expect(band()).toContain('linear-gradient');
    });

    // The focus ring is a box-shadow spread *outside* the field's border box, so while focused there is
    // more to hide above the border than below it. Without the extra reach the band stops at its bleed
    // and the ring shows above the label on every theme whose border is thicker than that bleed.
    it('reaches up over the focus ring while focused', async () => {
      theme('--formidable-field-focus-ring-width', '3px');
      await bind('border');
      const resting = band();

      expect(bandReach()).toBe(0);

      await userEvent.click(textbox());

      await expect.poll(bandReach).toBeCloseTo(3, 2);
      expect(band()).not.toBe(resting);
    });

    // It covers the *ring*, so it is sized off the ring's own width rather than off the border. The two are
    // set apart here so the assertion can only pass one way: a reach still reading the border returns 3.
    it('reaches as far as the ring, not as far as the border', async () => {
      theme('--formidable-field-border-thickness', '3px');
      theme('--formidable-field-focus-ring-width', '6px');
      await bind('border');

      await userEvent.click(textbox());

      await expect.poll(bandReach).toBeCloseTo(6, 2);
    });

    // A theme reaches the band in both states, focused as well as at rest.
    it('takes a themed reach, at rest and focused', async () => {
      theme('--formidable-label-border-band-reach', '4px');
      theme('--formidable-label-border-band-reach-focus', '7px');
      await bind('border');

      expect(bandReach()).toBeCloseTo(4, 2);

      await userEvent.click(textbox());

      await expect.poll(bandReach).toBeCloseTo(7, 2);
    });

    // `readonly`/`disabled` remap the fill on the field element, which the label — a sibling — cannot see,
    // so the band follows a variable of its own that the decorator's host remaps instead.
    it('repaints its band when the field remaps its fill', async () => {
      const field = await bind('border');
      const fill = band();

      await field.state({ readonly: true });

      expect(band()).toContain('linear-gradient');
      expect(band()).not.toBe(fill);
    });
  });

  describe('beside a prefix wide enough to push the value in', () => {
    const prefix = () => page.getByText('Prefix').element();

    it('follows the value inwards', async () => {
      await bind('inside', { decoration: PREFIX });

      expect(valueLeft(editor())).toBeGreaterThanOrEqual(rect(prefix()).right);
      expect(rect(label()).left).toBeCloseTo(valueLeft(editor()), 1);
    });

    it('follows the value inwards for a border label too', async () => {
      await bind('border', { decoration: PREFIX });

      expect(valueLeft(editor())).toBeGreaterThanOrEqual(rect(prefix()).right);
      expect(labelTextLeft()).toBeCloseTo(valueLeft(editor()), 1);
    });

    it('aligns with the prefix, not the value, when the position says so', async () => {
      await bind('border-prefix', { decoration: PREFIX });

      expect(valueLeft(editor())).toBeGreaterThanOrEqual(rect(prefix()).right);
      expect(labelTextLeft()).toBeCloseTo(rect(prefix()).left, 1);
    });
  });

  // An adornment decorates the label, so on its own it would be stranded above a field it no longer belongs to.
  describe('the row above the field', () => {
    const decorator = (field: BoundField) => field.element.closest('formidable-field-decorator')!;
    const adornment = () => page.getByText('Help');

    it('holds an outside label and its adornment', async () => {
      const field = await bind('outside', { decoration: '<div formidableFieldLabelAdornment>Help</div>' });

      await expect.element(adornment()).toBeVisible();
      expect(rect(editor()).top).toBeGreaterThan(rect(decorator(field)).top);
    });

    for (const position of OVER_FIELD) {
      it(`goes, adornment and all, once the label is ${position}`, async () => {
        const field = await bind(position, { decoration: '<div formidableFieldLabelAdornment>Help</div>' });

        await expect.element(adornment()).not.toBeVisible();
        expect(rect(editor()).top).toBeCloseTo(rect(decorator(field)).top, 1);
      });
    }
  });

  // A textarea top-aligns its value, so it clears the label with an offset rather than by centring.
  it('starts a textarea’s first line where an inside label ends', async () => {
    await bind('inside', { kind: 'textarea' });

    await userEvent.click(textbox());
    await expect.poll(() => floats()).toBe(true);

    const style = getComputedStyle(editor());

    expect(rect(label()).bottom).toBeCloseTo(
      rect(editor()).top + parseFloat(style.borderTopWidth) + parseFloat(style.paddingTop),
      1
    );
  });

  it('falls back to outside for a field with no room for a label over it', async () => {
    await bind('inside', { kind: 'radio-group', inputs: { options: [{ value: 'a', label: 'Alpha' }] } });

    expect(rect(page.getByText('Name').element()).bottom).toBeLessThanOrEqual(
      rect(page.getByRole('radiogroup', { name: 'Name' }).element()).top
    );
  });
});

/**
 * A panel field's value lives in an inner input, which the field's own padding cannot reach — so whatever the
 * user agent puts on that input (Chrome: `padding: 1px 2px`) is left holding the value, and offsets it from
 * the inset the label is anchored to.
 */
describe('a value rendered in a wrapped input', () => {
  beforeEach(() => {
    configureFormidableTestBed();
    theme('--formidable-animation-duration', '0s');
  });

  for (const [kind, role] of [
    ['date', 'combobox'],
    ['time', 'textbox'],
    ['autocomplete', 'combobox'],
    ['dropdown', 'combobox']
  ] as const) {
    describe(`of a ${kind} field`, () => {
      const wrapped = () => page.getByRole(role, { name: 'Name' }).element() as HTMLInputElement;

      it('starts its value exactly where the label starts', async () => {
        await bind('inside-floating', { kind });

        expect(valueLeft(wrapped())).toBeCloseTo(rect(label(wrapped())).left, 1);
      });

      it('stacks the floating label and the value as one block', async () => {
        await bind('inside-floating', { kind });

        expectOneBlock(wrapped());
      });
    });
  }
});

describe('a label over a field that always shows something in its value area', () => {
  beforeEach(() => {
    configureFormidableTestBed();
    theme('--formidable-animation-duration', '0s');
  });

  for (const [kind, role] of [
    ['date', 'combobox'],
    ['time', 'textbox']
  ] as const) {
    it(`floats over an empty ${kind} field, which always shows its mask slots`, async () => {
      await bind('inside', { kind });

      expect(floats(page.getByRole(role, { name: 'Name' }).element() as HTMLInputElement)).toBe(true);
    });
  }

  it('rests over a select field with nothing selected, which shows no option in its place', async () => {
    await bind('inside', { kind: 'select' });

    expect(floats(page.getByRole('combobox', { name: 'Name' }).element() as HTMLInputElement)).toBe(false);
  });
});
