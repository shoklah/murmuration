// The roster page's entry. `?fake` uses the demo roster and history in an in-memory store.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { createStore } from '@/store.js';
import { DEMO } from '@/panel/demo.js';
import { RosterPage, type RosterStore } from './RosterPage';

const fake = new URLSearchParams(location.search).has('fake');
const store: RosterStore = fake
  ? createStore({ memory: true, seed: { roster: DEMO.roster, history: DEMO.history } })
  : createStore();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RosterPage store={store} />
  </StrictMode>,
);
