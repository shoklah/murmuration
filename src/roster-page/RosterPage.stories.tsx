import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';
import { createStore } from '@/store.js';
import { DEMO } from '@/panel/demo.js';
import { addStudent, emptyRoster } from '@/logic/roster.js';
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
    await within(canvasElement).findByRole('button', { name: 'Import backup' });
    const field = canvasElement.querySelector<HTMLInputElement>('input[type="file"]')!;
    await userEvent.upload(field, new File(['nope'], 'nope.txt', { type: 'text/plain' }));
  },
};

const longTimelineStore = (): RosterStore => {
  const roster = emptyRoster();
  const key = addStudent(roster, 'Ana');
  const kinds = [
    { stage: 'S01A1', source: 'answer' },
    { stage: 'S01A1', source: 'guess' },
    { stage: null, source: null },
  ];
  const history = Array.from({ length: 14 }, (_, week) => ({
    startedAt: new Date(Date.UTC(2026, 7, 3 + 7 * week, 17)).toISOString(),
    meetingCode: 'abc-defg-hij',
    students: [{ key, name: 'Ana', ...kinds[week % kinds.length] }],
  }));
  return createStore({ memory: true, seed: { roster, history } });
};

export const LongTimeline: Story = {
  args: { store: longTimelineStore() },
};
