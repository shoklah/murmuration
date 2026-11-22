import '../index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createStore } from '../store.js';
import { createPanelController } from './controller.js';
import { fakeAt, playDemo } from './fake-states.js';
import { findMeetTab, createMeetClient } from './meet-client.js';
import { Panel } from './Panel';

const ROSTER_PAGE = 'src/roster-page/roster-page.html';

const params = new URLSearchParams(location.search);
const fake = params.has('fake') ? await fakeAt(params.get('at')) : null;

const controller = createPanelController(fake
  ? { store: fake.store, findMeet: async () => ({ meet: fake.meet, meetingCode: 'abc-defg-hij' }) }
  : {
    store: createStore(),
    findMeet: async meetingCode => {
      const tab = await findMeetTab(meetingCode);
      return tab && { meet: createMeetClient(tab.tabId), meetingCode: tab.meetingCode };
    },
  });

const root = createRoot(document.getElementById('root')!);

function draw() {
  root.render(
    <StrictMode>
      <Panel
        view={controller.getView()}
        actions={controller}
        rosterHref={fake ? '../roster-page/roster-page.html?fake' : '#'}
        onOpenRoster={fake ? undefined : () => { chrome.tabs.create({ url: chrome.runtime.getURL(ROSTER_PAGE) }); }}
        fake={fake ? {
          rooms: fake.meet.rooms,
          say: fake.meet.say,
          join: fake.meet.join,
          playDemo: () => playDemo(fake.meet),
        } : undefined}
      />
    </StrictMode>,
  );
}

controller.subscribe(draw);
draw();
controller.open();
