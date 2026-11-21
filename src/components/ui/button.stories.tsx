import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';

const meta = {
  component: Button,
  args: { children: 'Fill breakout rooms' },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Outline: Story = { args: { variant: 'outline' } };
export const Ghost: Story = { args: { variant: 'ghost' } };
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Small: Story = { args: { size: 'sm' } };
export const Disabled: Story = { args: { disabled: true } };
