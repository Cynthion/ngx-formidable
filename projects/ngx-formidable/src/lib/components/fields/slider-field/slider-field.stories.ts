import type { Meta, StoryObj } from '@storybook/angular-vite';
import { decorated, decoratedImports } from '../../../storybook/story.helpers';
import { SliderField } from './slider-field';

/** A number within a range. Its decorator layout is `vertical`: no prefix or suffix. */
const meta: Meta<SliderField> = {
  title: 'Fields / Slider Field',
  component: SliderField,
  decorators: [decoratedImports],
  argTypes: { valueChange: { action: 'valueChange' }, touch: { action: 'touch' } },
  render: decorated('formidable-slider-field', 'Volume')
};

export default meta;
type Story = StoryObj<SliderField>;

export const Default: Story = {};

export const Filled: Story = {
  args: { value: 40 }
};

export const StateDisabled: Story = {
  args: { value: 40, disabled: true }
};

export const StateReadonly: Story = {
  args: { value: 40, readonly: true }
};

export const StateRequired: Story = {
  args: { value: 40, required: true }
};

export const StateInvalid: Story = {
  args: { value: 95, touched: true, invalid: true, errors: [{ kind: 'max', message: 'At most 80' }] }
};

export const ShowThumbLabelOff: Story = {
  args: { value: 40, showThumbLabel: false }
};

export const ShowTickMarks: Story = {
  args: { value: 40, step: 10, showTickMarks: true }
};

export const ShowTickLabels: Story = {
  args: { value: 40, step: 10, showTickMarks: true, showTickLabels: true, tickInterval: 20 }
};

export const ShowMinMaxLabels: Story = {
  args: { value: 40, showMinMaxLabels: true, minLabel: 'Quiet', maxLabel: 'Loud' }
};
