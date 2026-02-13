/**
 * Storybook Main Configuration
 * 
 * This file configures Storybook with all required addons and settings.
 */

import type { StorybookConfig } from '@storybook/react-vite';
import { withThemeByDataAttribute } from '@storybook/addon-themes';
import { withDesignTokens } from '@storybook/addon-design-tokens';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-themes',
    '@storybook/addon-controls',
    '@storybook/addon-docs',
    '@storybook/addon-design-tokens',
    '@storybook/addon-viewport',
    '@storybook/addon-backgrounds',
    '@storybook/addon-a11y',
    '@storybook/addon-actions',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  typescript: {
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
  decorators: [
    withThemeByDataAttribute({
      themes: {
        light: 'light',
        dark: 'dark',
      },
      defaultTheme: 'light',
      attributeName: 'data-theme',
    }),
    withDesignTokens({
      designTokens: {
        // Color tokens
        'color-primary': '#3B82F6',
        'color-secondary': '#8B5CF6',
        'color-accent': '#F59E0B',
        'color-success': '#10B981',
        'color-warning': '#F59E0B',
        'color-error': '#EF4444',
        'color-info': '#3B82F6',
        'color-neutral-50': '#F9FAFB',
        'color-neutral-100': '#F3F4F6',
        'color-neutral-200': '#E5E7EB',
        'color-neutral-300': '#D1D5DB',
        'color-neutral-400': '#9CA3AF',
        'color-neutral-500': '#6B7280',
        'color-neutral-600': '#4B5563',
        'color-neutral-700': '#374151',
        'color-neutral-800': '#1F2937',
        'color-neutral-900': '#111827',
        
        // Spacing tokens
        'spacing-0': '0',
        'spacing-1': '0.25rem',
        'spacing-2': '0.5rem',
        'spacing-3': '0.75rem',
        'spacing-4': '1rem',
        'spacing-5': '1.25rem',
        'spacing-6': '1.5rem',
        'spacing-8': '2rem',
        'spacing-10': '2.5rem',
        'spacing-12': '3rem',
        
        // Typography tokens
        'font-size-xs': '0.75rem',
        'font-size-sm': '0.875rem',
        'font-size-base': '1rem',
        'font-size-lg': '1.125rem',
        'font-size-xl': '1.25rem',
        'font-size-2xl': '1.5rem',
        'font-size-3xl': '1.875rem',
        'font-size-4xl': '2.25rem',
        
        // Border radius tokens
        'border-radius-sm': '0.125rem',
        'border-radius-base': '0.25rem',
        'border-radius-md': '0.375rem',
        'border-radius-lg': '0.5rem',
        'border-radius-xl': '0.75rem',
        'border-radius-2xl': '1rem',
        'border-radius-3xl': '1.5rem',
        'border-radius-full': '9999px',
        
        // Shadow tokens
        'shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'shadow-base': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'shadow-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        
        // Transition tokens
        'transition-fast': '150ms cubic-bezier(0.4, 0, 0.2, 1)',
        'transition-base': '200ms cubic-bezier(0.4, 0, 0.2, 1)',
        'transition-slow': '300ms cubic-bezier(0.4, 0, 0.2, 1)',
      },
    }),
  ],
};

export default config;
