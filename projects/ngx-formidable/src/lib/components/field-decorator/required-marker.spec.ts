import { page } from 'vitest/browser';
import { FORMIDABLE_DEFAULTS, FieldLabelPosition } from '../../models/formidable.model';
import { bindField, BindFieldOptions, BoundField, FORMS_APIS, FormsApi } from '../../testing/bind-field';
import { theme } from '../../testing/dom';
import { configureFormidableTestBed } from '../../testing/test-bed';

/**
 * Per **The Required Marker** in `user/decoration.md`: a field whose `required` is true suffixes a marker to its
 * label, whichever forms API sets it. The glyph is a theme variable, it is never what a label too long to
 * fit cuts off, and it is hidden from assistive technology. `hideRequiredMarkers` withholds it everywhere.
 */

const input = () => page.getByRole('textbox', { name: 'Name' });
const marker = () => document.querySelector<HTMLElement>('.required-marker');

/** What the marker paints: an empty span whose glyph is generated content. */
const glyph = () => getComputedStyle(marker()!, '::after').content;

/** Binds a decorated input labelled `Name`, at `position`. */
const bind = (
  api: FormsApi = 'signal',
  position: FieldLabelPosition = 'outside',
  options: BindFieldOptions = {}
): Promise<BoundField> =>
  bindField('input', api, {
    decorated: true,
    decoration: `<div formidableFieldLabel position="${position}">Name</div>`,
    ...options
  });

describe('required marker', () => {
  beforeEach(() => configureFormidableTestBed());

  for (const api of FORMS_APIS) {
    it(`suffixes the label once the field is required, bound ${api}`, async () => {
      const bound = await bind(api);

      expect(marker()).toBeNull();

      await bound.state({ required: true });

      expect(glyph()).toBe('"*"');
      expect(marker()!.getBoundingClientRect().left).toBeGreaterThanOrEqual(
        page.getByText('Name').element().getBoundingClientRect().right
      );
    });
  }

  it('stays out of the accessible name', async () => {
    await bind('signal', 'outside', { state: { required: true } });

    await expect.element(input()).toHaveAccessibleName('Name');
    await expect.element(input()).toHaveAttribute('aria-required', 'true');
  });

  // A group renders its label as a `div` rather than a `label`, which the marker has to reach too.
  it('suffixes a group label as well', async () => {
    await bindField('radio-group', 'signal', {
      inputs: { options: [{ value: 'a', label: 'Alpha' }] },
      decorated: true,
      decoration: '<div formidableFieldLabel>Name</div>',
      state: { required: true }
    });

    await expect.element(page.getByRole('radiogroup', { name: 'Name', exact: true })).toBeInTheDocument();
    expect(glyph()).toBe('"*"');
  });

  it('is withheld by hideRequiredMarkers, while the field still reports required', async () => {
    configureFormidableTestBed({
      providers: [{ provide: FORMIDABLE_DEFAULTS, useValue: { hideRequiredMarkers: true } }]
    });
    await bind('signal', 'outside', { state: { required: true } });

    expect(marker()).toBeNull();
    await expect.element(input()).toHaveAttribute('aria-required', 'true');
  });

  // A suffix with no label to suffix collapses with it.
  it('shows nothing while the field projects no label', async () => {
    await bindField('input', 'signal', { decorated: true, state: { required: true } });

    expect(marker()!.getBoundingClientRect().width).toBe(0);
  });

  it('takes its glyph from the theme', async () => {
    theme('--formidable-label-required-marker', '" (required)"');
    await bind('signal', 'outside', { state: { required: true } });

    expect(glyph()).toBe('" (required)"');
  });

  for (const position of ['inside-floating', 'border'] as FieldLabelPosition[]) {
    it(`survives at full width while a ${position} label ellipsizes`, async () => {
      const bound = await bindField('input', 'signal', {
        decorated: true,
        decoration: `<div formidableFieldLabel position="${position}">A label far too long to ever fit</div>`,
        state: { required: true }
      });
      const text = page.getByText('A label far too long to ever fit').element();
      const label = (page.getByRole('textbox').element() as HTMLInputElement).labels![0]!;
      const fullWidth = marker()!.getBoundingClientRect().width;

      expect(text.scrollWidth).toBe(text.clientWidth);

      bound.element.closest<HTMLElement>('formidable-field-decorator')!.style.width = '8rem';

      // The consumer's text is what ran out of room, while the marker keeps its glyph inside the label.
      await expect.poll(() => text.scrollWidth).toBeGreaterThan(text.clientWidth);
      expect(marker()!.getBoundingClientRect().width).toBeCloseTo(fullWidth, 1);
      expect(marker()!.getBoundingClientRect().right).toBeLessThanOrEqual(label.getBoundingClientRect().right + 0.5);
    });
  }
});
