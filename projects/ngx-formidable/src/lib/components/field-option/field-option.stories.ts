import type { Meta, StoryObj } from '@storybook/angular-vite';
import { moduleMetadata } from '@storybook/angular-vite';
import { FieldLabel } from '../../directives/field-label';
import { framed, openPanel } from '../../storybook/story.helpers';
import { FieldDecorator } from '../field-decorator/field-decorator';
import { CheckboxGroupField } from '../fields/checkbox-group-field/checkbox-group-field';
import { DropdownField } from '../fields/dropdown-field/dropdown-field';
import { RadioGroupField } from '../fields/radio-group-field/radio-group-field';
import { FieldOption } from './field-option';

/** The same four options in every story: one picked, one `readonly`, one `disabled`. */
const optionList = `
  <formidable-field-option value="red">Red</formidable-field-option>
  <formidable-field-option value="green">Green</formidable-field-option>
  <formidable-field-option value="blue" [readonly]="true">Blue</formidable-field-option>
  <formidable-field-option value="violet" [disabled]="true">Violet</formidable-field-option>`;

const inField = (selector: string, value: string, content = optionList) => ({
  template: `
    <formidable-field-decorator>
      <${selector} [value]="${value}">${content}</${selector}>
      <div formidableFieldLabel>Colour</div>
    </formidable-field-decorator>`
});

/**
 * One option, projected into the field that owns it. The field decides its `layout`: a radio or checkbox marker
 * in the two groups, a plain row in a panel. A `readonly` option reads as available, a `disabled` one does not;
 * neither can be picked.
 */
const meta: Meta<FieldOption> = {
  title: 'Structural Components / Field Option',
  component: FieldOption,
  decorators: [
    moduleMetadata({ imports: [FieldDecorator, FieldLabel, RadioGroupField, CheckboxGroupField, DropdownField] })
  ]
};

export default meta;
type Story = StoryObj<FieldOption>;

export const LayoutRadioGroup: Story = {
  render: () => inField('formidable-radio-group-field', "'red'")
};

export const LayoutCheckboxGroup: Story = {
  render: () => inField('formidable-checkbox-group-field', "['red', 'green']")
};

/** A dropdown's open panel. */
export const LayoutInline: Story = {
  parameters: framed,
  render: () => inField('formidable-dropdown-field', "'red'"),
  play: openPanel()
};

/** Projected content renders in place of the label, and its text becomes the label. */
export const CustomContent: Story = {
  render: () =>
    inField(
      'formidable-radio-group-field',
      "'red'",
      `
      <formidable-field-option value="red"><strong>Red</strong> · warm</formidable-field-option>
      <formidable-field-option value="blue"><strong>Blue</strong> · cold</formidable-field-option>`
    )
};
