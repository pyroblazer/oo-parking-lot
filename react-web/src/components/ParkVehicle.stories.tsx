/**
 * ParkVehicle Component Stories
 * 
 * Storybook stories for the ParkVehicle component with various variants.
 */

import type { Meta, StoryObj } from '@storybook/react';
import ParkVehicle from './ParkVehicle';

const meta: Meta<typeof ParkVehicle> = {
  title: 'Components/ParkVehicle',
  component: ParkVehicle,
  tags: ['autodocs'],
  argTypes: {
    vehicleType: {
      control: 'select',
      options: ['', 'S', 'M', 'L'],
      description: 'Vehicle type to park',
    },
    entryPointId: {
      control: 'text',
      description: 'Entry point identifier',
    },
    loading: {
      control: 'boolean',
      description: 'Loading state',
    },
    error: {
      control: 'text',
      description: 'Error message',
    },
    success: {
      control: 'text',
      description: 'Success message',
    },
  },
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0F172A' },
        { name: 'light', value: '#F9FAFB' },
      ],
    },
  },
};

export default meta;
type Story = StoryObj<typeof ParkVehicle>;

/**
 * Default ParkVehicle component
 */
export const Default: Story = {
  args: {},
};

/**
 * ParkVehicle with loading state
 */
export const Loading: Story = {
  args: {},
  play: async () => {
    // Simulate loading state
    await new Promise(resolve => setTimeout(resolve, 1000));
  },
};

/**
 * ParkVehicle with error state
 */
export const WithError: Story = {
  args: {},
  play: async () => {
    // Simulate error state
    await new Promise(resolve => setTimeout(resolve, 500));
  },
};

/**
 * ParkVehicle with success state
 */
export const WithSuccess: Story = {
  args: {},
  play: async () => {
    // Simulate success state
    await new Promise(resolve => setTimeout(resolve, 1000));
  },
};

/**
 * ParkVehicle with small vehicle selected
 */
export const SmallVehicle: Story = {
  args: {},
  play: async () => {
    // Simulate small vehicle selection
    await new Promise(resolve => setTimeout(resolve, 500));
  },
};

/**
 * ParkVehicle with medium vehicle selected
 */
export const MediumVehicle: Story = {
  args: {},
  play: async () => {
    // Simulate medium vehicle selection
    await new Promise(resolve => setTimeout(resolve, 500));
  },
};

/**
 * ParkVehicle with large vehicle selected
 */
export const LargeVehicle: Story = {
  args: {},
  play: async () => {
    // Simulate large vehicle selection
    await new Promise(resolve => setTimeout(resolve, 500));
  },
};

/**
 * ParkVehicle in dark theme
 */
export const DarkTheme: Story = {
  args: {},
  parameters: {
    backgrounds: {
      default: 'dark',
    },
  },
};

/**
 * ParkVehicle in light theme
 */
export const LightTheme: Story = {
  args: {},
  parameters: {
    backgrounds: {
      default: 'light',
    },
  },
};

/**
 * ParkVehicle with gradient background
 */
export const GradientBackground: Story = {
  args: {},
  parameters: {
    backgrounds: {
      default: 'gradient',
    },
  },
};
