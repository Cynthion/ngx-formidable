import { page, userEvent } from 'vitest/browser';
import { bindField, BoundField, FORMS_APIS, FormsApi } from '../../testing/bind-field';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';

/**
 * A value the form writes before the field can hold it survives: a select whose options are projected only
 * after the write, and a masked field whose mask is not ready yet. The field shows the value it was given once
 * it can, and never puts it back over a later pick or a clear.
 */

// Deliberately not the first option: a native `<select>` selects that one on its own, so a value that happened
// to match it would pass whether or not the field ever applied what it was given.
const ERAS = `
  <formidable-field-option value="industrial" label="Industrial Revolution" />
  <formidable-field-option value="renaissance" label="Renaissance" />
`;

function bindSelect(api: FormsApi): Promise<BoundField> {
  return bindField('select', api, { content: ERAS, inputs: { options: [] }, value: 'renaissance' });
}

function bindMasked(kind: 'input' | 'textarea', api: FormsApi, mask: string, value: string): Promise<BoundField> {
  return bindField(kind, api, { inputs: { mask, maskConfig: { showMaskTyped: true } }, value });
}

describe('a value written before the field can hold it', () => {
  beforeEach(() => configureFormidableTestBed());

  for (const api of FORMS_APIS) {
    describe(`bound ${api}`, () => {
      it('survives on a select whose options are projected', async () => {
        await bindSelect(api);

        await expect.element(page.getByRole('combobox')).toHaveValue('renaissance');
      });

      it('does not revert a later pick when the option list changes', async () => {
        const field = await bindSelect(api);

        await userEvent.selectOptions(page.getByRole('combobox'), 'Industrial Revolution');
        await expect.poll(field.value).toBe('industrial');
        await field.set('options', [{ value: 'bronze', label: 'Bronze Age' }]);

        await expect.element(page.getByRole('combobox')).toHaveValue('industrial');
      });

      it('survives on a masked input, formatted by its mask', async () => {
        await bindMasked('input', api, 'AAA-0000', 'TTA4417');

        await expect.element(page.getByRole('textbox')).toHaveValue('TTA-4417');
      });

      it('survives on a masked textarea, formatted by its mask', async () => {
        await bindMasked('textarea', api, 'AAA-AAA', 'abcdef');

        await expect.element(page.getByRole('textbox')).toHaveValue('abc-def');
      });

      it('does not resurrect a value the user has since cleared', async () => {
        const field = await bindMasked('input', api, 'AAA-0000', 'TTA4417');
        const textbox = page.getByRole('textbox');

        await expect.element(textbox).toHaveValue('TTA-4417');
        await userEvent.clear(textbox);
        await settle(field.fixture, 50);

        expect((textbox.element() as HTMLInputElement).value).not.toContain('TTA');
      });
    });
  }
});
