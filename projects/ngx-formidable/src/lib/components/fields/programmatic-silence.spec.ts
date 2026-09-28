import { FormidableOption } from '../../models/formidable.model';
import { bindField } from '../../testing/bind-field';
import { configureFormidableTestBed } from '../../testing/test-bed';

/**
 * Contract of the paths no user walked: the form writing a value, and an options list arriving late, both
 * correct the model while leaving the control untouched and pristine.
 *
 * Neither flag is cosmetic. A touch is the commit under `updateOn: 'blur'` and pre-sets the pending touch
 * under `updateOn: 'submit'`; and both flags gate the messages, under `revealOn` `touched` and `dirty`. So a
 * flag nobody raised would reveal, and commit, a field nobody has visited.
 */

describe('programmatic paths stay silent', () => {
  beforeEach(() => configureFormidableTestBed());

  it('does not touch the control when an options list drops a selected value', async () => {
    const options: FormidableOption[] = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' }
    ];
    const field = await bindField('checkbox-group', 'template-driven', { value: ['a', 'b'], inputs: { options } });

    expect(field.control.value).toEqual(['a', 'b']);

    // The list refreshes and no longer offers one of the values the model holds.
    await field.set('options', [{ value: 'a', label: 'A' }]);

    // The model is corrected, because a selection that no longer exists cannot stand...
    expect(field.control.value).toEqual(['a']);
    // ...but nobody visited this field.
    expect(field.control.touched).toBe(false);
    expect(field.control.dirty).toBe(false);
  });

  it('does not touch the control when the form writes a value into a date field', async () => {
    const field = await bindField('date', 'template-driven', { inputs: { unicodeTokenFormat: 'dd . MM . yyyy' } });

    await field.write(new Date(2024, 4, 12));

    expect(field.control.value).toEqual(new Date(2024, 4, 12));
    expect(field.control.touched).toBe(false);
    expect(field.control.dirty).toBe(false);
  });

  // The slider corrects a value the form gave it, so the model has to move. What must not move is `dirty`:
  // the user never touched the thumb. 47 is neither on the step grid nor what the user asked for: the field
  // corrects it to 50.
  it('corrects an out-of-step value without dirtying the control', async () => {
    const { control } = await bindField('slider', 'template-driven', {
      value: 47,
      inputs: { max: 100, min: 0, step: 25 }
    });

    expect(control.value).toBe(50);
    expect(control.dirty).toBe(false);
    expect(control.touched).toBe(false);
  });

  it('applies a mask to a written value without dirtying the control', async () => {
    const { control } = await bindField('input', 'template-driven', { value: '123456', inputs: { mask: '000-000' } });

    expect(control.value).toBe('123-456');
    expect(control.dirty).toBe(false);
    expect(control.touched).toBe(false);
  });

  // The reconcile used to be unreachable here: `updateOptions` re-applied the written value and cleared the
  // selection before the reconcile could read it, so the model kept a value the list no longer offered.
  it('drops a selected value the options no longer offer', async () => {
    const field = await bindField('dropdown', 'template-driven', {
      value: 'a',
      inputs: { options: [{ value: 'a', label: 'A' }] }
    });

    expect(field.control.value).toBe('a');

    await field.set('options', [{ value: 'b', label: 'B' }]);

    expect(field.control.value).toBeNull();
    expect(field.control.touched).toBe(false);
    expect(field.control.dirty).toBe(false);
  });
});
