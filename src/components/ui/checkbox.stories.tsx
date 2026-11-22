import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checkbox } from './checkbox';
import { Label } from './label';

const meta = {
  component: Checkbox,
  args: { id: 'active' },
  render: args => (
    <div className="flex items-center gap-2">
      <Checkbox {...args} />
      <Label htmlFor="active">Active</Label>
    </div>
  ),
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {};
export const Checked: Story = { args: { defaultChecked: true } };
export const Disabled: Story = { args: { disabled: true } };
