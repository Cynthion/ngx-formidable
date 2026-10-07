import type { Meta, StoryObj } from '@storybook/angular-vite';
import { moduleMetadata } from '@storybook/angular-vite';
import { FieldToggleIcon } from '../../../directives/field-toggle-icon';
import { decorated, decoratedImports, framed, mockRequiredError, openPanel } from '../../../storybook/story.helpers';
import { DateField } from './date-field';

/** A fixed date, so the open calendar shows the same month every day. */
const date = new Date(2026, 0, 15);

/** A date, typed or picked from a calendar. The open-panel stories open it with `Alt` + `Arrow Down`. */
const meta: Meta<DateField> = {
  title: 'Fields / Date Field',
  component: DateField,
  decorators: [decoratedImports],
  argTypes: { valueChange: { action: 'valueChange' }, touch: { action: 'touch' } },
  render: decorated('formidable-date-field', 'Start')
};

export default meta;
type Story = StoryObj<DateField>;

export const Default: Story = {};

export const Filled: Story = {
  args: { value: date }
};

export const StateDisabled: Story = {
  args: { value: date, disabled: true }
};

export const StateReadonly: Story = {
  args: { value: date, readonly: true }
};

export const StateRequired: Story = {
  args: { required: true }
};

export const StateInvalid: Story = {
  args: { required: true, touched: true, invalid: true, errors: mockRequiredError }
};

/** What an empty, unfocused field shows: the format instead of underscores. */
export const EmptyHintFormat: Story = {
  args: { emptyHint: 'format', unicodeTokenFormat: 'dd.MM.yyyy' }
};

export const UnicodeTokenFormat: Story = {
  args: { value: date, unicodeTokenFormat: 'dd.MM.yyyy' }
};

export const PanelOpen: Story = {
  parameters: framed,
  args: { value: date },
  play: openPanel('{Alt>}{ArrowDown}{/Alt}')
};

export const PanelPositionLeft: Story = {
  parameters: framed,
  args: { value: date, panelPosition: 'left' },
  play: openPanel('{Alt>}{ArrowDown}{/Alt}')
};

export const PanelPositionFull: Story = {
  parameters: framed,
  args: { value: date, panelPosition: 'full' },
  play: openPanel('{Alt>}{ArrowDown}{/Alt}')
};

/** Pinned across the bottom of the viewport. */
export const PanelPositionSheet: Story = {
  parameters: framed,
  args: { value: date, panelPosition: 'sheet' },
  play: openPanel('{Alt>}{ArrowDown}{/Alt}')
};

/** `formidableFieldToggleIcon` replaces the panel toggle's icon. */
export const ToggleIcon: Story = {
  decorators: [moduleMetadata({ imports: [FieldToggleIcon] })],
  render: decorated('formidable-date-field', 'Start', '<span formidableFieldToggleIcon>📅</span>')
};
