import type { Meta, StoryObj } from '@storybook/angular-vite';
import { decorated, decoratedImports, mockRequiredError } from '../../../storybook/story.helpers';
import { TextareaField } from './textarea-field';

/** Free text over several lines. */
const meta: Meta<TextareaField> = {
  title: 'Fields / Textarea Field',
  component: TextareaField,
  decorators: [decoratedImports],
  argTypes: { valueChange: { action: 'valueChange' }, touch: { action: 'touch' } },
  render: decorated('formidable-textarea-field', 'Notes')
};

export default meta;
type Story = StoryObj<TextareaField>;

const text = 'First line.\nSecond line.\nThird line, which grows the box.';

export const Default: Story = {};

export const Filled: Story = {
  args: { value: text }
};

export const StateDisabled: Story = {
  args: { value: text, disabled: true }
};

export const StateReadonly: Story = {
  args: { value: text, readonly: true }
};

export const StateRequired: Story = {
  args: { required: true }
};

export const StateInvalid: Story = {
  args: { required: true, touched: true, invalid: true, errors: mockRequiredError }
};

/** Scrolls instead of growing with its content. */
export const EnableAutosizeOff: Story = {
  args: { value: text, enableAutosize: false }
};

export const ShowLengthIndicator: Story = {
  args: { value: 'Short note', maxLength: 140, showLengthIndicator: true }
};
