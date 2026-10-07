import type { Meta, StoryObj } from '@storybook/angular-vite';
import { decorated, decoratedImports, mockColourOptions, mockRequiredError } from '../../../storybook/story.helpers';
import { RadioGroupField } from './radio-group-field';

/** One choice, with every option visible. Its decorator layout is `vertical`: no prefix or suffix. */
const meta: Meta<RadioGroupField> = {
  title: 'Fields / Radio Group Field',
  component: RadioGroupField,
  decorators: [decoratedImports],
  argTypes: { valueChange: { action: 'valueChange' }, touch: { action: 'touch' } },
  args: { options: mockColourOptions.slice(0, 4) },
  render: decorated('formidable-radio-group-field', 'Colour')
};

export default meta;
type Story = StoryObj<RadioGroupField>;

export const Default: Story = {};

export const Filled: Story = {
  args: { value: 'yellow' }
};

export const StateDisabled: Story = {
  args: { value: 'yellow', disabled: true }
};

export const StateReadonly: Story = {
  args: { value: 'yellow', readonly: true }
};

export const StateRequired: Story = {
  args: { required: true }
};

export const StateInvalid: Story = {
  args: { required: true, touched: true, invalid: true, errors: mockRequiredError }
};

export const NoOptions: Story = {
  args: { options: [] }
};
