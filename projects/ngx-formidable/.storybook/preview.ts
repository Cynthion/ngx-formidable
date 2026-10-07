import { applicationConfig, type Preview } from '@storybook/angular-vite';
import { provideNgxFormidable } from '../src/lib/provide-ngx-formidable';

const preview: Preview = {
  tags: ['autodocs'],
  decorators: [applicationConfig({ providers: [provideNgxFormidable()] })],
  parameters: {
    options: {
      storySort: { order: ['Fields', 'Structural Components'] }
    }
  }
};

export default preview;
