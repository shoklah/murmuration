import type { Meta, StoryObj } from '@storybook/react-vite';
import { STAGES } from '@/logic/stages.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

const meta = {
  component: Select,
  args: {},
  render: args => (
    <Select {...args}>
      <SelectTrigger>
        <SelectValue placeholder="Stage…" />
      </SelectTrigger>
      <SelectContent>
        {STAGES.map(stage => (
          <SelectItem key={stage.code} value={stage.code}>
            {stage.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ),
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Placeholder: Story = {};
export const WithValue: Story = { args: { defaultValue: 'S02DS' } };
export const Disabled: Story = { args: { disabled: true } };
