import type { Meta, StoryObj } from '@storybook/angular-vite';
import { action } from 'storybook/actions';
import {
  decorated,
  decoratedImports,
  framed,
  mockColourOptions,
  mockRequiredError,
  openPanel
} from '../../../storybook/story.helpers';
import { AutocompleteField } from './autocomplete-field';

/** One choice from a long or fetched list, by typing. The open-panel stories open it from the keyboard. */
const meta: Meta<AutocompleteField> = {
  title: 'Fields / Autocomplete Field',
  component: AutocompleteField,
  decorators: [decoratedImports],
  argTypes: {
    valueChange: { action: 'valueChange' },
    touch: { action: 'touch' },
    filterChange: { action: 'filterChange' }
  },
  args: { options: mockColourOptions },
  render: decorated('formidable-autocomplete-field', 'Colour')
};

export default meta;
type Story = StoryObj<AutocompleteField>;

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

export const PanelOpen: Story = {
  parameters: framed,
  play: openPanel()
};

/** The options whose label contains the typed text. */
export const Filtered: Story = {
  parameters: framed,
  play: openPanel('', 're')
};

export const PanelPositionLeft: Story = {
  parameters: framed,
  args: { panelPosition: 'left' },
  play: openPanel()
};

export const PanelPositionRight: Story = {
  parameters: framed,
  args: { panelPosition: 'right' },
  play: openPanel()
};

/** Pinned across the bottom of the viewport. */
export const PanelPositionSheet: Story = {
  parameters: framed,
  args: { panelPosition: 'sheet' },
  play: openPanel()
};

/** Pinned to the top, exempt from sorting and filtering. */
export const DefaultOption: Story = {
  parameters: framed,
  args: { defaultOption: { value: 'none', label: 'No preference' } },
  play: openPanel()
};

/** At the end of the list. Runs its action instead of becoming the value. */
export const ActionOption: Story = {
  parameters: framed,
  args: {
    options: mockColourOptions.slice(0, 2),
    actionOption: { value: 'add', label: 'Add a colour', action: action('add') }
  },
  play: openPanel()
};

export const NoOptions: Story = {
  parameters: framed,
  play: openPanel('', 'xyz')
};
