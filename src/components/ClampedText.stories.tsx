import type { Meta, StoryObj } from '@storybook/react-vite';
import { DEMO } from '@/panel/demo.js';
import { ClampedText } from './ClampedText';

const meta = {
  component: ClampedText,
  args: { text: 'need help with task 3' },
  render: args => (
    <div className="w-80">
      <ClampedText {...args} />
    </div>
  ),
} satisfies Meta<typeof ClampedText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Short: Story = {};
export const Long: Story = { args: { text: DEMO.answers[DEMO.answers.length - 1][1] } };
