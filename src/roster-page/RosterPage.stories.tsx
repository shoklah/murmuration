import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';
import { createStore } from '@/store.js';
import { DEMO } from '@/panel/demo.js';
import { emptyRoster } from '@/logic/roster.js';
import { RosterPage, type RosterStore } from './RosterPage';

const demoStore = (): RosterStore => createStore({ memory: true, seed: { roster: DEMO.roster, history: DEMO.history } });

const meta = {
  component: RosterPage,
  args: { store: demoStore() },
} satisfies Meta<typeof RosterPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Demo: Story = {};

export const Empty: Story = {
  args: { store: createStore({ memory: true, seed: { roster: emptyRoster(), history: [] } }) },
};

export const ImportError: Story = {
  args: { store: demoStore() },
  play: async ({ canvasElement }) => {
    const field = await within(canvasElement).findByLabelText('Import backup');
    await userEvent.upload(field, new File(['nope'], 'nope.txt', { type: 'text/plain' }));
  },
};
