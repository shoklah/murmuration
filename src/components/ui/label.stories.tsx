import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './input';
import { Label } from './label';

const meta = {
  component: Label,
  args: { children: 'Group name', htmlFor: 'group-name' },
  render: args => (
    <div className="grid gap-2">
      <Label {...args} />
      <Input id="group-name" />
    </div>
  ),
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
