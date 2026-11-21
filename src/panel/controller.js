// The panel's behaviour: starts a session, polls Meet into it every 2 seconds,
// splits it into rooms, fills Meet's breakout rooms and ends it, and publishes
// a view of all that for the page to draw. No DOM and no chrome.* here.

import { syncFromMeet, fillRooms } from '../logic/flow.js';
import { lastKnownStages } from '../logic/history.js';
import { createSession, setStage, setIgnored, setLone, setMix, split, markPlaced, summarize, endSession, rosterEntry } from '../logic/session.js';

/**
 * @typedef {{ name: string, stage: string, members: string[], placed: string[], active: number, units: number }} RoomSummary
 *
 * @typedef {object} Summary  What summarize() in src/logic/session.js returns.
 * @property {number} answers
 * @property {RoomSummary[]} rooms
 * @property {{ stage: string, label: string, count: number, rooms: RoomSummary[] }[]} stages
 * @property {{ key: string, name: string, stage: string, choice: 'alone'|'join'|null, joinRoom: string|null }[]} lone
 * @property {{ key: string, name: string, text: string, stage: string|null, isNew: boolean }[]} unclear
 * @property {{ key: string, name: string, lastStage: string|null, isNew: boolean }[]} noAnswer
 * @property {{ key: string, name: string }[]} ignored
 * @property {{ group: string|null, members: { name: string, stage: string }[] }[]} splitGroups
 * @property {{ key: string, name: string, stage: string|null, guess: boolean, suggested: string|null }[]} notInRoom
 * @property {{ key: string, name: string, text: string }[]} flags
 *
 * @typedef {object} Member  One student of the session, with what the roster says about them.
 * @property {string} key
 * @property {string} name
 * @property {string|null} stage     the stage set in this session
 * @property {boolean} guessed       that stage was a guess
 * @property {string|null} message   the chat message the stage was read from
 * @property {boolean} isNew
 * @property {boolean} onRoster
 * @property {boolean} active
 * @property {string|null} group     their working group's name
 *
 * @typedef {{ ok: boolean, lines: string[], items: string[] }} FillResult
 *
 * @typedef {object} SessionView
 * @property {Summary} summary
 * @property {Member[]} members             every student of the session, ignored ones included
 * @property {boolean} hasPlan              Split was pressed
 * @property {boolean} outdated             changed since Split
 * @property {boolean} filled
 * @property {boolean} mixWorkingGroups
 * @property {boolean} filling              Fill is running
 * @property {boolean} endArmed             End was pressed once, less than 5 seconds ago
 * @property {boolean} ownerCreatesRooms    Meet could not create the rooms, so Fill only types names
 * @property {FillResult|null} fillResult
 *
 * @typedef {object} PanelView
 * @property {boolean} loading              true until open() has read the store
 * @property {boolean} starting             Start was pressed and the Meet tab is being looked up
 * @property {string|null} notice
 * @property {string[]} errors              failed Meet reads, one sentence each
 * @property {boolean} ownerNamesMissing
 * @property {SessionView|null} session     null before Start and after End
 *
 * @typedef {object} PanelActions
 * @property {() => Promise<void>} start
 * @property {() => Promise<void>} end
 * @property {() => Promise<void>} split    also Re-split
 * @property {() => Promise<void>} fill
 * @property {(key: string, stageCode: string) => Promise<void>} setStage
 * @property {(key: string, ignored: boolean) => Promise<void>} setIgnored
 * @property {(key: string, choice: 'alone'|'join') => Promise<void>} setLone
 * @property {(on: boolean) => Promise<void>} setMix
 * @property {(key: string) => Promise<void>} toggleActive
 * @property {(key: string, roomName: string) => Promise<void>} markPlaced
 *
 * @typedef {PanelActions & { open: () => Promise<void>, subscribe: (listener: () => void) => void, getView: () => PanelView }} PanelController
 */

const POLL_MS = 2000;
const END_ARMED_MS = 5000;
const NO_MEET_TAB = 'Open the Meet call in this window, then press Start.';

/**
 * @param {{ store: object, findMeet: (meetingCode?: string) => Promise<{ meet: object, meetingCode: string } | null> }} deps
 * @returns {PanelController}
 */
export function createPanelController({ store, findMeet }) {
  let ctx = null;
  let session = null;
  let meet = null;
  let errors = [];
  let notice = null;
  let pollTimer = null;
  let endTimer = null;
  let pollRun = null;
  let filling = false;
  let ownerCreatesRooms = false;
  let fillResult = null;
  let loading = true;
  let starting = false;
  let view = panelView({ session: null, ctx: null, loading: true });
  let published = JSON.stringify(view);
  const listeners = [];

  // Replaces the view and tells the listeners, only when the view changed.
  function publish() {
    const next = panelView({ session, ctx, loading, starting, notice, errors, filling, endArmed: !!endTimer, ownerCreatesRooms, fillResult });
    const json = JSON.stringify(next);
    if (json === published) return;
    published = json;
    view = next;
    for (const listener of listeners) listener();
  }

  // Finds the session's Meet, and finds it again once its tab stops answering (e.g. rejoined in a new tab).
  async function ensureMeet(meetingCode) {
    if (!meet || meet.lost) meet = (await findMeet(meetingCode))?.meet ?? null;
  }

  async function poll() {
    pollTimer = null;
    const polled = session;
    if (!polled || filling) return;
    let done;
    const run = new Promise(resolve => { done = resolve; });
    pollRun = run;
    try {
      await ensureMeet(polled.meetingCode);
      if (session !== polled) return;
      notice = meet ? null : NO_MEET_TAB;
      if (meet) {
        const before = { current: JSON.stringify(session), roster: JSON.stringify(ctx.roster) };
        const failures = await syncFromMeet(meet, session, ctx);
        if (session !== polled) return;
        errors = failures;
        const changed = Object.fromEntries(Object.entries({ current: session, roster: ctx.roster })
          .filter(([name, value]) => JSON.stringify(value) !== before[name]));
        if (Object.keys(changed).length) await store.save(changed);
      }
    } finally {
      if (pollRun === run) pollRun = null;
      done();
    }
    publish();
    if (session === polled && !filling) pollTimer = setTimeout(poll, POLL_MS);
  }

  // Fills Meet's breakout rooms from the plan, with polling paused meanwhile.
  async function fill() {
    const filled = session;
    filling = true;
    clearTimeout(pollTimer);
    pollTimer = null;
    publish();
    await pollRun;
    // After End, `filling` belongs to the next session: End already cleared it.
    if (session !== filled) return;
    await ensureMeet(filled.meetingCode);
    const result = meet ? await fillRooms(meet, filled, { createRooms: !ownerCreatesRooms }) : null;
    if (session !== filled) return;
    filling = false;
    if (!result) {
      notice = NO_MEET_TAB;
    } else if (result.ok) {
      fillResult = { ok: true, lines: ["Rooms filled. Check Meet's breakout panel, then press Open rooms there."], items: [] };
    } else if (result.step === 'create') {
      ownerCreatesRooms = true;
      fillResult = { ok: false, lines: [result.error, 'Create these rooms in Meet, with these names:'], items: session.plan.map(r => r.name) };
    } else {
      fillResult = { ok: false, lines: [result.error, 'Type these names by hand:'], items: result.unfilled.map(u => `${u.name} → ${u.room}`) };
    }
    await store.save({ current: session });
    publish();
    poll();
  }

  async function start() {
    if (starting || session) return;
    starting = true;
    publish();
    const found = await findMeet();
    starting = false;
    if (session) {
      publish();
      return;
    }
    if (!found) {
      notice = NO_MEET_TAB;
      publish();
      return;
    }
    meet = found.meet;
    notice = null;
    session = createSession({ startedAt: new Date().toISOString(), meetingCode: found.meetingCode });
    publish();
    await store.save({ current: session });
    poll();
  }

  async function end() {
    if (!endTimer) {
      endTimer = setTimeout(() => { endTimer = null; publish(); }, END_ARMED_MS);
      publish();
      return;
    }
    clearTimeout(endTimer);
    endTimer = null;
    clearTimeout(pollTimer);
    const record = endSession(session, ctx);
    session = null;
    meet = null;
    errors = [];
    notice = null;
    filling = false;
    ownerCreatesRooms = false;
    fillResult = null;
    const { history } = await store.load();
    history.push(record);
    ctx.lastStages = lastKnownStages(history);
    await store.save({ history, current: null });
    publish();
  }

  // Runs an owner action on the session, saves, then publishes.
  async function act(change) {
    change();
    await store.save({ current: session, roster: ctx.roster });
    publish();
  }

  async function open() {
    const { roster, history, current } = await store.load();
    ctx = { roster, lastStages: lastKnownStages(history) };
    session = current;
    loading = false;
    store.onChange(changes => {
      if (changes.roster) ctx.roster = changes.roster;
      if (changes.history) ctx.lastStages = lastKnownStages(changes.history);
      publish();
    });
    publish();
    if (session) poll();
  }

  return {
    open,
    subscribe: listener => { listeners.push(listener); },
    getView: () => view,
    start,
    end,
    fill,
    split: () => act(() => split(session, ctx)),
    setStage: (key, stageCode) => act(() => setStage(session, ctx, key, stageCode)),
    setIgnored: (key, ignored) => act(() => setIgnored(session, key, ignored)),
    setLone: (key, choice) => act(() => setLone(session, key, choice)),
    setMix: on => act(() => setMix(session, on)),
    toggleActive: key => act(() => { const r = rosterEntry(ctx, key); r.active = !r.active; }),
    markPlaced: (key, roomName) => act(() => markPlaced(session, key, roomName)),
  };
}

/**
 * The view for a state. Pure. The controller uses it for every view; Panel's stories use it for their fixed views.
 * `ctx` is `{ roster, lastStages }`, and may be null while `loading`.
 * @param {{ session: object|null, ctx: { roster: object, lastStages: object }|null, loading?: boolean, starting?: boolean, notice?: string|null, errors?: string[], filling?: boolean, endArmed?: boolean, ownerCreatesRooms?: boolean, fillResult?: FillResult|null }} state
 * @returns {PanelView}
 */
export function panelView({ session, ctx, loading = false, starting = false, notice = null, errors = [], filling = false, endArmed = false, ownerCreatesRooms = false, fillResult = null }) {
  return {
    loading,
    starting,
    notice,
    errors,
    ownerNamesMissing: !loading && ctx.roster.ownerNames.length === 0,
    session: session && {
      summary: summarize(session, ctx),
      members: Object.entries(session.students).map(([key, s]) => {
        const r = rosterEntry(ctx, key);
        return {
          key, name: s.name, stage: s.stage, guessed: s.source === 'guess', message: s.fromMessage, isNew: s.isNew,
          onRoster: r !== null, active: r?.active ?? false, group: r?.group ? ctx.roster.groups[r.group]?.name ?? null : null,
        };
      }),
      hasPlan: session.plan !== null,
      outdated: session.outdated,
      filled: session.filled,
      mixWorkingGroups: session.mixWorkingGroups,
      filling,
      endArmed,
      ownerCreatesRooms,
      fillResult,
    },
  };
}
