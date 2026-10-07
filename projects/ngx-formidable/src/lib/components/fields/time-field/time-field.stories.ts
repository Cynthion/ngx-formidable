import type { Meta, StoryObj } from '@storybook/angular-vite';
import { decorated, decoratedImports, mockRequiredError } from '../../../storybook/story.helpers';
import { TimeField } from './time-field';

const time = new Date(2026, 0, 15, 9, 30);

/** A time of day. */
const meta: Meta<TimeField> = {
  title: 'Fields / Time Field',
  component: TimeField,
  decorators: [decoratedImports],
  argTypes: { valueChange: { action: 'valueChange' }, touch: { action: 'touch' } },
  render: decorated('formidable-time-field', 'Arrival')
};

export default meta;
type Story = StoryObj<TimeField>;

export const Default: Story = {};

export const Filled: Story = {
  args: { value: time }
};

export const StateDisabled: Story = {
  args: { value: time, disabled: true }
};

export const StateReadonly: Story = {
  args: { value: time, readonly: true }
};

export const StateRequired: Story = {
  args: { required: true }
};

export const StateInvalid: Story = {
  args: { required: true, touched: true, invalid: true, errors: mockRequiredError }
};

/** What an empty, unfocused field shows: the format instead of underscores. */
export const EmptyHintFormat: Story = {
  args: { emptyHint: 'format' }
};

export const UnicodeTokenFormat: Story = {
  args: { value: time, unicodeTokenFormat: 'HH:mm' }
};
