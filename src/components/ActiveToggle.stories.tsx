import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ActiveToggle } from './ActiveToggle';

const meta = {
  component: ActiveToggle,
  args: { active: false, onToggle: fn(), label: 'Active student' },
} satisfies Meta<typeof ActiveToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {};
export const On: Story = { args: { active: true } };
