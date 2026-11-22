# Murmuration

Chrome extension (Manifest V3) for the owner only: reads students' stage answers
from Google Meet's chat, groups them by stage and fills Meet's breakout panel.

- Spec: `docs/superpowers/specs/2026-11-18-meet-mentoring-groups-design.md`
- Plan: `docs/superpowers/plans/2026-11-20-meet-mentoring-groups-v1.md`
- React port spec: `docs/superpowers/specs/2026-11-21-react-port-and-ui-kit-design.md`
- React port plan: `docs/superpowers/plans/2026-11-21-react-port-and-ui-kit.md`
- Look: `DESIGN.md`
- Look and rows spec: `docs/superpowers/specs/2026-11-22-look-and-rows-design.md`
- Look and rows plan: `docs/superpowers/plans/2026-11-22-look-and-rows.md`
- UI backlog (the kit's audit): `docs/ui-backlog.md`
- UI backlog fixes spec: `docs/superpowers/specs/2026-11-22-ui-backlog-fixes-design.md`
- UI backlog fixes plan: `docs/superpowers/plans/2026-11-22-ui-backlog-fixes.md`

## Commands

- Install: `npm install` (Node 22).
- Tests: `npm test` (Node's built-in runner on `test/*.test.js`).
- Type check: `npm run typecheck`.
- Try the pages without Meet: `npm run dev -- --port 8765 --strictPort`, then open
  `http://localhost:8765/src/panel/panel.html?fake` (also the `panel` entry in
  `.claude/launch.json`).
- Build: `npm run build` writes `dist/`; `npm run watch` rebuilds it on each save.
- Check the built extension: `npm run check:extension`, after a build. It loads `dist/` in
  Playwright's Chromium (run `npx playwright install chromium` once first). It does not cover a live Meet call.
- Load in Chrome: `chrome://extensions` → Developer mode → Load unpacked → the
  `dist/` folder.
- Component catalog: `npm run storybook` (port 6006); `npm run build-storybook` builds it.

## Kits

- ui [react-tailwind-shadcn]
  - serve: npm run dev -- --port {port} --strictPort
  - base-url: http://localhost:{port}
  - checks-from: .
  - look: direction
  - screens: /src/panel/panel.html?fake, /src/panel/panel.html?fake&at=collecting, /src/panel/panel.html?fake&at=split, /src/panel/panel.html?fake&at=filled, /src/roster-page/roster-page.html?fake
  - theme: src/index.css
  - generated: src/components/ui
  - catalog-skip: main.tsx

## Code conventions

- The look follows `DESIGN.md`; the extension is dark only, so tokens in `src/index.css` hold one value each under `:root` and the light values live in `DESIGN.md`.
- The font is a bundled `woff2` in `src/fonts/`, declared in `src/index.css`.
- Every page's `<html>` and Storybook's preview carry `class="dark"`, which keeps the generated components' `dark:` variants on; there is no `.dark` token block.
- The look is hand-edited into `src/components/ui/*` (`icon-sm` is 28 px, and `Input` and `Textarea` are `text-sm` at every width); regenerating a component with the shadcn CLI drops it, so re-apply the edits after.
- The pages are React in `.tsx`, styled with Tailwind and shadcn components and built by Vite into `dist/`; every other file is plain JavaScript.
- `meet.js`, `background.js` and `manifest.json` are copied into `dist/` unchanged.
- The built extension makes no network request.
- Only `src/meet/meet.js` reads or drives Meet's page; it is a classic content script with no imports.
- `src/logic/` modules use no `chrome.*` API and no DOM; each has `test/<module>.test.js`.
- The stage list and track paths live only in `src/logic/stages.js`; other code passes stage codes (`S02DS`) and takes labels from there.
- Students are keyed by `nameKey(displayName)` from `src/logic/roster.js`; never compare raw display names.
- Roster, history and the current session are plain JSON objects, changed in place by logic functions and saved whole through `src/store.js` under `chrome.storage.local` keys `roster`, `history`, `current`.
- Pages may set a roster student's `track`, `active` or `group`, a group's `name` and `ownerNames` directly; adding students or groups goes through `src/logic/roster.js`.
- Hand-written components import `cn` from `@/lib/utils`; only the generated `src/components/ui/*` import it from `"cn"`.
- Every component `.tsx` has a `<name>.stories.tsx` beside it in Storybook's object form (`satisfies Meta<typeof X>`), with callbacks from `fn()` of `storybook/test` and no `play` assertions.
- Meet operations resolve to `{ ok: true, ... }` or `{ ok: false, op, error }` and never throw; `error` is a sentence the owner can act on.
- Each Meet op in `src/meet/meet.js` stops within `OP_MS`, below `TIMEOUT_MS` in `src/panel/meet-client.js`; change them together.
- Chat text and display names are untrusted: put them in the page as React text children, never `dangerouslySetInnerHTML`.
- Look up name keys with `Object.hasOwn`, never `in`: keys come from untrusted display names.
- Write name-keyed entries with `setOwn(obj, key, value)` from `src/logic/roster.js` (an enumerable, writable, configurable `Object.defineProperty`), never `obj[key] =`, so a name like `__proto__` stays an ordinary key.
- No inline `<script>` or `on…=` attributes in extension pages (MV3 content security policy), and no `confirm()` or `alert()` in the side panel.
- `?fake` on a page means the fake Meet, demo data and an in-memory store, never `chrome.storage`.
- `?fake&at=<state>` opens the fake panel in that state (`collecting`, `split`, `filled`), built by `src/panel/fake-states.js`.
- The `key` line in `manifest.json` pins the extension's id; it is never removed or changed.
- The panel's behaviour lives in `src/panel/controller.js`; components read its view and call its functions, and keep no session state.
- A page's sections used once are functions inside the page's `.tsx`; an empty section renders nothing unless the spec gives it an empty-state line.
- A page's `main.tsx` creates its controller or store outside React and renders the page inside `<StrictMode>`; the panel subscribes one `draw` to the controller.
- Panel stories build each fixed view with a `loaders` function from `fakeAt(at)` and `panelView`, changing state only through `src/logic/` functions before the call.
- A `Select` option meaning "no value" uses the value `none`, mapped to and from `null` at the component.
- The Panel keeps End and Fill off while the view says `filling`; a running Fill cannot be cancelled, so nothing else may drive Meet until it returns.
- Page text fields that save to the store are uncontrolled (`defaultValue`), save on blur when changed, and are keyed by the saved value; Enter in a one-line field blurs it.
- A table that scrolls sideways sits in `div[role=region][aria-label][tabIndex=0].overflow-x-auto` with a visible `rounded-md border` and the `scroll-shadow-x` utility from `src/index.css` > a `div` with the minimum width > `Table`; the width never goes on `Table`.
- Hand-written components declare no return type.
- List rows are keyed by their stable identity: a student by name key, a room by its name, a working group by its id; rows with no control may be keyed by index.
- Every panel row uses the one row grid in `Panel.tsx`: the name cell first, then fixed trailing columns; a row action is an icon button whose label is its tooltip and accessible name.
- A room's pill, rows and tally cluster all draw from `roomPeople` in `Panel.tsx` (members, then students placed after Fill); pages do not read the summary's `room.active` or `room.units`.
