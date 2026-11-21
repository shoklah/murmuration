# Murmuration: move the pages to React and adopt the UI kit

Date: 2026-11-21
Status: draft for the owner's approval

## Why

Version 1 works and was tested against a live Meet call. Its two pages, the
side panel and the roster page, use the browser's default look: grey system
buttons, no hierarchy, every control at the same weight.

The owner wants a much better interface, room to grow it, and the UI kit
(`~/.claude/kits/ui`) applied to this project as it is to their others. The
kit's only stack is React, Tailwind and shadcn, and the kit needs a component
catalog and browser checks. All of that needs a build step and dependencies,
which version 1 ruled out. The owner has now chosen them.

The work is in three steps, in the order the kit sets. This document covers
step 1 only.

1. **Port (this document).** Move both pages to the stack and give the kit what
   it needs. Same sections, same controls, same wording, on the stack's neutral
   look.
2. **Look.** The kit's direction step: reference styles rendered on the real
   panel, the owner picks, the result becomes `DESIGN.md`. The rooms preview is
   redesigned there, with mockups.
3. **Audit.** The kit's checks and review over every screen, giving a backlog.

## Goals

- Both pages are React components styled with Tailwind and shadcn components,
  built by Vite into `dist/`, which Chrome loads unpacked.
- The UI kit is adopted: the project names it in `CLAUDE.md`, has a component
  catalog (Storybook), and the kit's checks run on its screens.
- A session works exactly as in version 1: Start, live tally, Split, adjust,
  Fill, after Fill, End, and everything on the roster page.
- Three snags are fixed, because the port fixes them almost for free:
  - **Main actions stand out.** Start, Split and Fill breakout rooms are
    primary buttons. Every other button is a quiet one.
  - **Open controls stay open.** A stage dropdown the owner has open does not
    close when a new chat answer arrives.
  - **Long chat text is clamped.** An unclear message shows two lines, and
    expands to the full text when clicked.
- The panel's behaviour (polling, Fill, End) is covered by automatic tests,
  which it is not today.

## Non-goals

- A new look. The neutral shadcn style is a stopgap until step 2.
- Any change to the layout of a section, the rooms preview included. Rows keep
  their current contents and order.
- Any change to `src/logic/`, `src/meet/meet.js`, `src/meet/fake-meet.js`,
  `src/store.js`, `src/panel/meet-client.js`, `src/background.js`, or to the
  manifest's permissions.
- Dark mode. The theme file keeps the dark values shadcn generates, but nothing
  switches them on. Step 2 decides.
- Replacing `confirm()` on the roster page (delete a working group, replace
  data on import). It stays.
- Web fonts. The port uses the system font; step 2 decides.
- A linter, a formatter, or a suite of browser-driven end-to-end tests. The one
  smoke check under "Checking the built extension" is the exception.

## Anti-goals (it fails even if it works)

- The extension loaded from `dist/` behaves differently in a call than version
  1 does.
- `meet.js` ships changed. It was verified by hand on live Meet; the build
  copies it byte for byte.
- The built extension makes a network request. Everything it needs is in
  `dist/`.
- Chat text or a display name is put in the page as HTML.

## Constraints

- **Manifest V3 content security policy:** no inline script, no `eval`. The
  built pages load only script files from `dist/`.
- **The manifest keeps its paths.** `src/panel/panel.html`,
  `src/roster-page/roster-page.html`, `src/background.js` and
  `src/meet/meet.js` exist at those paths inside `dist/`, so every path in
  `manifest.json` stays as it is and
  `chrome.runtime.getURL('src/roster-page/roster-page.html')` still works. The
  manifest's only change is the `key` line under "The extension's id".
- **`meet.js` and `background.js` are classic scripts with no imports.** They
  are copied, not bundled.
- **The side panel is narrow** in real use (about 360 px, wider if the owner
  drags it). The kit still checks every screen at 375, 768 and 1440 px.
- **Existing conventions hold** unless this document changes them: students
  keyed by `nameKey`, `Object.hasOwn` for name keys, Meet operations that never
  throw, the stage list only in `src/logic/stages.js`, `?fake` never touching
  `chrome.storage`.
- **Loading from `dist/` gives the extension a new id**, because Chrome derives
  an unpacked extension's id from its folder. Data saved under the old id does
  not follow. See "The extension's id" and "Switching over".
- **npm** stays the package manager *(the owner's choice)*.

## Approaches considered

| | Approach | Trade-off | Outcome |
|---|---|---|---|
| **A** | **React, Tailwind and shadcn built by Vite, with the UI kit in full** | **Full kit coverage (screenshots, accessibility, token and catalog checks, kit review), open controls survive updates by construction, room to grow; costs a build before each reload, about 470 lines of page code rewritten, and Storybook for a two-screen extension** | **Chosen by the owner** |
| B | Keep plain JavaScript, hand-written CSS with tokens, kit checks only | Smaller and no build, but the kit's stack checks do not apply, the catalog has no tool, and keeping a dropdown open across updates needs hand-written update code | Not chosen |
| C | A build with Tailwind only, or a lighter library than React | Adds a build without matching the kit's stack, so the kit's stack checks still do not apply | Dropped |

Order of the work, also the owner's choice: port first, then the look, then
the audit. The alternative was to pick the look first on a throwaway React
build of the panel, so the port would land in the chosen style, at the cost of
building that screen twice.

## How it is built

### Languages *(my call)*

- React components and their stories are TypeScript (`.tsx`). That is what the
  kit's stack and its catalog check expect, and what the shadcn CLI writes.
- Everything else stays plain JavaScript: `src/logic/`, the store, the Meet
  files, and the new panel controller below. Tests stay on Node's built-in
  runner (`npm test`).
- TypeScript reads the JavaScript modules as they are (`allowJs`). The existing
  ones get no type annotations in this change.
- The one exception is the new controller: it declares the shape of its view
  and of its functions in JSDoc comments, so every component is type-checked
  against them. Components have no tests, which makes `npm run typecheck` their
  main automatic check. `.tsx` files are checked in strict mode.

### Build

- Vite, with two HTML entries: `src/panel/panel.html` and
  `src/roster-page/roster-page.html`. Each loads a small entry file,
  `src/panel/main.tsx` and `src/roster-page/main.tsx`.
- `manifest.json`, `src/background.js` and `src/meet/meet.js` are copied into
  `dist/` unchanged, at the same relative paths, on every build and in watch
  mode.
- Commands:
  - `npm run dev`: Vite's dev server, for the `?fake` pages.
  - `npm run build`: writes `dist/`.
  - `npm run watch`: rebuilds `dist/` on each save, for working against a real
    call.
  - `npm run typecheck`: `tsc --noEmit`.
  - `npm test`: unchanged, `node --test`.
  - `npm run check:extension`: the smoke check below, run after a build.
  - `npm run storybook` and `npm run build-storybook`.
- `.gitignore` gets `node_modules/`, `dist/` and `storybook-static/`. The
  lockfile is committed.
- `.claude/launch.json`'s `panel` entry runs the dev server on port 8765, so
  the `?fake` address in `CLAUDE.md` stays the same.

### The extension's id *(the owner's choice)*

`manifest.json` gains a `key` line, which fixes the extension's id whatever
folder Chrome loads it from. Without it the id would change again each time
the folder moves, and each time a branch's build is loaded from its worktree.

- Every copy of the extension is then the same one to Chrome, with the same
  saved roster and history. A branch build the owner loads sees the real data
  and can write to it; Export backup is the safeguard. Only one copy can be
  loaded at a time.
- The key is the public half of a key pair made for this purpose. The private
  half is not needed and is not kept.
- The move from version 1's folder-based id to the pinned one still happens
  once. "Switching over" covers it.

### Checking the built extension *(the owner's choice)*

Packaging mistakes (a wrong path in `dist/`, a script the content security
policy blocks, a background script that does not register) do not show on the
dev server. `npm run check:extension` is one small script that starts
Playwright's Chromium with `dist/` loaded as an unpacked extension and checks
that:

- the background script registers;
- the panel and the roster page open from their `chrome-extension://`
  addresses with no console error;
- on real, empty `chrome.storage`, the panel shows Start, and pressing it with
  no Meet tab open shows "Open the Meet call in this window, then press
  Start.".

It exits with an error when a check fails. It is not part of `npm test`,
because it needs a build and a browser. It does not cover a live Meet call or
the panel shown as a side panel; those stay the owner's checks.

### The panel's state moves out of the page

Today `src/panel/panel.js` holds both the page's behaviour (the 2-second poll,
Start, Fill with polling paused, End armed for 5 seconds, saving) and its
drawing. The port separates them.

- **`src/panel/controller.js`**, plain JavaScript, no DOM and no `chrome.*`.
  `createPanelController({ store, findMeet })` owns what `panel.js`'s
  module-level variables own today and exposes:
  - `open()`, and one function per owner action: start, end, split, fill, set a
    stage, ignore or restore, keep alone or join, mix working groups, toggle
    active, mark placed;
  - `subscribe(listener)` and `getView()`.
- **The view** is one plain object holding everything the page shows: the
  summary from `summarize()`, the notice, the errors, the fill result, and the
  flags the page needs (loading, filling, End armed, plan outdated, filled,
  owner names missing). The controller builds a new view object only when
  something in it changed, the same test `render()` uses today, so React
  redraws only then.
- **Components read the view and call the controller's functions.** They hold
  no session state of their own. Local interface state, such as an expanded
  message, stays in the component.
- **`Panel` takes the view and the functions as props.** Its stories then pass
  fixed views, one per state, with no controller behind them.
- **The controller is created once, in the entry file, outside React.** A
  component that created it would start a second poll when React mounts it
  twice in development.
- **The behaviour does not change.** The controller is `panel.js`'s logic
  moved, with the same timings and the same messages.
- **Tests:** `test/controller.test.js`, on the in-memory store and the fake
  Meet, with Node's mock timers. It covers at least: Start with and without a
  Meet tab, a poll applying answers and saving only what changed, Fill pausing
  the poll and reporting each of its three outcomes, End needing a second press
  within 5 seconds, and a session restored on open.

The roster page has no controller: its logic already lives in
`src/logic/roster.js` and `src/logic/history.js`, and what is left is loading,
changing, saving and redrawing. That stays in the page component.

### `?fake` pages get addressable states

The kit's checks take a screenshot of a URL, so each state worth checking needs
its own address. `?fake` keeps working as today and gains an optional `at`:

| Address | What it shows |
|---|---|
| `/src/panel/panel.html?fake` | Before Start |
| `/src/panel/panel.html?fake&at=collecting` | Session started, the demo answers in |
| `/src/panel/panel.html?fake&at=split` | The same, after Split |
| `/src/panel/panel.html?fake&at=filled` | After Fill, with one latecomer not in a room |
| `/src/roster-page/roster-page.html?fake` | The demo roster and history |

The state is in place at first paint, without waiting for the 2-second poll.
The Fake Meet box stays at the bottom of the panel in every `?fake` state.

The code that brings the fake to a state is plain JavaScript, so Node can test
it: each `at` value gives the session the table describes.

### Tests *(the owner's choice)*

- **Behaviour is tested where it lives, in plain JavaScript,** with
  `node --test`: the existing logic tests, the controller's, and the `at`
  states'.
- **Components have no test runner.** They only draw, and are checked by
  `npm run typecheck`, their stories, the kit's screenshots and review, and a
  hand check in the `?fake` panel.
- **So a task that only writes components is exempt from the failing-test
  check.** Its plan header says: `exempt: components only draw the
  controller's view; behaviour is tested in controller.js`.
- The alternative, not chosen: Storybook's Vitest addon running each story's
  assertions in a real browser. It would give component tasks a failing test
  first, at the cost of Vitest, the addon, a second test command and slower
  checks.

### Components

There is no catalog yet, so every component below is new to the project.

**From shadcn, added with its CLI:** `button`, `select`, `badge`, `checkbox`,
`label`, `input`, `textarea`, `table`, `alert`, `toggle`. Icons come from
`lucide-react`, which shadcn installs.

**The project's own shared components**, each in its own file with a stories
file beside it:

- `StageSelect`: the stage dropdown, its options from `STAGES`, with the
  `stage…` placeholder.
- `ActiveToggle`: the ★ button, pressed when the student is active. Used on
  both pages.
- `ClampedText`: text held to two lines that expands and collapses on click.

**The two pages**, `Panel` and `RosterPage`. A section used once (the tally,
the rooms preview, Unclear, No answer, Ignored, Not in a room yet, Flags, the
Fake Meet box) is a function inside its page's file, not a file of its own. The
page's stories show the page in each of its states, error states included.

How today's elements map:

| Today | After the port |
|---|---|
| Start, Split, Fill breakout rooms | `Button`, primary |
| Re-split, End, Keep alone, Join, Placed, Restore, Ignore, New group, Delete, the exports | `Button`, outline or ghost, small in rows |
| Keep alone / Join (the pressed one) | `Button` with `aria-pressed`, the pressed one filled |
| Stage, track and working group dropdowns | `Select` (`StageSelect` for stages) |
| ★ | `ActiveToggle` |
| `new` and `?` marks | `Badge` |
| Owner names warning, the notice, Changed since Split | `Alert` |
| Meet errors, a failed Fill, the import error | `Alert`, destructive |
| A successful Fill | `Alert` |
| Mix working groups | `Checkbox` with `Label` |
| Students table | `Table` |
| Group name, new group name, the Fake Meet fields | `Input` |
| Your Meet names | `Textarea` |

Text is always a React child, never `dangerouslySetInnerHTML`. Rows are keyed
by the student's name key, which is what keeps an open dropdown open. A
dropdown still closes when its own row leaves its section, for example when
that student answers while the owner is choosing for them. That is expected.

### The UI kit in this project

`CLAUDE.md` gains:

```
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

- `look: direction` with `adopted: no` says a `DESIGN.md` is intended and not
  written yet. Until step 2, tasks follow the kit's floor.
- Playwright and `@axe-core/playwright` are dev dependencies, so the kit's
  screens check runs from the repo root.
- Storybook is the catalog. Every `.tsx` file except the two `main.tsx` entries
  has a `.stories.tsx` beside it, the shadcn components included.
- **No mockups for this step:** no section's layout changes. The kit's reviewer
  judges against the points below and the task briefs.
- **How a kit finding is ruled in this step** *(my call, from the owner's
  choice to keep the layout)*:
  - It goes into a fix round when its fix leaves what the owner sees unchanged
    (for example a plural built from fragments, rebuilt as whole strings), or
    when it concerns something this port adds (the empty-state lines, the
    "Filling rooms…" label, the clamp, the roster table's scroll container).
  - It goes on step 2's list, with no fix round, when its fix would change
    today's wording, order or layout. That covers the stack's default look,
    rows that join several values (the tally line, the rooms preview rows),
    strings such as "no stage" and "no suggestion", and the `?` mark.
  - Every kit reviewer brief says so.

### The kit's points, per screen

**Side panel**

- **The question it answers:** who answered which stage, and which rooms will
  they go to?
- **Empty:**
  - Before Start: one line under the title, "Start a session to read stage
    answers from the Meet chat.", above the Start button.
  - Session started, no answers yet: "No answers yet. Students write their
    stage in the Meet chat." where the tally goes.
  - Sections with nothing in them (Unclear, No answer, Ignored, Not in a room
    yet, Flags) stay hidden, as today.
- **Loading:**
  - Opening: storage is local and answers at once, so the page shows its title
    and nothing else until it has loaded. No spinner.
  - Start: the button is disabled while the Meet tab is looked up, as today.
  - Fill: the button is disabled and reads "Filling rooms…" until Fill ends.
    Today it is only disabled.
  - Polling updates the page in place, with no indicator.
- **Error:** as today, with today's wording: the "Open the Meet call in this
  window, then press Start." notice, the list of failed Meet operations, the
  failed-Fill box with the rooms or names to enter by hand, and the owner-names
  warning.
- **Widths:** one column at 375, 768 and 1440 px, filling the width it is
  given. 1440 px only happens in the `?fake` preview. The page's `<main>` spans
  the page. Nothing scrolls sideways; long names and messages wrap or clamp.
- **Screens:** the four panel addresses in the table above.

**Roster page**

- **The question it answers:** who are my students, and how has each one's
  stage moved from session to session?
- **Empty:**
  - No students: "No students yet. They are added when they answer in a
    session." in place of the table's rows.
  - No working groups: "No working groups yet." above the new-group field.
  - A student with no history: a muted dash in the timeline cell, labelled "no
    sessions yet" for screen readers.
- **Loading:** as the panel: local and immediate, no spinner.
- **Error:** the import error, as today, saying what is wrong with the file.
- **Widths:** at 768 and 1440 px the table uses the full width. At 375 px the
  table scrolls sideways inside its own container, which is focusable and named
  "Students", with Name as the first column. The page itself never scrolls
  sideways.
- **Screens:** `/src/roster-page/roster-page.html?fake`.

### What is removed

`src/panel/panel.js`, `src/panel/panel.css`, `src/roster-page/roster-page.js`,
`src/roster-page/roster-page.css` and `src/dom.js`, once nothing uses them.

### `CLAUDE.md` after the port

- The Commands section names the new commands, and says Chrome loads `dist/`.
- These convention lines change:
  - "Plain JavaScript ES modules, no build step, no dependencies" becomes: the
    pages are React in `.tsx`, styled with Tailwind and shadcn components and
    built by Vite into `dist/`; every other file is plain JavaScript.
  - "put them in the page with `textContent` or DOM nodes, never `innerHTML`"
    becomes: as React text children, never `dangerouslySetInnerHTML`.
- These are added:
  - The panel's behaviour lives in `src/panel/controller.js`; components read
    its view and call its functions, and keep no session state.
  - `meet.js`, `background.js` and `manifest.json` are copied into `dist/`
    unchanged.
  - The `key` line in `manifest.json` pins the extension's id; it is never
    removed or changed.
  - The built extension makes no network request.
  - `?fake&at=<state>` opens the fake panel in that state.
- The `## Kits` section above.

## The shadcn commands *(the owner's choice)*

The kit's rule is that the owner runs the shadcn CLI, because it fetches code.
For this port the owner approved the ten components listed above and lets the
implementing session run the CLI itself: `init` once, then `add` for exactly
those ten. The run has no pause for it. Any other component is still the
owner's to add, as the kit says.

## Where the work happens

The port is built in a worktree of its own. The folder Chrome loads the
extension from today is not touched by the run, so the current extension keeps
working until the owner switches over.

## Switching over *(the owner's steps, after the merge)*

1. **First, before the folder Chrome loads today changes in any way:** in the
   current extension, open the roster page and press **Export backup**. Once
   that folder holds the new source, the old roster page no longer opens. If
   Chrome loads the extension from an old session's worktree, export before
   that worktree is cleaned up.
2. Bring the merged `main` into the main checkout, then run `npm install` and
   `npm run build` there.
3. In `chrome://extensions`, turn the old entry **off**, without removing it:
   removing it deletes its saved data. Then **Load unpacked** and pick the main
   checkout's `dist/` folder. Its card should show no error.
4. Open the roster page and **Import backup**.
5. In a real call, open the panel, press Start and check that answers appear.
   The Meet-facing files did not change, so this is a check that the new page
   is wired to them correctly.
6. After the first good real session on the port, remove the old entry.

Step 5 is the one check the run cannot make itself. If it fails, that is a fix
on a new branch.

### Falling back to version 1 *(the owner's choice)*

Version 1 is tagged `v1` (commit `a61b5ab`) and needs no build. To fall back:
check the tag out into a folder, **Load unpacked** that folder, and **Import
backup**. The old entry, turned off, keeps a second copy of the data until
step 6.

## Done when

- `npm test` passes: the existing tests unchanged, plus the controller's.
- `npm run typecheck`, `npm run build` and `npm run build-storybook` pass.
- `dist/` holds the manifest, the two copied scripts identical to their
  sources, the two pages and their assets. The build fails if a file the
  manifest names is missing from `dist/`.
- `npm run check:extension` passes on that build.
- In the `?fake` panel, checked by hand in the browser by the implementing
  session: Start, Play demo answers, Split, Fill and End behave as in version
  1, and a stage dropdown left open stays open when a fake answer is sent.
- The kit's checks pass on the five screens, and its catalog check finds a
  stories file beside every component.
- `CLAUDE.md` reads as described above.

## Left to the builder

- Versions: the current stable release of each tool, pinned by the lockfile.
- How the three files are copied into `dist/` (a few lines in the Vite config,
  or a plugin), as long as watch mode copies them too.
- The view object's exact fields, and the controller's function names.
- How the key pair for the manifest's `key` is made.
- How the `at` states are reached in the fake.
- How the roster page redraws after a change made in place.
- Whether the entry files call `chrome.*` directly (with `@types/chrome`) or
  receive what they need from a plain JavaScript file.
- File names and folders for the components, apart from the two the `## Kits`
  lines name.
- The order and split of tasks, and which can run side by side.
