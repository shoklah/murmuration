import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert, AlertDescription, AlertTitle } from './alert';

const meta = {
  component: Alert,
  args: {},
  render: args => (
    <Alert {...args}>
      <AlertTitle>Breakout rooms not filled</AlertTitle>
      <AlertDescription>Open Meet's breakout panel, then try again.</AlertDescription>
    </Alert>
  ),
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Destructive: Story = { args: { variant: 'destructive' } };
