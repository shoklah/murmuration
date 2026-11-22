# Murmuration React port and UI kit adoption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the side panel and the roster page to React, Tailwind and shadcn components built by Vite into `dist/`, with the same sections, controls and wording as version 1, and give the UI kit what it needs: a served `?fake` app with addressable states, Playwright, a Storybook catalog and the `## Kits` lines.

**Architecture:** The panel's behaviour moves out of the page into a plain JavaScript controller (`src/panel/controller.js`). It owns the session, the 2-second poll, Fill and End, publishes one view object, and is tested with `node --test`. `Panel` is a React component that draws that view and calls the controller's functions. `RosterPage` keeps its small load, change, save loop inside the component. Vite builds the two HTML pages and copies `manifest.json`, `src/background.js` and `src/meet/meet.js` into `dist/` unchanged.

**Tech Stack:** Vite, React, TypeScript for `.tsx` only (`allowJs`, strict), Tailwind CSS v4, shadcn components (Radix), Storybook (`@storybook/react-vite`), Playwright with `@axe-core/playwright`, Node 22's built-in test runner, npm. Versions: the current stable release of each, pinned by `package-lock.json`.

**Spec:** `docs/superpowers/specs/2026-11-21-react-port-and-ui-kit-design.md`. This plan covers step 1, the port, only. Executors read the spec with their task: its sections "Components", "The kit's points, per screen" and "`CLAUDE.md` after the port" are named below and not repeated.

## Global Constraints

- "Same sections, same controls, same wording, on the stack's neutral look." No section's layout changes, the rooms preview included: "Rows keep their current contents and order."
- No task changes `src/logic/`, `src/meet/meet.js`, `src/meet/fake-meet.js`, `src/store.js`, `src/panel/meet-client.js`, `src/background.js`, or the manifest's permissions.
- "The manifest keeps its paths." Its only change is the `key` line (Task 2).
- "`meet.js` and `background.js` are classic scripts with no imports. They are copied, not bundled", byte for byte.
- Manifest V3 content security policy: "no inline script, no `eval`. The built pages load only script files from `dist/`."
- The built extension makes no network request: no CDN, no web font. "The port uses the system font."
- "Text is always a React child, never `dangerouslySetInnerHTML`."
- Light mode only: "The theme file keeps the dark values shadcn generates, but nothing switches them on."
- `confirm()` stays on the roster page. The side panel uses no `confirm()` and no `alert()`.
- npm. No linter, no formatter, no component test runner (no Vitest).
- "React components and their stories are TypeScript (`.tsx`)"; "Everything else stays plain JavaScript". Existing JavaScript files get no type annotations.
- shadcn components: exactly `button`, `select`, `badge`, `checkbox`, `label`, `input`, `textarea`, `table`, `alert`, `toggle`. An implementer who needs another one reports it and does not run the shadcn CLI.
- Colours, type sizes, radii and shadows come from the theme's tokens. In every `.ts`, `.tsx` and `.css` file outside `src/index.css` and `src/components/ui/`: no hex colour, no `rgb()`, `hsl()` or `oklch()`, no Tailwind default-palette colour (`text-red-500`), and no arbitrary value on `text-`, `bg-`, `rounded-`, `shadow-`, `font-`, `leading-` or `tracking-`.
- The project's `CLAUDE.md` `## Code conventions` apply to every task, as the tasks before it left them.

## Review Focus

1. **End pressed while a poll or Fill is still waiting on Meet.** The ended session must not be saved back or shown again. Pinned in Task 4: "End while a poll is waiting on Meet: the ended session does not come back" and "End while Fill is waiting on Meet: the ended session does not come back".
2. **The Meet tab closed, reloaded or rejoined mid-session.** The panel looks the call's tab up again by meeting code, says "Open the Meet call in this window, then press Start." while there is none, and keeps the session. Pinned in Task 4: "a Meet tab that stops answering is looked up again by meeting code" and "Fill with no Meet tab shows the notice and fills nothing".
3. **The roster edited on the roster page while the panel is open** (the owner's names, a working group, ★). The panel shows it without a restart. Pinned in Task 4: "a roster saved from the roster page shows without a poll".
4. **Display names and chat text that are hostile or awkward:** `__proto__`, HTML such as `<b>Bold</b>`, a 300-character word. They show as text, as ordinary students, with no sideways scroll. Pinned in Task 4: "a participant named __proto__ is an ordinary student". The demo's `<b>Bold</b>` student and Sam's 318-character message are on the `?fake&at=collecting` screen, which Task 7's screens check captures at 375 px and fails on sideways scroll.
5. **Start pressed twice quickly.** One session, one Meet lookup. Pinned in Task 4: "Start pressed twice starts one session".
6. **Fill pressed while a poll is still waiting on Meet.** The poll finishes before any room is filled, and one poll, not two, runs every 2 seconds afterwards. Pinned in Task 4: "Fill pressed while a poll is waiting on Meet: the poll finishes first, and one poll follows the Fill".

---

## File structure

```
package.json, package-lock.json     scripts and dependencies (Tasks 1 to 3)
.gitignore                          node_modules/, dist/, storybook-static/ (Task 1)
vite.config.js                      two HTML entries, React, Tailwind, the extension-files copy (Task 1)
tsconfig.json                       strict .tsx, allowJs, the @/ alias (Task 1)
.claude/launch.json                 the panel entry runs the dev server (Task 1)
manifest.json                       gains "key" (Task 2)
scripts/check-extension.mjs         the built-extension smoke check (Task 2)
components.json, src/lib/utils.ts   written by shadcn init (Task 3)
.storybook/main.ts, preview.ts      the catalog's set-up (Task 3)
src/index.css                       Tailwind and the shadcn theme: the kit's theme file (Tasks 1, 3)
src/components/ui/*.tsx             the ten shadcn components, a .stories.tsx beside each (Task 3)
src/components/StageSelect.tsx      )
src/components/ActiveToggle.tsx     ) shared components, a .stories.tsx beside each (Task 6)
src/components/ClampedText.tsx      )
src/panel/controller.js             the panel's behaviour and its view (Task 4)
src/panel/fake-states.js            the fake Meet and store at a ?fake&at= state (Task 5)
src/panel/panel.html                loads main.tsx (Task 7)
src/panel/main.tsx                  creates the controller, draws Panel (Task 7)
src/panel/Panel.tsx, .stories.tsx   the side panel (Task 7)
src/roster-page/roster-page.html    loads main.tsx (Task 8)
src/roster-page/main.tsx            creates the store, draws RosterPage (Task 8)
src/roster-page/RosterPage.tsx, .stories.tsx   the roster page (Task 8)
test/controller.test.js             (Task 4)
test/fake-states.test.js            (Task 5)
CLAUDE.md                           commands, conventions, ## Kits (each task adds its own lines)

removed: src/panel/panel.js, src/panel/panel.css (Task 7);
         src/roster-page/roster-page.js, src/roster-page/roster-page.css (Task 8); src/dom.js (Task 9)
```

Tasks 1 to 6 leave the old plain pages working: Vite builds and serves them as they are until Tasks 7 and 8 replace them.

## For the session running implementation

- **Worktree.** The run happens in a worktree of its own. The folder Chrome loads the extension from today is not touched.
- **Ignored folder.** From Task 1 on, `node_modules` exists and is ignored: pass `--link node_modules` to `failing-test-check.py` and to `wave.py start`.
- **Automated checks after each task:** `npm test` always; `npm run typecheck` and `npm run build` from Task 1; `npm run check:extension` (right after the build) from Task 2; `npm run build-storybook` from Task 3. After the wave, a `check:extension` failure on the panel goes back to Task 7, one on the roster page to Task 8.
- **Failing-test check.** Tasks 4 and 5 only, with `-- node --test test/controller.test.js` and `-- node --test test/fake-states.test.js`. Every other task carries an exemption in its header.
- **The shadcn CLI.** Task 3's Step 1 is yours, before you dispatch that task's implementer. The owner approved this for the ten components above, as a one-time exception to the kit's rule; the run does not pause for it. No subagent runs the CLI.
- **Wave A** is Tasks 7 and 8. They share no file. Neither edits `CLAUDE.md`, `src/index.css`, `package.json` or anything under `src/components/`.
- **The hand check.** After Wave A is merged and its checks pass, with the dev server you started for the kit's checks, in the browser. Write the result in the ledger.
  - **The panel,** `/src/panel/panel.html?fake`: Start, Play demo answers, Split, Fill and End behave as in version 1.
  - **An open dropdown stays open.** An open Radix `Select` closes on a press outside it, so the answer is sent first. After Start and Play demo answers, send `Mia: S02 SE` from the Fake Meet box and open another student's stage dropdown, both in one batch of browser actions, inside the 2 seconds before the next poll. Read the page at once: the dropdown is open and the tally still says 9 answers. Read it again 3 seconds later: it says 10 answers and the dropdown is still open. If the first read already says 10, do it again with another student.
  - **The roster page,** `/src/roster-page/roster-page.html?fake`, which the spec's hand check does not list: change a track, press a ★, add a working group, put a student in it, delete it (the confirm question shows), change Your Meet names and leave the field, then Export backup and Import backup with that same file (the confirm question shows, then the same roster). If the browser cannot pick a file, do the export and the import with a throwaway Playwright script that is not committed.
- **At the finish,** give the owner the spec's "Switching over" steps as they are written: they are the owner's, after the merge. The local tag `v1` is never pushed.

## The UI kit in this run

- **Kit tasks:** 7 and 8, marked `**Kit:** ui [react-tailwind-shadcn]` with their `**Screens:**`. Task 6 carries `**Kit:** exempt:`: it writes controls a person uses, but no screen shows them until Tasks 7 and 8, whose checks and review cover them. Line for the owner: `Kits: ui [react-tailwind-shadcn] on tasks 7 and 8; task 6 exempt`.
- **From when the checks apply:** from Task 7. The kit's prerequisites are complete after Task 3 (the serve command and Playwright with axe from Task 1, the catalog and the `## Kits` lines from Task 3), and the screens the checks capture exist once Tasks 7 and 8 are merged. Tasks 3 and 6 add catalog entries without changing a screen, so neither gets the kit's checks or its reviewer; each runs the catalog check as a plain verification step, and Task 9 runs the token and catalog checks over the whole branch.
- **Briefs** of Tasks 6, 7 and 8 name, as files to read in full first, the kit's `guidance.md` and the stack's `stack.md` (the paths `kit.py show ui --stack react-tailwind-shadcn` prints). No task builds motion, so no task carries the `motion` tag.
- **Adoption is pending:** the project carries `look: direction` with `adopted: no`. There is no `DESIGN.md` yet, so tasks follow the kit's floor, and the kit reviewer says at the top of its report that the look is judged against the floor only.
- **No mockups:** no section's layout changes. The kit reviewer judges against the spec's "The kit's points, per screen" and the task brief.
- **How a kit finding is ruled in this step.** Every `kit-reviewer` brief carries, word for word, the two rules under "How a kit finding is ruled in this step" in the spec: which findings go into a fix round, and which go on the look step's list with no fix round. That list is given to the owner at the finish.

---

### Task 1: Toolchain and the `dist/` build

**Failing-test check:** exempt: build set-up and configuration; no new behaviour.

**Files:**
- Create: `vite.config.js`, `tsconfig.json`, `src/index.css`, `.gitignore`, `package-lock.json`
- Modify: `package.json`, `.claude/launch.json`, `CLAUDE.md` (the Commands section; three convention lines)

**Interfaces:**
- Produces: the npm scripts `dev`, `build`, `watch`, `typecheck` and `test`; a Vite plugin named `extension-files` (Task 3 keeps it out of Storybook's build by that name); the alias `@/` for `src/`; `src/index.css` as the one CSS entry, which Tasks 7 and 8 and Storybook import.

- [ ] **Step 1: Install the tools**

```bash
npm install react react-dom
npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom @types/chrome tailwindcss @tailwindcss/vite playwright @axe-core/playwright
npx playwright install chromium
```

- [ ] **Step 2: Set the scripts in `package.json`**, keeping `name`, `private` and `type`:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "watch": "vite build --watch",
  "typecheck": "tsc --noEmit",
  "test": "node --test \"test/*.test.js\""
}
```

`npm test` names the test folder because the repo root now holds `dist/` and, from Task 3, `storybook-static/`, which Node's runner would otherwise search for test files. It runs the same tests as before.

- [ ] **Step 3: Write `.gitignore`** with three lines: `node_modules/`, `dist/`, `storybook-static/`.

- [ ] **Step 4: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "allowJs": true,
    "checkJs": false,
    "noEmit": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "types": ["vite/client", "chrome"],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src", ".storybook/*.ts"],
  "exclude": ["src/meet/meet.js", "src/background.js"]
}
```

`include` names `.storybook/*.ts` because TypeScript skips a bare `.storybook` entry, and Task 3's two files would then never be checked. The two excluded files are classic scripts: left in, their top-level names (`nameKey`, `waitFor`, `ops`) count as globals, and a `.tsx` that calls `nameKey` with no import passes the type check and throws in the page.

- [ ] **Step 5: Write `src/index.css`** with one line: `@import "tailwindcss";`. Task 3's `shadcn init` adds the theme to it.

- [ ] **Step 6: Write `vite.config.js`**

It holds:
- the plugins `react()` and `tailwindcss()`;
- the alias `@` for the `src` folder;
- a multi-page build with two HTML entries, `src/panel/panel.html` and `src/roster-page/roster-page.html`, so the built pages land at those same paths under `dist/`;
- a plugin written inline in this file, with no plugin dependency: `name: 'extension-files'`, `apply: 'build'`. After each bundle is written, the first build and every rebuild in watch mode, it:
  1. copies `manifest.json`, `src/background.js` and `src/meet/meet.js` into the build's output folder at the same relative paths with `fs.copyFile`, so the bytes are untouched;
  2. reads the copied manifest and checks that `background.service_worker`, `side_panel.default_path` and every path under `content_scripts[].js` exists in the output folder. If one is missing, the build fails with `manifest.json names <path>, which is not in dist/`.

  It also registers the three files as watch files, so `npm run watch` rebuilds and copies when one of them changes.

Keep Vite's default `base`: the built pages then load `/assets/…`, which is the extension's own root.

- [ ] **Step 7: Point `.claude/launch.json` at the dev server**

```json
{"version": "0.0.1", "configurations": [{"name": "panel", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev", "--", "--port", "8765", "--strictPort"], "port": 8765}]}
```

- [ ] **Step 8: Update `CLAUDE.md`**

Replace the Commands section's list with:

```markdown
- Install: `npm install` (Node 22).
- Tests: `npm test` (Node's built-in runner on `test/*.test.js`).
- Type check: `npm run typecheck`.
- Try the pages without Meet: `npm run dev -- --port 8765 --strictPort`, then open
  `http://localhost:8765/src/panel/panel.html?fake` (also the `panel` entry in
  `.claude/launch.json`).
- Build: `npm run build` writes `dist/`; `npm run watch` rebuilds it on each save.
- Load in Chrome: `chrome://extensions` → Developer mode → Load unpacked → the
  `dist/` folder.
```

Under `## Code conventions`, replace the line "Plain JavaScript ES modules, no build step, no dependencies (no npm packages, dev ones included)." with the first line below, and add the other two:

```markdown
- The pages are React in `.tsx`, styled with Tailwind and shadcn components and built by Vite into `dist/`; every other file is plain JavaScript.
- `meet.js`, `background.js` and `manifest.json` are copied into `dist/` unchanged.
- The built extension makes no network request.
```

The first line states the rule the port lands on; the pages themselves become React in Tasks 7 and 8.

- [ ] **Step 9: Verify**

```bash
npm test
npm run typecheck
npm run build
cmp manifest.json dist/manifest.json && cmp src/background.js dist/src/background.js && cmp src/meet/meet.js dist/src/meet/meet.js
grep -n '<script' dist/src/panel/panel.html dist/src/roster-page/roster-page.html
```

Expected: 101 tests pass; `typecheck` and `build` exit 0; `cmp` prints nothing; every `<script` line `grep` prints carries `src=`.

The manifest check, once by hand (macOS `sed`):

```bash
sed -i '' 's#src/panel/panel.html#src/panel/missing.html#' manifest.json; npm run build; git checkout manifest.json; npm run build
```

Expected: the first build fails with `manifest.json names src/panel/missing.html, which is not in dist/`; the second passes.

Watch mode and the dev server:

```bash
node_modules/.bin/vite build --watch & WATCH=$!; sleep 8; rm dist/manifest.json; touch manifest.json; sleep 5; ls dist/manifest.json; kill $WATCH
node_modules/.bin/vite --port 8799 --strictPort & DEV=$!; sleep 4; curl -sf 'http://localhost:8799/src/panel/panel.html?fake' | grep -c '<title>Murmuration</title>'; kill $DEV
```

Expected: `dist/manifest.json` is listed again; `grep` prints `1`. Both lines run Vite itself, which is what `npm run watch` and `npm run dev` run, so `kill` stops the process that holds the port. The port is 8799 because 8765 is the owner's own preview.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json .gitignore vite.config.js tsconfig.json src/index.css .claude/launch.json CLAUDE.md
git commit -m "build: Vite, TypeScript and Tailwind, with dist/ for Chrome"
```

---

### Task 2: The extension's id and the built-extension smoke check

**Failing-test check:** exempt: the smoke script is itself the check and needs a build and a browser; the `key` line is configuration.

**Files:**
- Create: `scripts/check-extension.mjs`
- Modify: `manifest.json` (add `key`), `package.json` (one script), `CLAUDE.md` (one command, one convention)

**Interfaces:**
- Consumes: `npm run build` and the `dist/` layout from Task 1.
- Produces: `npm run check:extension`, which the session runs after every later task's build.

- [ ] **Step 1: Add the `key` line to `manifest.json`**

Make the public half of a new key pair. The private half goes through the pipe and is never written to disk:

```bash
openssl genrsa 2048 2>/dev/null | openssl rsa -pubout -outform DER 2>/dev/null | openssl base64 -A
```

Add `"key": "<that output>"` after the `"version"` line. Nothing else in the manifest changes.

- [ ] **Step 2: Write `scripts/check-extension.mjs`**

One script, using the `playwright` package. Playwright's documented way to load an unpacked extension is a persistent context with `channel: 'chromium'` and the arguments `--disable-extensions-except=<dist>` and `--load-extension=<dist>` (https://playwright.dev/docs/chrome-extensions); it runs headless. The profile is a fresh temporary folder, so `chrome.storage` is real and empty; the script removes it and closes the browser whether or not a check fails.

- Check 1, `background registers`: within 10 seconds a service worker is registered whose URL ends with `/src/background.js`. The extension's id is that URL's host.
- Check 2, `pages open`: `chrome-extension://<id>/src/panel/panel.html` shows a button named `Start`, and `chrome-extension://<id>/src/roster-page/roster-page.html` shows the heading `Roster`. Neither page logs a console error or throws an uncaught error.
- Check 3, `Start without a Meet tab`: on the panel, pressing `Start` shows the text `Open the Meet call in this window, then press Start.`
- Check 4, `no request leaves the extension`: across the whole run, no page requested a URL that does not start with `chrome-extension://`. The spec lists the first three checks; the owner added this one when approving the plan, for the spec's anti-goal "The built extension makes a network request".

Find the elements by role and text, not by id, so the script passes on today's plain pages and on the React ones. Print `ok  <check name>` for each check and exit 0; on the first failure print `FAILED  <check name>: <what was seen>` and exit 1.

- [ ] **Step 3: Add the script to `package.json`:** `"check:extension": "node scripts/check-extension.mjs"`.

- [ ] **Step 4: Update `CLAUDE.md`**

Add to the Commands list, after the Build line:

```markdown
- Check the built extension: `npm run check:extension`, after a build. It loads `dist/` in
  Playwright's Chromium. It does not cover a live Meet call.
```

Add under `## Code conventions`:

```markdown
- The `key` line in `manifest.json` pins the extension's id; it is never removed or changed.
```

- [ ] **Step 5: Verify**

```bash
npm run build && npm run check:extension; npm test
```

Expected: four `ok` lines and exit 0; 101 tests pass.

- [ ] **Step 6: Commit**

```bash
git add manifest.json scripts/check-extension.mjs package.json CLAUDE.md
git commit -m "build: pin the extension id and smoke-check the built extension"
```

---

### Task 3: The shadcn components, the Storybook catalog and the `## Kits` lines

**Failing-test check:** exempt: generated components, configuration and catalog entries; no new behaviour.

**Files:**
- Create, by the shadcn CLI: `components.json`, `src/lib/utils.ts`, and `button.tsx`, `select.tsx`, `badge.tsx`, `checkbox.tsx`, `label.tsx`, `input.tsx`, `textarea.tsx`, `table.tsx`, `alert.tsx`, `toggle.tsx` under `src/components/ui/`
- Modify, by the shadcn CLI: `src/index.css`, `package.json`, `package-lock.json`
- Create, by the implementer: `.storybook/main.ts`, `.storybook/preview.ts`, and a `<name>.stories.tsx` beside each of the ten components
- Modify, by the implementer: `package.json` (Storybook and two scripts), `CLAUDE.md` (one command, the `## Kits` section)

**Interfaces:**
- Consumes: Task 1's `src/index.css`, `@/` alias and the plugin name `extension-files`.
- Produces: the ten components under `@/components/ui/`; `cn` from `@/lib/utils`; the catalog (`npm run storybook`, `npm run build-storybook`) with the stories glob `src/**/*.stories.tsx`; the `## Kits` section the kit's checks are run from.

- [ ] **Step 1 (the session, before dispatching the implementer): run the shadcn CLI**

```bash
npx shadcn@latest init --help
npx shadcn@latest init --base radix     # plus what --help shows it needs to ask nothing
npx shadcn@latest add button select badge checkbox label input textarea table alert toggle
```

`init` must end on three things: the Radix library, base colour neutral, CSS variables on. Tasks 6 and 8 rely on how Radix behaves. On CLI 4.23.0, `-b, --base` picks the component library (`base`, `radix` or `aria`) and the CLI's own default is Base UI; CSS variables are on by default; there is no base-colour flag, so the colour comes from the preset or a question and is checked below. Never pass `--defaults`: it means the Next template and a Base UI preset. If `--help` shows other flags, use the ones that give the same three results.

Then check. Fix by hand only what the third and fourth lines say; anything else wrong means `init` is run again:
- `components.json` has `"rsc": false`, `"tsx": true`, `"tailwind.css": "src/index.css"`, `"tailwind.baseColor": "neutral"`, `"tailwind.cssVariables": true`, and the aliases `@/components`, `@/components/ui`, `@/lib/utils`.
- `package.json` depends on Radix (`radix-ui`, or `@radix-ui/…` packages) and on no Base UI or React Aria package (`@base-ui/…`, `@base-ui-components/…`, `react-aria-components`).
- `src/components/ui/` holds exactly the ten `.tsx` files above. Remove any other the CLI added.
- `src/index.css` imports no web font. If `init` added one (an `@fontsource…` import, a font package, a `--font-sans` that names it), remove the import, the package and the name, so the system font applies.
- `npm run typecheck` and `npm run build` pass.

```bash
git add components.json src package.json package-lock.json
git commit -m "chore: shadcn init and the ten approved components"
```

- [ ] **Step 2: Install Storybook and write its set-up**

```bash
npm install -D storybook @storybook/react-vite
```

`.storybook/main.ts`:

```ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
  framework: '@storybook/react-vite',
  core: { disableTelemetry: true },
  // Storybook reuses vite.config.js; the extension's copy step has no place in the catalog's build.
  viteFinal: config => ({
    ...config,
    plugins: config.plugins?.flat().filter(plugin => !(plugin && 'name' in plugin && plugin.name === 'extension-files')),
  }),
};

export default config;
```

`.flat()`, not `.flat(Infinity)`: the deeper form fails the type check (TS2589), and the copy plugin is a top-level entry of the list.

`.storybook/preview.ts` imports `../src/index.css` and exports an empty `Preview`.

Add to `package.json`: `"storybook": "storybook dev -p 6006"` and `"build-storybook": "storybook build"`.

- [ ] **Step 3: Write a stories file beside each of the ten components**

Each is `src/components/ui/<name>.stories.tsx` in Storybook's object form: a default export `{ component, args } satisfies Meta<typeof X>`, and one named `StoryObj` export per story. Stories have no `play` assertions: the project has no component test runner. One story per variant and state the port uses:

| Component | Stories |
|---|---|
| `button` | Primary, Outline, Ghost, Secondary, Small (`size: 'sm'`), Disabled |
| `select` | Placeholder (`stage…`), WithValue, Disabled |
| `badge` | Secondary (`new`) |
| `checkbox` | Unchecked, Checked, Disabled, each with a `Label` |
| `label` | Default, beside an `Input` |
| `input` | Empty (placeholder), Filled, File (`type: 'file'`) |
| `textarea` | Empty, Filled |
| `table` | Default (a header and three rows), Empty (one row spanning the columns) |
| `alert` | Default, Destructive |
| `toggle` | Off, On |

- [ ] **Step 4: Update `CLAUDE.md`**

Add to the Commands list:

```markdown
- Component catalog: `npm run storybook` (port 6006); `npm run build-storybook` builds it.
```

Add this section between Commands and Code conventions:

```markdown
## Kits

- ui [react-tailwind-shadcn]
  - serve: npm run dev -- --port {port} --strictPort
  - base-url: http://localhost:{port}
  - checks-from: .
  - look: direction
  - adopted: no
  - screens: /src/panel/panel.html?fake, /src/panel/panel.html?fake&at=collecting, /src/panel/panel.html?fake&at=split, /src/panel/panel.html?fake&at=filled, /src/roster-page/roster-page.html?fake
  - theme: src/index.css
  - generated: src/components/ui
  - catalog-skip: main.tsx
```

The `at=` screens exist from Tasks 5 and 7.

- [ ] **Step 5: Verify**

```bash
npm run typecheck && npm run build && npm run build-storybook && npm test
node ~/.claude/kits/ui/stacks/react-tailwind-shadcn/checks/check-catalog.mjs --base "$(git merge-base HEAD main)" --skip main.tsx
```

Expected: the four commands pass, with 101 tests; the catalog check exits 0. A passing `build-storybook` also shows the copy plugin stayed out of it: its manifest check would fail there.

- [ ] **Step 6: Commit**

```bash
git add .storybook src/components/ui package.json package-lock.json CLAUDE.md
git commit -m "feat: Storybook catalog for the shadcn components, and the UI kit's lines"
```

---

### Task 4: The panel controller

**Files:**
- Create: `src/panel/controller.js`
- Test: `test/controller.test.js`
- Modify: `CLAUDE.md` (one convention)

`src/panel/panel.js` is not changed here: the old page keeps using it until Task 7 removes it.

**Interfaces:**
- Consumes: `src/logic/flow.js` (`syncFromMeet`, `fillRooms`), `src/logic/history.js` (`lastKnownStages`), `src/logic/session.js` (`createSession`, `setStage`, `setIgnored`, `setLone`, `setMix`, `split`, `markPlaced`, `summarize`, `endSession`, `rosterEntry`), and a store with `load()`, `save(changes)` and `onChange(cb)` as `src/store.js` makes.
- Produces, from `src/panel/controller.js`:

```js
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

/**
 * @param {{ store: object, findMeet: (meetingCode?: string) => Promise<{ meet: object, meetingCode: string } | null> }} deps
 * @returns {PanelController}
 */
export function createPanelController({ store, findMeet }) {}

/**
 * The view for a state. Pure. The controller uses it for every view; Panel's stories use it for their fixed views.
 * `ctx` is `{ roster, lastStages }`, and may be null while `loading`.
 * @param {{ session: object|null, ctx: { roster: object, lastStages: object }|null, loading?: boolean, starting?: boolean, notice?: string|null, errors?: string[], filling?: boolean, endArmed?: boolean, ownerCreatesRooms?: boolean, fillResult?: FillResult|null }} state
 * @returns {PanelView}
 */
export function panelView({ session, ctx, loading = false, starting = false, notice = null, errors = [], filling = false, endArmed = false, ownerCreatesRooms = false, fillResult = null }) {}
```

Task 7 imports these types with `import type { PanelView, PanelActions } from './controller.js'`. `panelView` declares its parameter because, without the `@param`, TypeScript reads the types off the defaults (`notice?: null`, `errors?: never[]`, `fillResult?: null`), and a story that passes a notice, an error list or a fill result fails the type check.

- [ ] **Step 1: Write the failing test, `test/controller.test.js`**

```js
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createPanelController } from '../src/panel/controller.js';
import { createStore } from '../src/store.js';
import { createFakeMeet } from '../src/meet/fake-meet.js';
import { createSession } from '../src/logic/session.js';
import { emptyRoster } from '../src/logic/roster.js';

const NO_MEET_TAB = 'Open the Meet call in this window, then press Start.';
const ANSWERS = [['Ana', 'S02 SE'], ['Ben', 's2 se'], ['Cleo', 'S02 SE'], ['Dan', 'PW'], ['Eva', 'preseason web']];

// Lets every pending promise step run; timers are mocked, so nothing else moves time.
const settle = () => new Promise(resolve => setImmediate(resolve));

// A controller on an in-memory store and a fake Meet. `saves` lists the keys of each save,
// `lookups` the meeting code of each findMeet call, `reads` counts chat reads (one per poll).
function setup({ unsupported = [], ownerNames = ['Mentor'], current = null, answers = ANSWERS } = {}) {
  mock.timers.enable({ apis: ['setTimeout'] });
  const roster = emptyRoster();
  roster.ownerNames = ownerNames;
  const memory = createStore({ memory: true, seed: { roster, history: [], current } });
  const h = { saves: [], lookups: [], reads: 0, found: true, storeChanged: null };
  h.store = {
    load: memory.load,
    save: async changes => { h.saves.push(Object.keys(changes).sort()); await memory.save(changes); },
    onChange: cb => { h.storeChanged = cb; },
  };
  h.meet = createFakeMeet({ participants: ['Mentor', 'Ana', 'Ben', 'Cleo', 'Dan', 'Eva'], unsupported });
  const readChat = h.meet.readChat;
  h.meet.readChat = () => { h.reads++; return readChat(); };
  for (const [sender, text] of answers) h.meet.say(sender, text);
  h.controller = createPanelController({
    store: h.store,
    findMeet: async meetingCode => { h.lookups.push(meetingCode); return h.found ? { meet: h.meet, meetingCode: 'abc-defg-hij' } : null; },
  });
  h.view = () => h.controller.getView();
  h.tick = async ms => { mock.timers.tick(ms); await settle(); };
  return h;
}

// Opened, started, first poll done.
async function started(options) {
  const h = setup(options);
  await h.controller.open();
  await h.controller.start();
  await settle();
  return h;
}

// Lets a poll that is still running finish on the mocked clock before the real one comes back.
test.afterEach(async () => { await settle(); mock.timers.reset(); });

test('before open the view is loading; after open with nothing saved there is no session', async () => {
  const h = setup({ ownerNames: [] });
  assert.deepEqual(h.view(), { loading: true, starting: false, notice: null, errors: [], ownerNamesMissing: false, session: null });
  await h.controller.open();
  assert.deepEqual(h.view(), { loading: false, starting: false, notice: null, errors: [], ownerNamesMissing: true, session: null });
});

test('Start without a Meet tab shows the notice and starts nothing', async () => {
  const h = setup();
  h.found = false;
  await h.controller.open();
  await h.controller.start();
  assert.equal(h.view().notice, NO_MEET_TAB);
  assert.equal(h.view().session, null);
  assert.deepEqual(h.saves, []);
});

test('Start saves the session, polls at once, then every 2 seconds', async () => {
  const h = setup({ answers: [['Ana', 'S02 SE']] });
  await h.controller.open();
  const starting = [];
  h.controller.subscribe(() => starting.push(h.view().starting));
  await h.controller.start();
  await settle();
  assert.deepEqual(starting.slice(0, 2), [true, false]);       // Start is off while the Meet tab is looked up
  assert.deepEqual(h.lookups, [undefined]);                    // no meeting code yet: the active tab is asked
  assert.equal(h.view().session.summary.answers, 1);
  h.meet.say('Ben', 's2 se');
  await h.tick(1999);
  assert.equal(h.view().session.summary.answers, 1);
  await h.tick(1);
  assert.equal(h.view().session.summary.answers, 2);
});

test('Start pressed twice starts one session', async () => {
  const h = setup();
  await h.controller.open();
  await Promise.all([h.controller.start(), h.controller.start()]);
  await settle();
  assert.deepEqual(h.lookups, [undefined]);
  assert.deepEqual(h.saves[0], ['current']);
  assert.equal(h.saves.filter(keys => keys.length === 1 && keys[0] === 'current').length, 1);
});

test('a poll saves only what changed and tells listeners only when the view changed', async () => {
  const h = await started({ answers: [['Ana', 'S02 SE']] });
  assert.deepEqual(h.saves, [['current'], ['current', 'roster']]);   // Start, then the first poll (Ana joins the roster)
  let told = 0;
  h.controller.subscribe(() => told++);
  const view = h.view();
  await h.tick(2000);
  assert.equal(h.saves.length, 2);                                   // nothing new in Meet: nothing saved
  h.meet.say('Ana', 'thanks');                                       // only the session's list of seen messages changes
  await h.tick(2000);
  assert.deepEqual(h.saves.at(-1), ['current']);
  assert.equal(told, 0);
  assert.equal(h.view(), view);                                      // the same object: nothing to redraw
});

test('a failed Meet read is listed, and the list clears once Meet answers', async () => {
  const h = await started({ unsupported: ['readParticipants'] });
  assert.deepEqual(h.view().errors, ['Reading the participant list failed: Not supported.']);
  assert.equal(h.view().session.summary.answers, 5);                 // the chat was still read
  h.meet.readParticipants = async () => ({ ok: true, names: ['Mentor', 'Ana'] });
  await h.tick(2000);
  assert.deepEqual(h.view().errors, []);
});

test('a Meet tab that stops answering is looked up again by meeting code', async () => {
  const h = await started();
  h.meet.lost = true;
  h.found = false;
  await h.tick(2000);
  assert.deepEqual(h.lookups, [undefined, 'abc-defg-hij']);
  assert.equal(h.view().notice, NO_MEET_TAB);
  assert.equal(h.view().session.summary.answers, 5);                 // the session stays
  h.meet.lost = false;
  h.found = true;
  await h.tick(2000);
  assert.equal(h.view().notice, null);
});

test('a saved session is restored on open and polled at once', async () => {
  const h = setup({ current: createSession({ startedAt: '2026-11-24T17:00:00Z', meetingCode: 'abc-defg-hij' }) });
  await h.controller.open();
  assert.equal(h.view().session.summary.answers, 0);
  await settle();
  assert.deepEqual(h.lookups, ['abc-defg-hij']);
  assert.equal(h.view().session.summary.answers, 5);
});

test('owner actions change the session, save it with the roster, and show in the view', async () => {
  const h = await started();
  const before = h.saves.length;
  const member = key => h.view().session.members.find(m => m.key === key);
  await h.controller.setStage('eva', 'S03SE');                       // Eva is now alone at her stage, and so is Dan
  assert.deepEqual(h.saves.at(-1), ['current', 'roster']);
  assert.equal(member('eva').stage, 'S03SE');
  await h.controller.setLone('eva', 'join');
  assert.deepEqual(h.view().session.summary.lone.map(l => [l.key, l.choice]), [['dan', null], ['eva', 'join']]);
  await h.controller.setIgnored('ben', true);
  assert.deepEqual(h.view().session.summary.ignored, [{ key: 'ben', name: 'Ben' }]);
  await h.controller.setIgnored('ben', false);
  assert.deepEqual(h.view().session.summary.ignored, []);
  await h.controller.toggleActive('ana');
  assert.equal(member('ana').active, true);
  assert.equal((await h.store.load()).roster.students.ana.active, true);
  await h.controller.setMix(true);
  assert.equal(h.view().session.mixWorkingGroups, true);
  await h.controller.split();
  assert.equal(h.view().session.hasPlan, true);
  await h.controller.setStage('ana', 'PW');
  assert.equal(h.view().session.outdated, true);                     // changed since Split
  assert.equal(h.saves.length, before + 8);
});

test('Fill pauses the poll, fills the rooms, then polls again', async () => {
  const h = await started();
  await h.controller.split();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const createRooms = h.meet.createRooms;
  h.meet.createRooms = async names => { await gate; return createRooms(names); };
  const reads = h.reads;
  const done = h.controller.fill();
  await settle();
  assert.equal(h.view().session.filling, true);
  await h.tick(10000);
  assert.equal(h.reads, reads);                                      // no poll while Fill runs
  release();
  await done;
  await settle();
  assert.equal(h.reads, reads + 1);                                  // polling is back at once
  const session = h.view().session;
  assert.equal(session.filling, false);
  assert.equal(session.filled, true);
  assert.deepEqual(session.fillResult, { ok: true, lines: ["Rooms filled. Check Meet's breakout panel, then press Open rooms there."], items: [] });
  assert.deepEqual(h.meet.rooms, [
    { name: 'Preseason Web · A', members: ['Dan', 'Eva'] },
    { name: 'S02 SE · A', members: ['Ana', 'Ben', 'Cleo'] },
  ]);
  h.meet.join('Zoe');
  h.meet.say('Zoe', 'S02 SE');
  await h.tick(2000);
  assert.deepEqual(h.view().session.summary.notInRoom.map(n => n.key), ['zoe']);
  await h.controller.markPlaced('zoe', 'S02 SE · A');
  assert.deepEqual(h.view().session.summary.notInRoom, []);
});

test('Fill pressed while a poll is waiting on Meet: the poll finishes first, and one poll follows the Fill', async () => {
  const h = await started();
  await h.controller.split();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const readParticipants = h.meet.readParticipants;
  h.meet.readParticipants = async () => { await gate; return readParticipants(); };
  await h.tick(2000);                                                // this poll now waits on Meet
  const done = h.controller.fill();
  await settle();
  assert.equal(h.view().session.filling, true);
  assert.deepEqual(h.meet.rooms, []);                                // Fill waits for the poll
  release();
  await done;
  await settle();
  assert.equal(h.view().session.filled, true);
  assert.deepEqual(h.meet.rooms.map(room => room.members.length), [2, 3]);
  const reads = h.reads;
  await h.tick(2000);
  assert.equal(h.reads, reads + 1);                                  // one poll every 2 seconds, not two
});

test('Fill: Meet cannot create the rooms, the owner creates them, then only names are filled', async () => {
  const h = await started({ unsupported: ['createRooms'] });
  await h.controller.split();
  await h.controller.fill();
  const session = h.view().session;
  assert.equal(session.filled, false);
  assert.equal(session.ownerCreatesRooms, true);
  assert.deepEqual(session.fillResult, {
    ok: false,
    lines: ['Not supported.', 'Create these rooms in Meet, with these names:'],
    items: ['Preseason Web · A', 'S02 SE · A'],
  });
  h.meet.rooms = session.fillResult.items.map(name => ({ name, members: [] }));   // the owner creates them in Meet
  await h.controller.fill();
  assert.equal(h.view().session.filled, true);
  assert.equal(h.view().session.fillResult.ok, true);
});

test('Fill: typing the names fails, and the names to type by hand are listed', async () => {
  const h = await started({ unsupported: ['assignName'] });
  await h.controller.split();
  await h.controller.fill();
  assert.equal(h.view().session.filled, true);
  assert.deepEqual(h.view().session.fillResult, {
    ok: false,
    lines: ['Putting Dan in Preseason Web · A failed: Not supported.', 'Type these names by hand:'],
    items: ['Dan → Preseason Web · A', 'Eva → Preseason Web · A', 'Ana → S02 SE · A', 'Ben → S02 SE · A', 'Cleo → S02 SE · A'],
  });
});

test('Fill with no Meet tab shows the notice and fills nothing', async () => {
  const h = await started();
  await h.controller.split();
  h.meet.lost = true;
  h.found = false;
  await h.controller.fill();
  assert.equal(h.view().notice, NO_MEET_TAB);
  assert.equal(h.view().session.filling, false);
  assert.equal(h.view().session.filled, false);
  assert.equal(h.view().session.fillResult, null);
});

test('End needs a second press within 5 seconds, then saves the record and stops polling', async () => {
  const h = await started();
  await h.controller.end();
  assert.equal(h.view().session.endArmed, true);
  await h.tick(5000);
  assert.equal(h.view().session.endArmed, false);                    // too late: still running
  await h.controller.end();
  await h.tick(4999);
  await h.controller.end();
  assert.equal(h.view().session, null);
  const { history, current } = await h.store.load();
  assert.equal(current, null);
  assert.equal(history.length, 1);
  const reads = h.reads;
  await h.tick(10000);
  assert.equal(h.reads, reads);
});

test('End while a poll is waiting on Meet: the ended session does not come back', async () => {
  const h = await started();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const readParticipants = h.meet.readParticipants;
  h.meet.readParticipants = async () => { await gate; return readParticipants(); };
  h.meet.say('Ana', 'PW');
  await h.tick(2000);                                                // this poll now waits on Meet
  await h.controller.end();
  await h.controller.end();
  release();
  await settle();
  assert.equal(h.view().session, null);
  assert.equal((await h.store.load()).current, null);
  assert.deepEqual(h.saves.at(-1), ['current', 'history']);
});

test('End while Fill is waiting on Meet: the ended session does not come back', async () => {
  const h = await started();
  await h.controller.split();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const createRooms = h.meet.createRooms;
  h.meet.createRooms = async names => { await gate; return createRooms(names); };
  const done = h.controller.fill();
  await settle();                                                    // Fill now waits on Meet
  await h.controller.end();
  await h.controller.end();
  release();
  await done;
  await settle();
  assert.equal(h.view().session, null);
  assert.equal((await h.store.load()).current, null);
  assert.deepEqual(h.saves.at(-1), ['current', 'history']);
  const reads = h.reads;
  await h.tick(10000);
  assert.equal(h.reads, reads);                                      // and no poll starts again
});

test('after End, the next Start begins clean and knows the stages of the ended session', async () => {
  const h = await started({ unsupported: ['createRooms'], answers: [['Ana', 'S02 SE'], ['Ben', 's2 se']] });
  await h.controller.setStage('cleo', 'PW');                         // set by hand: Cleo wrote nothing
  await h.controller.split();
  await h.controller.fill();
  assert.equal(h.view().session.ownerCreatesRooms, true);
  await h.controller.end();
  await h.controller.end();
  await h.controller.start();
  await settle();
  const session = h.view().session;
  assert.equal(session.hasPlan, false);
  assert.equal(session.ownerCreatesRooms, false);
  assert.equal(session.fillResult, null);
  assert.equal(session.summary.noAnswer.find(n => n.key === 'cleo').lastStage, 'PW');
});

test('a roster saved from the roster page shows without a poll', async () => {
  const h = await started({ ownerNames: [] });
  assert.equal(h.view().ownerNamesMissing, true);
  const { roster } = await h.store.load();
  roster.ownerNames = ['Mentor'];
  h.storeChanged({ roster });
  assert.equal(h.view().ownerNamesMissing, false);
});

test('a participant named __proto__ is an ordinary student', async () => {
  const h = await started();
  h.meet.join('__proto__');
  await h.tick(2000);
  assert.deepEqual(h.view().session.members.find(m => m.name === '__proto__'),
    { key: '__proto__', name: '__proto__', stage: null, guessed: false, message: null, isNew: true, onRoster: false, active: false, group: null });
  assert.equal(h.view().session.summary.noAnswer.some(n => n.key === '__proto__'), true);
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `node --test test/controller.test.js`
Expected: FAIL, `Cannot find module` for `src/panel/controller.js`.

- [ ] **Step 3: Write `src/panel/controller.js`**

"The controller is `panel.js`'s logic moved, with the same timings and the same messages." Move these from `src/panel/panel.js` into the closure of `createPanelController`, unchanged apart from the list below: the constants `POLL_MS`, `END_ARMED_MS` and `NO_MEET_TAB`; the module-level variables; `ensureMeet`, `poll`, `fillBreakout` (as `fill`), `start`, `end`, `act` and `open`. `findMeet` and the store come in as arguments. No DOM and no `chrome.*`.

What changes:
- `render()` becomes a `publish()` that builds `panelView(...)` from the current state, compares its `JSON.stringify` with the last one's, and only when they differ replaces the view and calls the listeners. `getView()` returns the same object until then.
- The view before `open()` finishes is `panelView({ session: null, ctx: null, loading: true })`.
- `start()` sets a `starting` flag where the page disabled the Start button, and returns at once when `starting` is set or a session exists.
- `endArmed` in the view is whether the End timer is set.
- `panelView` puts `summarize(session, ctx)` in `summary`, and builds `members` from `session.students`, taking the roster's facts with `rosterEntry(ctx, key)`: `guessed` is `source === 'guess'`, `message` is `fromMessage`, `group` is the name of the working group or null. `ownerNamesMissing` is false while `loading`.
- The owner actions are one-line wrappers over `act`: `split`, `setStage`, `setIgnored`, `setLone`, `setMix`, `markPlaced` call the function of the same name in `src/logic/session.js`; `toggleActive` flips `active` on `rosterEntry(ctx, key)`.
- The JSDoc block above goes at the top of the file.

- [ ] **Step 4: Run the tests and see them pass**

Run: `node --test test/controller.test.js`, then `npm test`
Expected: 20 pass; then 121 pass.

- [ ] **Step 5: Add the convention to `CLAUDE.md`**

```markdown
- The panel's behaviour lives in `src/panel/controller.js`; components read its view and call its functions, and keep no session state.
```

- [ ] **Step 6: Commit**

```bash
git add src/panel/controller.js test/controller.test.js CLAUDE.md
git commit -m "feat: panel controller, the panel's behaviour out of the page"
```

---

### Task 5: The `?fake&at=` states

**Files:**
- Create: `src/panel/fake-states.js`
- Test: `test/fake-states.test.js`
- Modify: `CLAUDE.md` (one convention)

**Interfaces:**
- Consumes: `DEMO` from `src/panel/demo.js`, `createFakeMeet`, `createStore({ memory: true, seed })`, `syncFromMeet`, `fillRooms`, `createSession`, `split`, `lastKnownStages`; in the test only, `createPanelController` (Task 4).
- Produces, from `src/panel/fake-states.js`:

```js
/**
 * The fake Meet and the in-memory store of a `?fake` page, brought to a state.
 * Resolves to `{ meet, store }`.
 * @param {string|null} at  null, 'collecting', 'split' or 'filled'; anything else is before Start
 */
export async function fakeAt(at) {}
```

It carries no `@returns`: TypeScript then reads the real fake Meet and store off the code, which Task 7 needs (`meet.rooms`, `meet.say`, `store.load()`). Declared as `object`, they would fail its type check.

- [ ] **Step 1: Write the failing test, `test/fake-states.test.js`**

```js
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { fakeAt } from '../src/panel/fake-states.js';
import { createPanelController } from '../src/panel/controller.js';
import { DEMO } from '../src/panel/demo.js';
import { summarize } from '../src/logic/session.js';
import { lastKnownStages } from '../src/logic/history.js';

// The saved session at a state, summarized as the panel would on open.
async function at(state) {
  const { store, meet } = await fakeAt(state);
  const { roster, history, current } = await store.load();
  return { meet, roster, history, current, summary: current && summarize(current, { roster, lastStages: lastKnownStages(history) }) };
}

test('no state, or one that does not exist: before Start, with the demo roster and history', async () => {
  for (const state of [null, 'nope']) {
    const { current, roster, history, meet } = await at(state);
    assert.equal(current, null);
    assert.equal(Object.keys(roster.students).length, 12);
    assert.equal(history.length, 3);
    assert.deepEqual((await meet.readChat()).messages, []);
  }
});

test('collecting: the session is started and the demo answers are in', async () => {
  const { current, summary } = await at('collecting');
  assert.equal(current.plan, null);
  assert.equal(summary.answers, 9);
  assert.deepEqual(summary.unclear.map(u => u.name), ['Sam']);
  assert.deepEqual(summary.noAnswer.map(n => n.name), ['<b>Bold</b>', 'Mia', 'Galaxy S21']);
});

test('split: the same, with the rooms planned', async () => {
  const { current, summary, meet } = await at('split');
  assert.deepEqual(current.plan.map(room => room.name), ['S01 Arc01 · A', 'S02 DS · A', 'S03 SE · A']);
  assert.equal(current.outdated, false);
  assert.equal(current.filled, false);
  assert.equal(summary.answers, 9);
  assert.deepEqual(meet.rooms, []);
});

test('filled: the rooms are filled in the fake Meet, and a latecomer is not in a room', async () => {
  const { current, summary, meet } = await at('filled');
  assert.equal(current.filled, true);
  assert.deepEqual(meet.rooms.map(room => [room.name, room.members.length]), [['S01 Arc01 · A', 5], ['S02 DS · A', 3], ['S03 SE · A', 1]]);
  assert.deepEqual(summary.notInRoom.at(-1), { key: 'noor', name: 'Noor', stage: 'S02DS', guess: false, suggested: 'S02 DS · A' });
});

test('the demo data is left as it was', async () => {
  await fakeAt('filled');                                            // Noor joins that call's roster only
  assert.equal(Object.keys(DEMO.roster.students).length, 12);
  assert.equal(Object.hasOwn(DEMO.roster.students, 'noor'), false);
});

// Lets every pending promise step run; timers are mocked in the test below, so nothing else moves time.
const settle = () => new Promise(resolve => setImmediate(resolve));

// Lets a poll that is still running finish on the mocked clock before the real one comes back.
test.afterEach(async () => { await settle(); mock.timers.reset(); });

test('a panel opened on a state shows it at once, and its first poll changes nothing', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  for (const [state, hasPlan, filled] of [['collecting', false, false], ['split', true, false], ['filled', true, true]]) {
    const { meet, store } = await fakeAt(state);
    let saves = 0;
    const controller = createPanelController({
      store: { ...store, save: async changes => { saves++; await store.save(changes); } },
      findMeet: async () => ({ meet, meetingCode: 'abc-defg-hij' }),
    });
    await controller.open();
    const shown = controller.getView();
    assert.equal(shown.session.hasPlan, hasPlan, state);
    assert.equal(shown.session.filled, filled, state);
    await settle();                                                  // the first poll
    assert.equal(controller.getView(), shown, state);                // the same object: nothing to redraw
    assert.equal(saves, 0, state);
  }
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `node --test test/fake-states.test.js`
Expected: FAIL, `Cannot find module` for `src/panel/fake-states.js`.

- [ ] **Step 3: Write `fakeAt` in `src/panel/fake-states.js`**

Each call makes a new fake Meet with `DEMO.participants` and works on a copy of `DEMO.roster`, so the demo data is never changed. The states build on each other:
- `collecting`: a session made with `createSession({ startedAt: '2026-11-24T17:00:00Z', meetingCode: 'abc-defg-hij' })`; every line of `DEMO.answers` said in the fake Meet; one `syncFromMeet`.
- `split`: the same, then `split(session, ctx)`.
- `filled`: the same, then `fillRooms(meet, session, { createRooms: true })`; then the latecomer `Noor` joins and writes `S02 DS`, and one more `syncFromMeet`.

The store is `createStore({ memory: true, seed: { roster, history: DEMO.history, current } })`, where `current` is the session, or null before Start. The panel then finds the session when it opens, so the state is there at first paint.

- [ ] **Step 4: Run the tests and see them pass**

Run: `node --test test/fake-states.test.js`, then `npm test`
Expected: 6 pass; then 127 pass.

- [ ] **Step 5: Add the convention to `CLAUDE.md`**, after the `?fake` line:

```markdown
- `?fake&at=<state>` opens the fake panel in that state (`collecting`, `split`, `filled`), built by `src/panel/fake-states.js`.
```

- [ ] **Step 6: Commit**

```bash
git add src/panel/fake-states.js test/fake-states.test.js CLAUDE.md
git commit -m "feat: addressable states for the fake panel"
```

---

### Task 6: The shared components

**Kit:** exempt: no screen shows these components until Tasks 7 and 8, whose kit checks and review cover them
**Failing-test check:** exempt: components only draw the controller's view; behaviour is tested in controller.js

**Files:**
- Create: `src/components/StageSelect.tsx`, `src/components/StageSelect.stories.tsx`, `src/components/ActiveToggle.tsx`, `src/components/ActiveToggle.stories.tsx`, `src/components/ClampedText.tsx`, `src/components/ClampedText.stories.tsx`
- Modify: `CLAUDE.md` (one convention line)

**Interfaces:**
- Consumes: `Select`, `Toggle` and `cn` from Task 3; `STAGES` from `src/logic/stages.js`.
- Produces:

```tsx
/** The stage dropdown: its options are STAGES (value = code, text = label), its placeholder is `stage…`. */
export function StageSelect(props: { value: string | null; onChange: (stageCode: string) => void; label: string; disabled?: boolean })

/** The ★ button, pressed when the student is active. */
export function ActiveToggle(props: { active: boolean; onToggle: () => void; label: string })

/** Text held to two lines, which expands and collapses on click when it does not fit. */
export function ClampedText(props: { text: string; className?: string })
```

Components declare no return type, here and in Tasks 7 and 8: with React 19's types `JSX.Element` is not a global name (TS2503).

- [ ] **Step 1: Write `StageSelect`**

The shadcn `Select` with a small trigger. `label` is the trigger's `aria-label` (callers pass `Stage for <name>`). A null `value` shows the placeholder: pass `''` to `Select`, since Radix shows the placeholder for an empty value. Stories: Empty, WithStage (`S02DS`), Disabled.

- [ ] **Step 2: Write `ActiveToggle`**

The shadcn `Toggle`, small, holding the character `★`; `label` is its `aria-label` and its `title`. Stories: Off, On.

- [ ] **Step 3: Write `ClampedText`**

- The text is held to two lines (`line-clamp-2`) and may break inside a long word, so it never makes its container scroll sideways.
- When the text does not fit in two lines, it is a `<button type="button">` with `aria-expanded`, a hover style and visible keyboard focus. A click shows the whole text; a second click clamps it again.
- When the text fits, it is plain text: not focusable, no pointer, no hover style.
- Whether it fits is measured on the clamped element (`scrollHeight > clientHeight`) and measured again when the element's width changes (`ResizeObserver`), since the owner can drag the side panel wider.
- The open or closed state is the component's own.

Stories, each in a `w-80` container: Short (`need help with task 3`), Long (the last message of `DEMO.answers` in `src/panel/demo.js`, 318 characters with one very long word).

- [ ] **Step 4: Update the untrusted-text convention in `CLAUDE.md`**

Under `## Code conventions`, replace "Chat text and display names are untrusted: put them in the page with `textContent` or DOM nodes, never `innerHTML`." with:

```markdown
- Chat text and display names are untrusted: put them in the page as React text children, never `dangerouslySetInnerHTML`.
```

These are the project's first React components, and Tasks 7 and 8 are reviewed against this line. The two old pages keep to the old wording until those tasks remove them.

- [ ] **Step 5: Verify**

```bash
npm run typecheck && npm run build-storybook && npm test
node ~/.claude/kits/ui/stacks/react-tailwind-shadcn/checks/check-catalog.mjs --base "$(git merge-base HEAD main)" --skip main.tsx
node ~/.claude/kits/ui/stacks/react-tailwind-shadcn/checks/check-tokens.mjs --base "$(git merge-base HEAD main)" --theme src/index.css --generated src/components/ui
```

Expected: all pass, with 127 tests; both checks exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/StageSelect.tsx src/components/StageSelect.stories.tsx src/components/ActiveToggle.tsx src/components/ActiveToggle.stories.tsx src/components/ClampedText.tsx src/components/ClampedText.stories.tsx CLAUDE.md
git commit -m "feat: StageSelect, ActiveToggle and ClampedText"
```

---

### Task 7: The side panel

**Wave:** A
**Kit:** ui [react-tailwind-shadcn]
**Screens:** /src/panel/panel.html?fake, /src/panel/panel.html?fake&at=collecting, /src/panel/panel.html?fake&at=split, /src/panel/panel.html?fake&at=filled
**Failing-test check:** exempt: components only draw the controller's view; behaviour is tested in controller.js

**Files:**
- Create: `src/panel/Panel.tsx`, `src/panel/Panel.stories.tsx`, `src/panel/main.tsx`
- Modify: `src/panel/panel.html` (the whole file: it loads `main.tsx`)
- Delete: `src/panel/panel.js`, `src/panel/panel.css`

Do not edit `CLAUDE.md`, `src/index.css`, `package.json` or anything under `src/components/`: Task 8 runs beside this one. If a shared component lacks something, say so in your report.

**Interfaces:**
- Consumes: `PanelView`, `PanelActions`, `createPanelController` and `panelView` (Task 4); `fakeAt` (Task 5); `StageSelect`, `ActiveToggle`, `ClampedText` (Task 6); `Button`, `Badge`, `Alert`, `Checkbox`, `Label`, `Input` (Task 3); `findMeetTab` and `createMeetClient` from `src/panel/meet-client.js`; `createStore`; `DEMO`; `stageLabel` from `src/logic/stages.js`.
- Produces:

```tsx
export type FakeMeetBox = {
  rooms: { name: string; members: string[] }[];
  say(sender: string, text: string): void;
  join(name: string): void;
  playDemo(): void;
};

export function Panel(props: {
  view: PanelView;
  actions: PanelActions;
  rosterHref: string;
  onOpenRoster?: () => void;   // when given, the Roster link calls it instead of following its href
  fake?: FakeMeetBox;          // when given, the Fake Meet box is drawn at the bottom
})
```

- [ ] **Step 1: Write `Panel` in `src/panel/Panel.tsx`**

Port `render()` and its helpers in `src/panel/panel.js`, with `src/panel/panel.html`, one to one: the same sections in the same order, the same strings, and the same rules for what is hidden and what is disabled. The spec's table "How today's elements map" says which component each element becomes. Each section used once (the tally, the rooms preview, Unclear, No answer, Ignored, Not in a room yet, Flags, the Fake Meet box) is a function inside this file.

What the view gives where `render()` read the session: `session.members` has each student's name, stage, `message` (the name's `title`), `isNew`, `guessed`, and from the roster `onRoster`, `active` and `group`. Look a member up by key through a `Map` built from that array. `locked` is `filled || filling`.

What differs from version 1, and nothing else:
- **Main actions stand out.** Start, Split, and Fill breakout rooms (also when it reads Fill names) are primary buttons. Every other button is outline or ghost, small inside rows. Of Keep alone and Join, the pressed one is `secondary`, with `aria-pressed` on both.
- **Open controls stay open.** Every row is keyed by the student's name key, each room by its name.
- **Long chat text is clamped.** An unclear message is a `ClampedText`.
- **Marks.** `new` and `?` are `secondary` badges.
- **Empty states.** Before Start: the line "Start a session to read stage answers from the Meet chat." above the Start button. Session started with no answers: "No answers yet. Students write their stage in the Meet chat." where the tally goes. Sections with nothing in them stay hidden, as today.
- **Loading.** While `view.loading`, the page shows its title and nothing else. Start is disabled while `view.starting`. While `filling`, the Fill button is disabled and reads "Filling rooms…".
- **Alerts.** The owner-names warning, the notice and "Changed since Split. Press Re-split before Fill." are `Alert`s. The Meet errors, a failed Fill and its list are destructive `Alert`s. A successful Fill is an `Alert`.
- **Whole strings.** A plural is two whole strings, never a word plus an `s`: `1 answer` and `${n} answers`; `→ 1 room (${size})` and `→ ${n} rooms (${sizes})`. What the owner reads stays the same.
- **Names for assistive technology,** which change nothing on screen: each `StageSelect` gets `Stage for <name>`; the ★ keeps `Active student`; the Fake Meet fields get their placeholder as `aria-label`.
- **Emphasis,** kept from `panel.css` with the theme's tokens: names and room names in medium weight, a room member's name in normal weight, messages and trailing facts muted (`text-muted-foreground`). The amber of version 1's flag lines is dropped: the theme has no such token.
- **Structure.** One `<h1>`, and one `<main>` that holds the whole page and spans its width at 375, 768 and 1440 px, in one column. Names and messages wrap, breaking inside a word when they must; nothing scrolls sideways.

The Fake Meet box keeps today's fields and buttons. Its first form splits the line at the first colon into sender and text and calls `fake.say`; a line with no colon does nothing. It lists `fake.rooms` as `<name>: <members joined by ", ">`, one per line, when there is at least one room.

- [ ] **Step 2: Write `src/panel/main.tsx` and replace `src/panel/panel.html`**

`panel.html` keeps `<html lang="en">` and `<title>Murmuration</title>`, and its body is `<div id="root"></div>` and `<script type="module" src="./main.tsx"></script>`.

`main.tsx` imports `../index.css`, then:
- With `?fake` in the address: `const { meet, store } = await fakeAt(at)`, where `at` is the address's `at` value or null. `findMeet` answers `{ meet, meetingCode: 'abc-defg-hij' }`. `rosterHref` is `../roster-page/roster-page.html?fake`. The `fake` prop is rebuilt at each draw from the fake Meet: its current `rooms`, its `say` and `join`, and a `playDemo` that says every line of `DEMO.answers`.
- Without it: `createStore()`; `findMeet` is `findMeetTab(meetingCode)` followed by `createMeetClient(tab.tabId)`, as in `panel.js`; `rosterHref` is `#`; `onOpenRoster` opens `chrome.runtime.getURL('src/roster-page/roster-page.html')` with `chrome.tabs.create`.
- The controller is created once, here, outside React. One `draw` function renders `<Panel>` inside `<StrictMode>` with `controller.getView()` and the controller as `actions`. Subscribe `draw`, call it once, then call `controller.open()`.

- [ ] **Step 3: Delete `src/panel/panel.js` and `src/panel/panel.css`**

- [ ] **Step 4: Write `src/panel/Panel.stories.tsx`**

Each story passes a fixed view, with no controller behind it and `actions` that do nothing. Build the views from the demo data with a `loaders` function: `fakeAt(at)`, then the store's `roster`, `history` and `current`, then `panelView({ session: current, ctx: { roster, lastStages: lastKnownStages(history) }, …the story's flags })`.

A story's state goes in through `panelView`'s own arguments (`loading`, `notice`, `errors`, `filling`, `endArmed`, `ownerCreatesRooms`, `fillResult`), or is made on the session or the roster before the call, with the functions of `src/logic/session.js` and `syncFromMeet`. The returned view is never edited.

| Story | State |
|---|---|
| Loading | `loading: true` |
| BeforeStart | no session |
| NoMeetTab | no session, with the notice |
| OwnerNamesMissing | no session, the roster's `ownerNames` emptied before the call |
| NoAnswersYet | a session just made with `createSession`, nobody in it |
| Collecting | `at: 'collecting'`, with one student ignored through `setIgnored` so Ignored shows |
| MeetReadFailed | Collecting, with `errors: ['Reading the participant list failed: Not supported.']` |
| Split | `at: 'split'` |
| ChangedSinceSplit | Split, then one `setStage` on the session, so the plan is outdated |
| Filling | Split, with `filling: true` |
| Filled | `at: 'filled'`, with the successful `fillResult`, and Ana writing `S02 SE` after Fill (`meet.say`, then `syncFromMeet`) so Flags shows |
| FillRoomsNotCreated | Split, with `ownerCreatesRooms: true` and the failed `fillResult` that lists the rooms to create |
| FillNamesByHand | `at: 'filled'`, with the failed `fillResult` that lists the names to type |
| EndArmed | Collecting, with `endArmed: true` |
| WithFakeMeet | `at: 'filled'`, with the `fake` prop and its rooms |

The `fillResult` values carry the lines `test/controller.test.js` asserts, with the demo plan's rooms (`S01 Arc01 · A`, `S02 DS · A`, `S03 SE · A`), so each story lists the rooms its own preview shows:
- successful: `{ ok: true, lines: ["Rooms filled. Check Meet's breakout panel, then press Open rooms there."], items: [] }`;
- rooms not created: `{ ok: false, lines: ['Not supported.', 'Create these rooms in Meet, with these names:'], items: [the three room names] }`;
- names by hand: `{ ok: false, lines: ['Putting Ana in S01 Arc01 · A failed: Not supported.', 'Type these names by hand:'], items: […] }`, with one `<name> → <room>` item per member of the session's `plan`, in its order (`Ana → S01 Arc01 · A` first, `Leo → S03 SE · A` last).

- [ ] **Step 5: Verify**

```bash
npm run typecheck && npm test && npm run build && npm run build-storybook
grep -rn "dangerouslySetInnerHTML\|innerHTML" src/panel
```

Expected: all pass, with 127 tests; `grep` prints nothing. Start no server and open no browser: the session captures the screens after you report.

- [ ] **Step 6: Commit**

```bash
git add -A src/panel
git commit -m "feat: the side panel in React"
```

---

### Task 8: The roster page

**Wave:** A
**Kit:** ui [react-tailwind-shadcn]
**Screens:** /src/roster-page/roster-page.html?fake
**Failing-test check:** exempt: components only draw the controller's view; behaviour is tested in controller.js

**Files:**
- Create: `src/roster-page/RosterPage.tsx`, `src/roster-page/RosterPage.stories.tsx`, `src/roster-page/main.tsx`
- Modify: `src/roster-page/roster-page.html` (the whole file: it loads `main.tsx`)
- Delete: `src/roster-page/roster-page.js`, `src/roster-page/roster-page.css`

Do not edit `CLAUDE.md`, `src/index.css`, `package.json` or anything under `src/components/` or `src/panel/`: Task 7 runs beside this one. If a shared component lacks something, say so in your report.

**Interfaces:**
- Consumes: `ActiveToggle` (Task 6); `Button`, `Select`, `Table`, `Input`, `Textarea`, `Label`, `Alert` (Task 3); `createStore`; `DEMO` from `src/panel/demo.js`; `createGroup`, `deleteGroup`, `emptyRoster` from `src/logic/roster.js`; `timeline`, `historyToCsv`, `exportBackup`, `parseBackup` from `src/logic/history.js`; `TRACKS`, `trackLabel` from `src/logic/stages.js`.
- Produces:

```tsx
type Roster = { students: Record<string, { name: string; track: string | null; active: boolean; group: string | null }>; groups: Record<string, { name: string }>; ownerNames: string[] };
type SessionRecord = { startedAt: string; meetingCode: string; students: { key: string; name: string; stage: string | null; source: string | null }[] };
export type RosterStore = {
  load(): Promise<{ roster: Roster; history: SessionRecord[] }>;
  save(changes: { roster?: Roster; history?: SessionRecord[] }): Promise<void>;
  onChange(cb: (changes: { roster?: Roster; history?: SessionRecord[] }) => void): void;
};

export function RosterPage(props: { store: RosterStore })
```

- [ ] **Step 1: Write `RosterPage` in `src/roster-page/RosterPage.tsx`**

Port `src/roster-page/roster-page.js`, with `roster-page.html`, one to one: the same four sections in the same order, the same strings, the same two `confirm()` questions, the same file names for the two exports. The spec's table "How today's elements map" says which component each element becomes. Each section is a function inside this file.

The page has no controller. The component loads `{ roster, history }` from the store when it mounts and listens to `store.onChange`. A change is made in place on the roster, as today; the page then saves with `store.save({ roster })` and draws again by setting its state to a new `{ roster, history }` object.

What differs from version 1, and nothing else:
- **Empty states.** No students: "No students yet. They are added when they answer in a session." in place of the table's rows. No working groups: "No working groups yet." above the new-group field. A student with no history: a muted dash in the timeline cell, with "no sessions yet" for screen readers.
- **Loading.** Until the store has answered, the page shows its title and nothing else.
- **The import field** is an `Input` of type `file` with the `Label` "Import backup". **The import error** is a destructive `Alert`.
- **Buttons** are all outline or ghost; the page has no primary action.
- **Dropdowns.** Radix does not allow an option with an empty value, so "–" (no track) and "none" (no working group) use the value `none`, turned back into `null` on change.
- **Fields save when they lose focus,** as `change` did: a group's name and Your Meet names are not saved on every key.
- **Names for assistive technology,** which change nothing on screen: `Track for <name>`, `Working group for <name>`, `Active` on the ★, `Name of working group <name>`, `Group name` on the new-group field, and the textarea named by its heading.
- **Structure and widths.** One `<h1>`, and one `<main>` that holds the whole page and spans its width; version 1's 1000 px cap is dropped, so at 768 and 1440 px the table uses the full width. At 375 px the table scrolls sideways inside a container of the page's own, built as three layers: a `div` with `overflow-x-auto`, `role="region"`, `aria-label="Students"` and `tabIndex={0}`; inside it a `div` that carries the minimum width; inside that the `Table`. The minimum width is never passed to `Table`: its `className` lands on the `<table>` inside the component's own `overflow-x-auto` wrapper, which would then be what scrolls, and not the named region. Name is the first column. The page itself never scrolls sideways.
- **The timeline** keeps each entry's date as its `title`, and a guessed stage stays italic and muted.
- Rows are keyed by the student's name key, groups by their id.

- [ ] **Step 2: Write `src/roster-page/main.tsx` and replace `src/roster-page/roster-page.html`**

`roster-page.html` keeps `<html lang="en">` and `<title>Roster · Murmuration</title>`, and its body is `<div id="root"></div>` and `<script type="module" src="./main.tsx"></script>`.

`main.tsx` imports `../index.css`, makes the store as `roster-page.js` does (`createStore({ memory: true, seed: { roster: DEMO.roster, history: DEMO.history } })` with `?fake`, `createStore()` without), and renders `<RosterPage store={store} />` inside `<StrictMode>`.

- [ ] **Step 3: Delete `src/roster-page/roster-page.js` and `src/roster-page/roster-page.css`**

- [ ] **Step 4: Write `src/roster-page/RosterPage.stories.tsx`**

| Story | State |
|---|---|
| Demo | a memory store seeded with `DEMO.roster` and `DEMO.history` |
| Empty | a memory store seeded with `emptyRoster()` and no history: both empty lines show |
| ImportError | Demo, with a `play` function that uploads a text file holding `nope` to the field labelled `Import backup`, so "This file is not a Murmuration backup." shows |

The `play` function only brings the page to the state; it asserts nothing.

- [ ] **Step 5: Verify**

```bash
npm run typecheck && npm test && npm run build && npm run build-storybook
grep -rn "dangerouslySetInnerHTML\|innerHTML" src/roster-page
```

Expected: all pass, with 127 tests; `grep` prints nothing. Start no server and open no browser: the session captures the screen after you report.

- [ ] **Step 6: Commit**

```bash
git add -A src/roster-page
git commit -m "feat: the roster page in React"
```

---

### Task 9: Clean-up, conventions and the whole-branch checks

**Failing-test check:** exempt: removes an unused file and updates documentation; no new behaviour.

**Files:**
- Delete: `src/dom.js`
- Modify: `CLAUDE.md` (one convention line)

- [ ] **Step 1: Delete `src/dom.js`** after checking nothing imports it: `grep -rn "dom.js" src test` prints nothing.

- [ ] **Step 2: Update `CLAUDE.md`'s `## Code conventions`**

Remove the line "DOM helpers shared by the extension pages (`el`, `button`, `$`) live in `src/dom.js`." The untrusted-text line was replaced in Task 6.

Then read `CLAUDE.md` against the spec's section "`CLAUDE.md` after the port" and fix any line that does not match it.

- [ ] **Step 3: Verify the whole branch**

```bash
npm test && npm run typecheck && npm run build && npm run check:extension && npm run build-storybook
cmp manifest.json dist/manifest.json && cmp src/background.js dist/src/background.js && cmp src/meet/meet.js dist/src/meet/meet.js
git diff --stat "$(git merge-base HEAD main)" -- src/logic src/meet src/store.js src/panel/meet-client.js src/background.js
git diff "$(git merge-base HEAD main)" -- manifest.json
grep -rn "dangerouslySetInnerHTML" src --include=*.tsx --exclude-dir=ui
ls src/panel/panel.js src/panel/panel.css src/roster-page/roster-page.js src/roster-page/roster-page.css src/dom.js
node ~/.claude/kits/ui/stacks/react-tailwind-shadcn/checks/check-catalog.mjs --base "$(git merge-base HEAD main)" --skip main.tsx
node ~/.claude/kits/ui/stacks/react-tailwind-shadcn/checks/check-tokens.mjs --base "$(git merge-base HEAD main)" --theme src/index.css --generated src/components/ui
```

Expected: the first line passes, with 127 tests and four `ok` lines; `cmp` prints nothing; the first `git diff` prints nothing; the second shows one added line, `"key"`; `grep` prints nothing; `ls` finds none of the five files; both kit checks exit 0.

- [ ] **Step 4: Commit**

```bash
git add -A src/dom.js CLAUDE.md
git commit -m "chore: remove the old DOM helpers and update the conventions"
```
