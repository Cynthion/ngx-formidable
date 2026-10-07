import type { Meta, StoryObj } from '@storybook/angular-vite';
import { decorated, decoratedImports, mockColourOptions, mockRequiredError } from '../../../storybook/story.helpers';
import { CheckboxGroupField } from './checkbox-group-field';

/** Several choices, with every option visible. Its decorator layout is `vertical`: no prefix or suffix. */
const meta: Meta<CheckboxGroupField> = {
  title: 'Fields / Checkbox Group Field',
  component: CheckboxGroupField,
  decorators: [decoratedImports],
  argTypes: { valueChange: { action: 'valueChange' }, touch: { action: 'touch' } },
  args: { options: mockColourOptions.slice(0, 4) },
  render: decorated('formidable-checkbox-group-field', 'Colours')
};

export default meta;
type Story = StoryObj<CheckboxGroupField>;

export const Default: Story = {};

export const Filled: Story = {
  args: { value: ['orange', 'green'] }
};

export const StateDisabled: Story = {
  args: { value: ['orange', 'green'], disabled: true }
};

export const StateReadonly: Story = {
  args: { value: ['orange', 'green'], readonly: true }
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
