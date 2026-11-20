// Saves the roster, history and current session whole, under chrome.storage.local
// keys `roster`, `history`, `current`; or in memory for `?fake` pages.

import { emptyRoster } from './logic/roster.js';

const KEYS = ['roster', 'history', 'current'];

const withDefaults = data => ({ roster: data.roster ?? emptyRoster(), history: data.history ?? [], current: data.current ?? null });

export function createStore({ memory = false, seed = {} } = {}) {
  if (memory) {
    const data = structuredClone(seed);
    return {
      async load() { return structuredClone(withDefaults(data)); },
      async save(changes) { Object.assign(data, structuredClone(changes)); },
      onChange() {},
    };
  }
  return {
    async load() { return withDefaults(await chrome.storage.local.get(KEYS)); },
    async save(changes) { await chrome.storage.local.set(changes); },
    onChange(cb) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        cb(Object.fromEntries(Object.entries(changes).map(([key, change]) => [key, change.newValue])));
      });
    },
  };
}
