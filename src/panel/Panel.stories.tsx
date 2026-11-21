import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { syncFromMeet } from '@/logic/flow.js';
import { lastKnownStages } from '@/logic/history.js';
import { nameKey } from '@/logic/roster.js';
import { createSession, setIgnored, setStage } from '@/logic/session.js';
import { panelView } from './controller.js';
import { fakeAt } from './fake-states.js';
import { Panel } from './Panel';

type FakeMeet = Awaited<ReturnType<typeof fakeAt>>['meet'];
type State = { meet: FakeMeet; session: any; ctx: { roster: any; lastStages: any } };

// A loader: the demo call at `at`, changed by `prepare`, whose answer goes to panelView as its own arguments.
function at(where: string | null, prepare: (state: State) => object | Promise<object> = () => ({})) {
  return async () => {
    const { meet, store } = await fakeAt(where);
    const { roster, history, current } = await store.load();
    const state = { meet, session: current, ctx: { roster, lastStages: lastKnownStages(history) } };
    const { fake, ...args } = await prepare(state) as { fake?: unknown };
    return { view: panelView({ session: state.session, ctx: state.ctx, ...args }), fake };
  };
}

const collecting = ({ session }: State) => {
  setIgnored(session, nameKey('Galaxy S21'), true);
  return {};
};

const planRooms = (session: any): { name: string; members: string[] }[] => session.plan;

const meta = {
  component: Panel,
  args: {
    view: panelView({ session: null, ctx: null, loading: true }),
    actions: {
      start: fn(), end: fn(), split: fn(), fill: fn(), setStage: fn(), setIgnored: fn(),
      setLone: fn(), setMix: fn(), toggleActive: fn(), markPlaced: fn(),
    },
    rosterHref: '#',
  },
  render: (args, { loaded }) => <Panel {...args} view={loaded.view ?? args.view} fake={loaded.fake} />,
} satisfies Meta<typeof Panel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = { loaders: [at(null, () => ({ loading: true }))] };
export const BeforeStart: Story = { loaders: [at(null)] };
export const NoMeetTab: Story = { loaders: [at(null, () => ({ notice: 'Open the Meet call in this window, then press Start.' }))] };
export const OwnerNamesMissing: Story = {
  loaders: [at(null, ({ ctx }) => {
    ctx.roster.ownerNames = [];
    return {};
  })],
};
export const NoAnswersYet: Story = {
  loaders: [at(null, state => {
    state.session = createSession({ startedAt: '2026-11-24T17:00:00Z', meetingCode: 'abc-defg-hij' });
    return {};
  })],
};
export const Collecting: Story = { loaders: [at('collecting', collecting)] };
export const MeetReadFailed: Story = {
  loaders: [at('collecting', state => ({ ...collecting(state), errors: ['Reading the participant list failed: Not supported.'] }))],
};
export const Split: Story = { loaders: [at('split')] };
export const ChangedSinceSplit: Story = {
  loaders: [at('split', ({ session, ctx }) => {
    setStage(session, ctx, nameKey('Eva'), 'S02DS');
    return {};
  })],
};
export const Filling: Story = { loaders: [at('split', () => ({ filling: true }))] };
export const Filled: Story = {
  loaders: [at('filled', async ({ meet, session, ctx }) => {
    meet.say('Ana', 'S02 SE');
    await syncFromMeet(meet, session, ctx);
    return { fillResult: { ok: true, lines: ["Rooms filled. Check Meet's breakout panel, then press Open rooms there."], items: [] } };
  })],
};
export const FillRoomsNotCreated: Story = {
  loaders: [at('split', ({ session }) => ({
    ownerCreatesRooms: true,
    fillResult: {
      ok: false,
      lines: ['Not supported.', 'Create these rooms in Meet, with these names:'],
      items: planRooms(session).map(room => room.name),
    },
  }))],
};
export const FillNamesByHand: Story = {
  loaders: [at('filled', ({ session }) => ({
    fillResult: {
      ok: false,
      lines: ['Putting Ana in S01 Arc01 · A failed: Not supported.', 'Type these names by hand:'],
      items: planRooms(session).flatMap(room => room.members.map(key => `${session.students[key].name} → ${room.name}`)),
    },
  }))],
};
export const EndArmed: Story = { loaders: [at('collecting', state => ({ ...collecting(state), endArmed: true }))] };
export const WithFakeMeet: Story = {
  loaders: [at('filled', ({ meet }) => ({
    fake: { rooms: meet.rooms, say: fn(), join: fn(), playDemo: fn() },
  }))],
};
