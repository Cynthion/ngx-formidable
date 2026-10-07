import type { Meta, StoryObj } from '@storybook/angular-vite';
import { moduleMetadata } from '@storybook/angular-vite';
import { FieldHint } from '../../directives/field-hint';
import { FieldLabel } from '../../directives/field-label';
import { FieldLabelAdornment } from '../../directives/field-label-adornment';
import { FieldPrefix } from '../../directives/field-prefix';
import { FieldSuffix } from '../../directives/field-suffix';
import { FieldAdornmentAlignment, FieldHintAlignment, FieldLabelPosition } from '../../models/formidable.model';
import { mockColourOptions, mockRequiredError } from '../../storybook/story.helpers';
import { InputField } from '../fields/input-field/input-field';
import { RadioGroupField } from '../fields/radio-group-field/radio-group-field';
import { ToggleField } from '../fields/toggle-field/toggle-field';
import { FieldDecorator } from './field-decorator';

/** What the stories put into the decorator's slots. An empty string leaves a slot out. */
interface DecoratorArgs {
  position: FieldLabelPosition;
  placeholderText: string;
  adornment: string;
  prefix: string;
  prefixAlign: FieldAdornmentAlignment;
  suffix: string;
  suffixAlign: FieldAdornmentAlignment;
  hint: string;
  hintAlign: FieldHintAlignment;
  required: boolean;
  invalid: boolean;
}

const options = <T extends string>(...values: T[]) => ({ control: 'inline-radio' as const, options: values });

/**
 * Wraps a field with its label, adornments, hints and messages. Each story renders the field twice, empty and
 * filled, so a label that rests while the field is empty and floats once it is not shows both states.
 */
const meta: Meta<DecoratorArgs> = {
  title: 'Structural Components / Field Decorator',
  component: FieldDecorator,
  decorators: [
    moduleMetadata({
      imports: [InputField, FieldLabel, FieldLabelAdornment, FieldPrefix, FieldSuffix, FieldHint]
    })
  ],
  argTypes: {
    position: options('outside', 'inside', 'inside-placeholder', 'inside-floating', 'border', 'border-prefix'),
    prefixAlign: options('center', 'value'),
    suffixAlign: options('center', 'value'),
    hintAlign: options('start', 'center', 'end')
  },
  args: {
    position: 'inside',
    placeholderText: '',
    adornment: '',
    prefix: '',
    prefixAlign: 'center',
    suffix: '',
    suffixAlign: 'center',
    hint: '',
    hintAlign: 'start',
    required: false,
    invalid: false
  },
  render: (args) => ({
    props: { ...args, errors: mockRequiredError },
    template: `
      <div style="display: grid; gap: 1.5rem">
        @for (value of ['', 'Ada Lovelace']; track $index) {
        <formidable-field-decorator>
          <formidable-input-field
            [value]="value"
            [placeholder]="placeholderText"
            [required]="required"
            [invalid]="invalid"
            [touched]="invalid"
            [errors]="invalid ? errors : []" />
          <div formidableFieldLabel [position]="position">Name</div>
          @if (adornment) {
          <div formidableFieldLabelAdornment>{{ adornment }}</div>
          }
          @if (prefix) {
          <div formidableFieldPrefix [align]="prefixAlign">{{ prefix }}</div>
          }
          @if (suffix) {
          <div formidableFieldSuffix [align]="suffixAlign">{{ suffix }}</div>
          }
          @if (hint) {
          <div formidableFieldHint [align]="hintAlign">{{ hint }}</div>
          }
        </formidable-field-decorator>
        }
      </div>`
  })
};

export default meta;
type Story = StoryObj<DecoratorArgs>;

/** The default `inside` label: resting while the field is empty, floating above the value once it is not. */
export const Default: Story = {};

/** Above the field, in normal flow. It never moves. */
export const LabelPositionOutside: Story = {
  args: { position: 'outside' }
};

/** With a placeholder, `inside` yields the value area to it, so the label floats throughout. */
export const LabelPositionInside: Story = {
  args: { position: 'inside', placeholderText: 'First and last name' }
};

/** The resting label hides the placeholder until focus floats it. */
export const LabelPositionInsidePlaceholder: Story = {
  args: { position: 'inside-placeholder', placeholderText: 'First and last name' }
};

/** Always floating above the value. */
export const LabelPositionInsideFloating: Story = {
  args: { position: 'inside-floating' }
};

/** Centred on the top border, aligned with the value. */
export const LabelPositionBorder: Story = {
  args: { position: 'border', prefix: 'Dr.' }
};

/** As `border`, aligned with the prefix instead of the value. */
export const LabelPositionBorderPrefix: Story = {
  args: { position: 'border-prefix', prefix: 'Dr.' }
};

/** Beside the label, in its row. A label rendered over the field takes the row, and the adornment, with it. */
export const LabelAdornment: Story = {
  args: { position: 'outside', adornment: '(as on your passport)' }
};

export const PrefixAndSuffix: Story = {
  args: { prefix: 'Dr.', suffix: 'PhD' }
};

/** Follows the value, which the `inside` label pushes down, instead of the box's centre. */
export const PrefixAlignValue: Story = {
  args: { prefix: 'Dr.', prefixAlign: 'value' }
};

/** Follows the value, which the `inside` label pushes down, instead of the box's centre. */
export const SuffixAlignValue: Story = {
  args: { suffix: 'PhD', suffixAlign: 'value' }
};

export const HintAlignStart: Story = {
  args: { hint: 'As it appears on your passport' }
};

export const HintAlignCenter: Story = {
  args: { hint: 'As it appears on your passport', hintAlign: 'center' }
};

export const HintAlignEnd: Story = {
  args: { hint: 'As it appears on your passport', hintAlign: 'end' }
};

/** The marker follows the label in every position. */
export const StateRequired: Story = {
  args: { required: true }
};

/** The messages render below the hints. */
export const StateInvalid: Story = {
  args: { required: true, invalid: true, hint: 'As it appears on your passport' }
};

/** `radio-group`, `checkbox-group` and `slider` stack inside the box, so a label always renders outside. */
export const LayoutVertical: Story = {
  decorators: [moduleMetadata({ imports: [RadioGroupField] })],
  args: { hint: 'Pick one' },
  render: (args) => ({
    props: { ...args, options: mockColourOptions.slice(0, 3) },
    template: `
      <formidable-field-decorator>
        <formidable-radio-group-field [options]="options" [required]="required" />
        <div formidableFieldLabel [position]="position">Colour</div>
        @if (hint) {
        <div formidableFieldHint [align]="hintAlign">{{ hint }}</div>
        }
      </formidable-field-decorator>`
  })
};

/** `toggle` puts the label, prefix and suffix on one line with the switch. */
export const LayoutInline: Story = {
  decorators: [moduleMetadata({ imports: [ToggleField] })],
  args: { prefix: 'Off', suffix: 'On' },
  render: (args) => ({
    props: args,
    template: `
      <formidable-field-decorator>
        <formidable-toggle-field [required]="required" />
        <div formidableFieldLabel>Newsletter</div>
        @if (prefix) {
        <div formidableFieldPrefix>{{ prefix }}</div>
        }
        @if (suffix) {
        <div formidableFieldSuffix>{{ suffix }}</div>
        }
      </formidable-field-decorator>`
  })
};
