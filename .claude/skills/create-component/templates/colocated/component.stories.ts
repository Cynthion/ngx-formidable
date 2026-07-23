import { Meta, StoryObj } from '@storybook/angular';
// feature composition: storybookCompositionDecorators
// view component: per-view decorator, e.g. storybookPatientsDecorators
import { storybookCompositionDecorators } from '../../../../../storybook/storybook.modules';
import { NameComponent } from './name.component';

const meta: Meta<NameComponent> = {
  title: 'Views / Scope / Name',
  parameters: { layout: 'center' },
  component: NameComponent,
  decorators: storybookCompositionDecorators,
  argTypes: {
    submitClick: { action: 'submitClick' }
  }
};

export default meta;
type Story = StoryObj<NameComponent>;

const Template: Story = {
  render: (args) => ({
    props: args,
    template: `
      <cmp-scope-name [data]="data"
                      (submitClick)="submitClick($event)">
      </cmp-scope-name>`
  })
};

export const Default: Story = {
  ...Template,
  args: { data: undefined }
};
