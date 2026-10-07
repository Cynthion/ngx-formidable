import type { Meta, StoryObj } from '@storybook/angular-vite';
import { decorated, decoratedImports, mockRequiredError } from '../../../storybook/story.helpers';
import { InputField } from './input-field';

/** One line of text, optionally masked. */
const meta: Meta<InputField> = {
  title: 'Fields / Input Field',
  component: InputField,
  decorators: [decoratedImports],
  argTypes: { valueChange: { action: 'valueChange' }, touch: { action: 'touch' } },
  args: { placeholder: 'Ada Lovelace' },
  render: decorated('formidable-input-field', 'Name')
};

export default meta;
type Story = StoryObj<InputField>;

export const Default: Story = {};

export const Filled: Story = {
  args: { value: 'Grace Hopper' }
};

export const StateDisabled: Story = {
  args: { value: 'Grace Hopper', disabled: true }
};

export const StateReadonly: Story = {
  args: { value: 'Grace Hopper', readonly: true }
};

export const StateRequired: Story = {
  args: { required: true }
};

export const StateInvalid: Story = {
  args: { required: true, touched: true, invalid: true, errors: mockRequiredError }
};

/** The model holds the raw digits; the mask formats what is shown. */
export const Masked: Story = {
  args: { value: '4111111111111111', mask: '0000 0000 0000 0000' }
};
