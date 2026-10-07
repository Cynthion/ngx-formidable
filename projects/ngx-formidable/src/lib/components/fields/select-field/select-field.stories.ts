import type { Meta, StoryObj } from '@storybook/angular-vite';
import { decorated, decoratedImports, mockColourOptions, mockRequiredError } from '../../../storybook/story.helpers';
import { SelectField } from './select-field';

/** One choice from the platform's own picker, which a screenshot never shows open. */
const meta: Meta<SelectField> = {
  title: 'Fields / Select Field',
  component: SelectField,
  decorators: [decoratedImports],
  argTypes: { valueChange: { action: 'valueChange' }, touch: { action: 'touch' } },
  args: { options: mockColourOptions },
  render: decorated('formidable-select-field', 'Colour')
};

export default meta;
type Story = StoryObj<SelectField>;

export const Default: Story = {};

export const Filled: Story = {
  args: { value: 'blue' }
};

export const StateDisabled: Story = {
  args: { value: 'blue', disabled: true }
};

export const StateReadonly: Story = {
  args: { value: 'blue', readonly: true }
};

export const StateRequired: Story = {
  args: { required: true }
};

export const StateInvalid: Story = {
  args: { required: true, touched: true, invalid: true, errors: mockRequiredError }
};
