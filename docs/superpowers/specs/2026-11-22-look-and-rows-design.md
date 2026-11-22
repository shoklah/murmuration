# Murmuration: the look and the panel's rows

Date: 2026-11-22
Status: approved by the owner on 2026-11-22

## Why

The port to React (2026-11-21) left both pages on the stack's neutral look and kept every row as
it was. The owner found the result bland and dense, and put it down to misalignment: rows that
join several values, text buttons of different widths, nothing on a shared grid.

This is step 2 of port, look, audit. It gives the extension its own look and reworks the panel's
rows so a split of about 40 students reads at a glance in a 360 px side panel during a call.

The owner picked both together, from rendered try-outs: the **starling plumage** look with
**rooms as dots** in the tally, on the icon rows. `DESIGN.md` at the repo root records the look
and was approved on 2026-11-22. The first real session on the extension is 2026-11-26; nothing
seen in use informs this design yet.

## Goals

- Both pages follow `DESIGN.md`: its colours, type, shapes and rules, dark only.
- Every list row in the panel is one line on one grid: the name first, then fixed columns of
  icon actions at the trailing edge.
- The tally shows each room as a cluster, one mark per student, so room sizes, active students
  and working groups are seen without reading.
- No line of the panel joins several values into a sentence.
- The font ships inside the extension.

## Non-goals

- Any change to what a session does: no new action, no changed rule, no change to Split, Fill or
  End. `src/logic/`, `src/meet/`, `src/store.js`, `src/panel/controller.js`,
  `src/panel/meet-client.js`, `src/background.js` and the manifest are not touched.
- The roster page's layout. It takes the look through the tokens and nothing else. Its timeline
  still shows stage codes; that goes on the audit's list (step 3).
- A light theme, or any switch. `DESIGN.md` records light values; nothing uses them.
- Better icons. The owner said this can wait.
- Ideas raised and not chosen: a colour step per season, Fill and Re-split in a bar fixed to the
  bottom, the clamp's missing affordance at rest, the file input's look. The last two go on the
  audit's list.
- The kit's audit, and removing `adopted: no`.

## Anti-goals (it fails even if it works)

- A row's action is harder to find or to hit than today's text button: every icon button keeps a
  tooltip, an accessible name and a 28 px target.
- A cluster in the tally disagrees with its room in the preview (a different size, a missing
  star).
- The built extension fetches a font or anything else from the network.
- Chat text or a display name reaches the page as HTML.

## Constraints

- The project's `## Code conventions` in `CLAUDE.md` hold. Two matter most here: the panel's
  components only draw the controller's view, and a section used once is a function inside
  `Panel.tsx`.
- The kit's stack rules hold: colours, radii, fonts and shadows are tokens in `src/index.css`,
  never literals in a component; layout-only arbitrary values are allowed.
- The side panel is about 360 px wide. The kit checks 375, 768 and 1440 px.
- No new shadcn component is needed. Icons come from `lucide-react`, already installed.
- The throwaway branch `throwaway/direction-variants` (commit `c32214b`) holds the try-out this
  design was picked from. It is a reference to read, never merged: its look is written as
  overrides in `src/directions/directions.css`, which is not how the real change is built.

## Approaches considered

| | Approach | Trade-off | Outcome |
|---|---|---|---|
| **A** | **One change: tokens and font into the theme file, rows and tally rebuilt in `Panel.tsx`, dark only** | **One review of the panel as the owner picked it; the look and the rows touch the same lines** | **Chosen** |
| B | Two changes: the look first, the rows after | Smaller diffs, but the rows are what made every look readable, and both edit the same components | Not chosen |
| C | Light and dark, following the system setting | A light half the owner has not seen, and every screen checked twice | Not chosen by the owner |
| D | A light/dark switch in the panel | Needs a saved setting; the store is out of scope | Dropped |

## The look

`DESIGN.md` is the reference. How it lands in the code:

- **Tokens:** `src/index.css` holds the `DESIGN.md` dark values under `:root`, with
  `color-scheme: dark`. The `.dark` block is removed, since nothing switches it. The generated
  components style several states only through `dark:` classes, so both pages' `<html>` and
  Storybook's preview carry `class="dark"`, which keeps that variant on, as it was in the
  mockups *(my call)*. New tokens:
  `--star`, `--sheen-green`, `--sheen-violet`, `--line`, `--field` (the field's fill), each mapped in `@theme inline`.
  *(my call: the stack file asks for a light and a dark value per token; with a dark-only
  extension the light values live in `DESIGN.md` only. `CLAUDE.md` records this.)*
- **Font:** `source-sans-3-latin-wght-normal.woff2` (OFL-1.1, from
  `@fontsource-variable/source-sans-3` 5.3.1), copied from the throwaway branch into
  `src/fonts/` with the package's OFL licence text beside it (taken from the package's tarball
  with `npm pack` in a scratch folder; no dependency is added), declared by `@font-face` in `src/index.css` and
  set as `--font-sans`. Latin only *(my call)*: names outside it fall back to the system font.
- **Page:** the near-black background with the green and violet glow at the top, on `body`, on
  both pages.
- **Components** take the look through tokens and their existing variants first. Where
  `DESIGN.md` asks for more than a token gives (the outline button's hairline, pill badges, the
  field's fill), the generated component's classes are edited in `src/components/ui/`. The room
  panel's sheen is a utility in `src/index.css` (as `scroll-shadow-x` is), with its three
  alternating forms.
- **Links:** the Roster link takes the link rule (cream text, green underline) from a base style
  in `src/index.css`, not from classes on the element.
- **Focus:** the stack's ring, in `--ring`.

## The panel's rows

All rows share one grid, written once in `Panel.tsx`: a flexible name cell, then fixed trailing
columns of 28 px per icon and 112 px per stage dropdown. A row is one line, 32 px high, with a
hover highlight and no rule between rows.

| Section | Name cell | Trailing columns |
|---|---|---|
| Room member (a student not on the roster keeps an empty star column, so the icons line up) | name; working group (diamond and name, muted); `new`; `?` when the stage was guessed; a stage tag when their stage differs from the room's | star (roster students only); before Fill: change stage (icon), ignore (icon) |
| Not in a room yet | name; `last: <stage>` muted when the stage is a guess | stage dropdown, placed (check icon); then one muted line under the row: `Suggested: <room>`, `No room fits <stage>` or `No stage yet` |
| Flags | the existing sentence | stage dropdown |
| Unclear | name; `new` | stage dropdown, ignore; then the clamped message under the row |
| No answer | name; `new`; `last: <stage>` muted | stage dropdown, ignore |
| Ignored | name | restore (eye icon) |

- **Icons:** star (active), two arrows (change stage), eye-off (ignore), eye (restore), check
  (placed), one person (keep alone), two people (join). Each is an icon button whose label is its
  tooltip and accessible name; today's wording is kept in the labels (`Ignore <name>`,
  `Keep <name> alone`, `<name> joins <room>`, `<name> is placed in <room>`).
- **Change stage in a room** is the stage dropdown drawn as one icon button that opens the same
  list. `StageSelect` gains a `compact` prop for it, built without `!important` classes so the
  theme can style it.
- **The star:** lit is `--star`, unlit is a muted outline. `ActiveToggle` keeps its API.
- **Working groups split by stage** replaces the sentence
  `Working group X is split: A (stage), B (stage)`: a section with that heading, and under each
  group's name (diamond, muted) one row per student, the name leading and the stage label
  trailing, muted.
- **A room:** a panel with its name and its count pill on the first line, a hairline under it,
  then its member rows.

## The tally

A three-column grid: stage label, count (right-aligned, tabular), rooms.

- **Each room is a cluster:** one mark per student in the room, in two rows packed like a
  honeycomb (the top row holds half, rounded up; one or two students sit in one row). A star is
  an active student, a dot anyone else, and a line ties students of one working group who are in
  that room together. Tied students are placed side by side.
- Clusters of one stage sit on one line and wrap; the gap between clusters is at least twice the
  gap between marks.
- Each cluster is an image with the accessible name `<room>: <n> students` (`1 student` as its
  own string), also its tooltip.
- **Before Split** the clusters show the rooms Split would make, as today's tally does.
- **After Fill**, a student marked placed in a room counts in that room's cluster and in its
  count pill, so both agree with the preview's rows. *(my call: today the pill leaves them out)*
- **Mix working groups:** when it is on, no tie is drawn, as the pill shows no diamond. The
  member row's diamond is unchanged. Ties match on the group's name, the only thing the view
  gives.
- **A student alone** keeps today's row: `<name> is alone` or `<name> joins <room>`, muted, with
  the keep-alone and join icon buttons.
- The cluster is a function inside `Panel.tsx` *(my call: it is used once)*. It reads the same
  room and member data the preview does, so the two cannot disagree.

## The roster page

Look only: tokens, font, the page glow. No row, column or control changes. No mockup, by the
kit's rule for a change with no layout change.

## The kit's points

**Side panel**

- **The question it answers:** who answered which stage, and which rooms will they go to?
- **Empty, loading, error:** unchanged from the port's design, in the new look. Sections with
  nothing in them stay hidden; "Working groups split by stage" is one of them.
- **Widths:** one column at 375, 768 and 1440 px. Nothing scrolls sideways: names truncate with
  their full text as tooltip, clusters wrap.
- **Screens:** `/src/panel/panel.html?fake`, `?fake&at=collecting`, `?fake&at=split`,
  `?fake&at=filled`.
- **Components:** `Button`, `Badge`, `Select`, `Checkbox`, `Label`, `Input`, `Alert`: existing,
  restyled. `StageSelect`: adapted (the `compact` prop). `ActiveToggle`: existing, restyled.
  `ClampedText`: existing. No new shared component.

**Roster page**

- **The question it answers:** who are my students, and how has each one's stage moved?
- **States and widths:** unchanged.
- **Screens:** `/src/roster-page/roster-page.html?fake`.
- **Components:** `Table`, `Select`, `Input`, `Textarea`, `Button`, `ActiveToggle`: existing,
  restyled.

## Mockups

Rendered on the real components with a class of 41 invented students, at 1440 and 375 px, in
`~/.claude/workflow-archive/2026-11-22-claude-ui-look-cb6304-plan-kit/approved/`: the panel
before Start, collecting, split and filled. They are the kit reviewer's reference.

Where a mockup and this text disagree, the text wins. Known differences: the mockups come from
the throwaway branch, so the Fake Meet box and the Roster link are styled by overrides there.

## The demo class

The mockups use `src/directions/class40.js` on the throwaway branch. The real change does not
carry it: `?fake` keeps the demo's 12 students, which the tests and the stories are built on.
*(my call)*

## Tests and stories

- Behaviour does not change, so `npm test` stays as it is and must pass.
- The tasks only draw the controller's view. Each carries
  `**Failing-test check:** exempt: components only draw the controller's view; behaviour is tested in controller.js`.
- `StageSelect.stories.tsx` gains a compact story. `Panel.stories.tsx` keeps its states; they
  show the new rows by construction.
- `npm run typecheck`, `npm run build`, `npm run build-storybook` and `npm run check:extension`
  pass.

## `CLAUDE.md` after this change

- A pointer to `DESIGN.md` beside the specs.
- New convention lines:
  - The look follows `DESIGN.md`; the extension is dark only, so tokens in `src/index.css` hold
    one value each under `:root` and the light values live in `DESIGN.md`.
  - The font is a bundled `woff2` in `src/fonts/`, declared in `src/index.css`.
  - Every panel row uses the one row grid in `Panel.tsx`: the name cell first, then fixed
    trailing columns; a row action is an icon button whose label is its tooltip and accessible
    name.
- `adopted: no` stays until the audit.

## Done when

- The four panel screens match their mockups and this text; the roster page shows the look.
- The kit's checks pass on the five screens.
- No `!important` utility in `StageSelect`; no colour literal in a component.
- The built extension makes no network request (`npm run check:extension` passes).
- The owner approves one before-and-after capture, as the kit's direction step asks.

## Left to the builder

- The exact utility classes, and how the row grid is written.
- The cluster's geometry in pixels, within `DESIGN.md`'s sizes.
- Whether the sheen's three forms are one utility with modifiers or three.
- The order and split of tasks.
