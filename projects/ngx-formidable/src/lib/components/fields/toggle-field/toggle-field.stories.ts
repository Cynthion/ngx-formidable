import type { Meta, StoryObj } from '@storybook/angular-vite';
import { decorated, decoratedImports } from '../../../storybook/story.helpers';
import { ToggleField } from './toggle-field';

/** On or off. Its decorator layout is `inline`: the label sits beside the switch. */
const meta: Meta<ToggleField> = {
  title: 'Fields / Toggle Field',
  component: ToggleField,
  decorators: [decoratedImports],
  argTypes: { valueChange: { action: 'valueChange' }, touch: { action: 'touch' } },
  render: decorated('formidable-toggle-field', 'Newsletter')
};

export default meta;
type Story = StoryObj<ToggleField>;

export const Default: Story = {};

export const Filled: Story = {
  args: { value: true }
};

export const StateDisabled: Story = {
  args: { value: true, disabled: true }
};

export const StateReadonly: Story = {
  args: { value: true, readonly: true }
};

export const StateRequired: Story = {
  args: { required: true }
};

export const StateInvalid: Story = {
  args: { required: true, touched: true, invalid: true, errors: [{ kind: 'required', message: 'Please opt in' }] }
};

export const OnOffLabels: Story = {
  args: { value: true, onLabel: 'Yes', offLabel: 'No' }
};

/** `onLabel` and `offLabel` after the switch instead of before it. */
export const LabelPositionAfter: Story = {
  args: { value: true, onLabel: 'Yes', offLabel: 'No', labelPosition: 'after' }
};
