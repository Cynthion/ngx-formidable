import type { Meta, StoryObj } from '@storybook/angular-vite';
import { FieldErrors } from './field-errors';

/**
 * Renders a list of errors as messages, in a live region. Every decorator renders one for its field; one is
 * placed by hand only for a group's or the form's errors.
 */
const meta: Meta<FieldErrors> = {
  title: 'Structural Components / Field Errors',
  component: FieldErrors,
  args: { errors: [{ kind: 'required', message: 'Required' }] }
};

export default meta;
type Story = StoryObj<FieldErrors>;

export const Default: Story = {};

export const Several: Story = {
  args: {
    errors: [
      { kind: 'required', message: 'Pick a start date' },
      { kind: 'minDate', message: 'The end date lies before the start date' }
    ]
  }
};

/** Without a `message`, the default text is the error's `kind`. */
export const KindOnly: Story = {
  args: { errors: [{ kind: 'pattern' }] }
};
