import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
  framework: '@storybook/react-vite',
  core: { disableTelemetry: true },
  // Storybook reuses vite.config.js; the extension's copy step has no place in the catalog's build.
  viteFinal: config => ({
    ...config,
    plugins: config.plugins?.flat().filter(plugin => !(plugin && 'name' in plugin && plugin.name === 'extension-files')),
  }),
};

export default config;
