import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { StageSelect } from './StageSelect';

const meta = {
  component: StageSelect,
  args: { value: null, onChange: fn(), label: 'Stage for Ana' },
} satisfies Meta<typeof StageSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const WithStage: Story = { args: { value: 'S02DS' } };
export const Disabled: Story = { args: { disabled: true } };
