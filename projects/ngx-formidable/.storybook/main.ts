import type { StorybookConfig } from '@storybook/angular-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.ts'],
  addons: [
    '@storybook/addon-docs',
    // `dev` makes the server tell agents its generic story instructions are the source of truth; see `impl/storybook.md`.
    { name: '@storybook/addon-mcp', options: { toolsets: { dev: false } } }
  ],
  framework: '@storybook/angular-vite',
  features: {
    componentsManifest: true
  },
  core: {
    disableTelemetry: true
  }
};

export default config;
