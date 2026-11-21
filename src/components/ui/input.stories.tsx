import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './input';

const meta = {
  component: Input,
  args: { placeholder: 'Group name' },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const Filled: Story = { args: { defaultValue: 'Data science' } };
export const File: Story = { args: { type: 'file' } };
