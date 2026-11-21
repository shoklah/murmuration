import type { Meta, StoryObj } from '@storybook/react-vite';
import { Toggle } from './toggle';

const meta = {
  component: Toggle,
  args: { children: 'Collecting' },
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {};
export const On: Story = { args: { defaultPressed: true } };
