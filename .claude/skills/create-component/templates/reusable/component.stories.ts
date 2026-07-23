import { applicationConfig, Meta, moduleMetadata, StoryObj } from '@storybook/angular';
import { infoBoxDecorator } from '../../../../../storybook/storybook.decorators';
import { storybookBasicApplicationConfig, StorybookModule } from '../../../../../storybook/storybook.modules';
import { NameComponent } from './name.component';

const meta: Meta<NameComponent> = {
  title: 'UI Components / Basic / Name',
  parameters: { layout: 'centered' },
  component: NameComponent,
  decorators: [applicationConfig(storybookBasicApplicationConfig), moduleMetadata({ imports: [StorybookModule] })],
  argTypes: {
    valueChange: { action: 'valueChange' }
  }
};

export default meta;
type Story = StoryObj<NameComponent>;

const Template: Story = {
  render: (args) => ({
    props: args,
    template: `
      <cmp-ui-name
        [color]="color"
        (valueChange)="valueChange($event)">
        Content
      </cmp-ui-name>`
  })
};

// Colors
export const ColorPrimary: Story = {
  ...Template,
  name: 'Color / Primary',
  args: { color: 'primary' }
};

export const ColorSecondary: Story = {
  ...Template,
  name: 'Color / Secondary',
  decorators: [infoBoxDecorator('Secondary — use for supporting, less prominent contexts.')],
  args: { color: 'secondary' }
};
