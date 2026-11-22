# The Look and the Panel's Rows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give both pages the starling plumage look from `DESIGN.md`, and rebuild the side panel's rows on one grid with each room drawn as a cluster of marks in the tally.

**Architecture:** The look lands as tokens, one bundled font and two decorative backgrounds in `src/index.css`, then as class edits in the generated components. The rows and the tally are rebuilt inside `src/panel/Panel.tsx`, which keeps drawing the controller's view and nothing else. No behaviour changes.

**Tech Stack:** React 19, Tailwind 4, shadcn components, `lucide-react`, Vite 8, Storybook 10.

**Spec:** `docs/superpowers/specs/2026-11-22-look-and-rows-design.md`. The look's reference is `DESIGN.md` at the repo root. Read both in full before any task.

**Reference try-out:** commit `c32214b` (branch `throwaway/direction-variants`) holds the panel the owner picked. Read it with `git show c32214b:<path>`; never check it out, merge it or copy its `src/directions/` files. Its look is CSS overrides on `data-part` and `data-slot` hooks, which is not how this change is built: here the look is tokens and classes, and no `data-part` attribute is added.

## Global Constraints

- Not touched: `src/logic/`, `src/meet/`, `src/store.js`, `src/panel/controller.js`, `src/panel/meet-client.js`, `src/background.js`, `manifest.json`, `src/panel/fake-states.js`, `src/panel/demo.js`.
- The built extension makes no network request. The font is a file in the repo; no font package is added to `package.json`.
- No colour, radius, font or shadow literal in a component: they are tokens in `src/index.css`. Layout-only arbitrary values (grid templates, sizes) are allowed. No `!important` utility (`h-7!`) in a hand-written component; the one the generated `badge.tsx` already has (`[&>svg]:size-3!`) stays.
- Dark only: tokens hold one value each under `:root`; there is no `.dark` block and no light value in code.
- No new shadcn component, and no new shared component: `IconButton` and the cluster are functions inside `Panel.tsx`.
- Chat text and display names are React text children. Hand-written components declare no return type and import `cn` from `@/lib/utils`.
- Wording that exists today stays word for word, except where a task gives new wording.
- `npm test` is not edited and must pass after every task.
- Every task carries `**Failing-test check:** exempt: components only draw the controller's view; behaviour is tested in controller.js`.

## Review Focus

The project has no test runner for components, and the spec keeps it so. These five are what no test exercises; each names where a reviewer sees it.

1. **A long display name** in every row type: it truncates with its full text as tooltip, and the trailing icons stay in their columns. The demo's names are too short to truncate, so no capture shows it: checked in the diff by `min-w-0` and `truncate` on every name cell, and a `title` holding the full name.
2. **A room of one, two, and an odd number of students:** one or two marks sit in one row; from three, the top row holds half rounded up. Checked in the diff of `RoomCluster`; `?fake&at=split` shows several sizes.
3. **A student placed after Fill:** they count in the room's cluster and its pill, with their star if active and their working group's tie and diamond, so both agree with the room's rows. Checked in the diff: the cluster, the pill and the rows all read `roomPeople`.
4. **Mix working groups on:** no tie in any cluster; the member row's diamond is unchanged. Checked in the diff.
5. **A room member who is not on the roster:** the star column stays, empty, so change-stage and ignore line up with the rows above. The demo cannot produce one (every room member it makes is on the roster), so it is checked in the diff only.

## Notes for the session running implementation

- **Kits:** `ui [react-tailwind-shadcn]` on tasks 1 to 4. The project carries `adopted: no`: adoption is pending and is not started here.
- **Before captures.** Before Task 1, run the kit's screens check with `--capture-only` on `/src/panel/panel.html?fake&at=split` at 375 px into `<the kit output folder>/before`. At the finish, show the owner that capture beside the same screen from Task 4's kit check: the spec's last "Done when" line is their approval of it.
- **Mockups** for `kit-reviewer`: `~/.claude/workflow-archive/2026-11-22-claude-ui-look-cb6304-plan-kit/approved/` (panel before Start, collecting, split, filled; 41 invented students, where the real `?fake` has 12). Where a mockup and the spec disagree, the spec wins. The roster page has no mockup: it is judged against `DESIGN.md` and the spec's points.
- **What each kit review judges.** The mockups show the finished panel. After Task 1 only the tokens, font, type and page are in; after Task 2 the components too; the rows arrive in Task 3 and the tally in Task 4. Say so in each `kit-reviewer` dispatch, so a row not yet rebuilt is not a finding on Tasks 1 and 2. In Task 2's captures each stage dropdown fills a whole line, because it is full width one task before the grid that holds it: say that too.
- **The Fake Meet box** is a development aid drawn only under `?fake`. Its content is out of scope, its `Room: a, b, c` lines included; say so in the `kit-reviewer` dispatches.
- **No waves:** each task builds on the one before, and three of them edit `Panel.tsx`.

## File structure

| File | Change | Task |
|---|---|---|
| `src/index.css` | tokens, font face, type tokens, page glow, link style, `sheen` utility, reduced motion | 1 |
| `src/fonts/source-sans-3-latin-wght-normal.woff2`, `src/fonts/OFL.txt` | new | 1 |
| `src/panel/panel.html`, `src/roster-page/roster-page.html`, `.storybook/preview.ts` | the `dark` class | 1 |
| `src/panel/Panel.tsx` | headings (1); rows, sections, room panels (3); tally (4) | 1, 3, 4 |
| `src/roster-page/RosterPage.tsx` | heading classes only | 1 |
| `src/components/ui/{button,badge,input,textarea,select,checkbox,alert}.tsx` | class edits | 2 |
| `src/components/ActiveToggle.tsx`, `src/components/StageSelect.tsx`, `StageSelect.stories.tsx` | star icon; `compact` | 2 |
| `CLAUDE.md` | pointer and convention lines | 1, 3 |
| `DESIGN.md` | the `field` colour, the `input` row's use | 1 |

---

### Task 1: The theme: tokens, font, type and page

**Kit:** ui [react-tailwind-shadcn]
**Screens:** /src/panel/panel.html?fake, /src/panel/panel.html?fake&at=collecting, /src/panel/panel.html?fake&at=split, /src/panel/panel.html?fake&at=filled, /src/roster-page/roster-page.html?fake
**Failing-test check:** exempt: components only draw the controller's view; behaviour is tested in controller.js

**Files:**
- Modify: `src/index.css`, `src/panel/panel.html`, `src/roster-page/roster-page.html`, `.storybook/preview.ts`, `src/panel/Panel.tsx` (the `h1`, the `h2`s and the Roster link only), `src/roster-page/RosterPage.tsx` (the `h1`s and `h2`s only), `CLAUDE.md`, `DESIGN.md`
- Create: `src/fonts/source-sans-3-latin-wght-normal.woff2`, `src/fonts/OFL.txt`

**Interfaces:**
- Produces, for later tasks: colour utilities `star`, `sheen-green`, `sheen-violet`, `line`, `field` (as in `text-star`, `border-line`, `bg-field`); the weight utility `font-strong` (650); the tracking utility `tracking-title`; the utility `sheen`; radius `rounded-lg` 10 px, `rounded-md` 8 px, `rounded-sm` 4 px.

- [ ] **Step 1: The font files**

```bash
mkdir -p src/fonts
git show c32214b:src/directions/fonts/source-sans-3-latin-wght-normal.woff2 > src/fonts/source-sans-3-latin-wght-normal.woff2
```

The file is 28872 bytes (`wc -c`); if a shell hook rewrote the command and the size differs, run it again as `rtk proxy git show …`. For the licence, in a scratch folder outside the repo run `npm pack @fontsource-variable/source-sans-3@5.3.1`, unpack the tarball and copy its `LICENSE` file to `src/fonts/OFL.txt`. `package.json` and the lock file do not change.

- [ ] **Step 2: Tokens in `src/index.css`**

Replace the values under `:root` with the `colors` of `DESIGN.md`'s front matter, as written there (hex), and add `color-scheme: dark`. Delete the `.dark` block; keep the `@custom-variant dark` line. Besides the `DESIGN.md` roles:

```css
  --star: #f6c544;
  --sheen-green: #40be9c;
  --sheen-violet: #8468ff;
  --line: rgb(244 236 214 / 0.14);
  --field: #101216;
  --chart-1: #58cfae;
  --chart-2: #b6a1ff;
  --chart-3: #f6c544;
  --chart-4: #ff9580;
  --chart-5: #aaa694;
  --radius: 0.625rem;
```

The `--sidebar*` properties keep the values the `.dark` block had. In `@theme inline` add:

```css
    --font-sans: 'Source Sans 3 Variable', system-ui, sans-serif;
    --font-weight-strong: 650;
    --tracking-title: 0.005em;
    --color-star: var(--star);
    --color-sheen-green: var(--sheen-green);
    --color-sheen-violet: var(--sheen-violet);
    --color-line: var(--line);
    --color-field: var(--field);
```

and change `--radius-sm` to `0.25rem`.

- [ ] **Step 3: Font face, page, link, sheen and reduced motion in `src/index.css`**

```css
@font-face {
  font-family: 'Source Sans 3 Variable';
  font-style: normal;
  font-display: swap;
  font-weight: 200 900;
  src: url('./fonts/source-sans-3-latin-wght-normal.woff2') format('woff2-variations');
}
```

In `@layer base`, `body` keeps `text-foreground` and takes the page glow in place of `bg-background`; links take the link rule; reduced motion removes transitions:

```css
  body {
    background:
      radial-gradient(130% 300px at 0% -70px, color-mix(in oklab, var(--sheen-green) 26%, transparent), transparent 68%) no-repeat,
      radial-gradient(120% 320px at 100% -90px, color-mix(in oklab, var(--sheen-violet) 30%, transparent), transparent 68%) no-repeat,
      var(--background);
  }
  a {
    color: var(--primary);
    text-decoration: underline;
    text-decoration-color: var(--ring);
    text-underline-offset: 4px;
  }
  @media (prefers-reduced-motion: reduce) {
    * { transition: none !important; }
  }
```

The room panel's sheen, beside `scroll-shadow-x`:

```css
/* A room panel's plumage: a diagonal green and violet sheen over its fill, in three forms that
   alternate down a list. */
@utility sheen {
  --sheen-g: color-mix(in oklab, var(--sheen-green) 20%, transparent);
  --sheen-v: color-mix(in oklab, var(--sheen-violet) 22%, transparent);
  background-image: linear-gradient(118deg, var(--sheen-g) 0%, transparent 42%, transparent 60%, var(--sheen-v) 100%);
  &:nth-child(3n+2) {
    background-image: linear-gradient(118deg, var(--sheen-v) 0%, transparent 46%, transparent 64%, var(--sheen-g) 100%);
  }
  &:nth-child(3n) {
    background-image: linear-gradient(104deg, transparent 0%, var(--sheen-g) 52%, var(--sheen-v) 100%);
  }
}
```

- [ ] **Step 4: The `dark` class**

`<html lang="en" class="dark">` in `src/panel/panel.html` and `src/roster-page/roster-page.html`. In `.storybook/preview.ts`, after the CSS import: `document.documentElement.classList.add('dark');`.

- [ ] **Step 5: Type on the two pages**

In `Panel.tsx` and `RosterPage.tsx`, every `h1` takes `text-xl font-strong tracking-title` and every `h2` takes `font-strong` at the body size (14 px), in place of its size and weight classes. The Roster link in `Panel.tsx` loses its `className`; the base style draws it.

- [ ] **Step 6: `CLAUDE.md` and `DESIGN.md`**

In `DESIGN.md`, so it matches what is built: add `field: "#101216"` to the front matter's `colors` and a `field` row to the Colors table (`#101216`, the fill of fields and dropdowns) and to the Dark mode table (light: `#fffdf6`); the `input` row's use becomes `kept for the stack's components; the look's own borders are cream hairlines`.

In `CLAUDE.md`:

Under the spec and plan pointers add `- Look: \`DESIGN.md\`` and pointers to this spec and plan. Under `## Code conventions` add:

```markdown
- The look follows `DESIGN.md`; the extension is dark only, so tokens in `src/index.css` hold one value each under `:root` and the light values live in `DESIGN.md`.
- The font is a bundled `woff2` in `src/fonts/`, declared in `src/index.css`.
```

- [ ] **Step 7: Verify**

Run: `npm run typecheck && npm test && npm run build && ls dist/assets | grep woff2 && npm run check:extension`
Expected: all pass; one `.woff2` file listed; `no request leaves the extension` passes.

- [ ] **Step 8: Commit**

```bash
git add src/index.css src/fonts src/panel/panel.html src/roster-page/roster-page.html .storybook/preview.ts src/panel/Panel.tsx src/roster-page/RosterPage.tsx CLAUDE.md DESIGN.md
git commit -m "feat: the plumage theme — tokens, the bundled font, type and the page glow"
```

---

### Task 2: The components take the look

**Kit:** ui [react-tailwind-shadcn]
**Screens:** /src/panel/panel.html?fake, /src/panel/panel.html?fake&at=collecting, /src/panel/panel.html?fake&at=split, /src/panel/panel.html?fake&at=filled, /src/roster-page/roster-page.html?fake
**Failing-test check:** exempt: components only draw the controller's view; behaviour is tested in controller.js

**Files:**
- Modify: `src/components/ui/button.tsx`, `badge.tsx`, `input.tsx`, `textarea.tsx`, `select.tsx`, `checkbox.tsx`, `alert.tsx`; `src/components/ActiveToggle.tsx`; `src/components/StageSelect.tsx`; `src/components/StageSelect.stories.tsx`

**Interfaces:**
- Consumes: Task 1's utilities.
- Produces: `StageSelect({ value, onChange, label, disabled, compact })` with `compact?: boolean`; `ActiveToggle` with its API unchanged, 28 px square.

These files are generated by shadcn and edited by hand here, as the spec allows. Change only the classes named; `cn` there merges like `tailwind-merge`, so a later class replaces an earlier one of the same kind.

- [ ] **Step 1: `button.tsx`**

- Base: `font-medium` becomes `font-semibold`; `transition-all` becomes `transition-colors`; `active:not-aria-[haspopup]:translate-y-px` is removed (press changes colour only).
- `default`: add `font-bold`.
- `outline`: `border-primary/30 bg-transparent hover:bg-primary/9 hover:text-foreground aria-expanded:bg-primary/9 aria-expanded:text-foreground`, with no shadow and no `dark:` class.
- `ghost`: `hover:bg-primary/9 hover:text-foreground aria-expanded:bg-primary/9 aria-expanded:text-foreground`, with no `dark:` class.

- [ ] **Step 2: `badge.tsx`**

Base: `font-medium` becomes `font-semibold`, `transition-all` becomes `transition-colors`. `outline`: `border-border` becomes `border-primary/30`.

- [ ] **Step 3: Fields: `input.tsx`, `textarea.tsx`, the trigger and the list in `select.tsx`, `checkbox.tsx`**

- Input, textarea and select trigger: `bg-field border-primary/22` in place of `bg-transparent border-input`; remove `shadow-xs`, `dark:bg-input/30` and `dark:hover:bg-input/50`.
- Select content: `ring-primary/22` in place of `ring-foreground/10`; remove `shadow-md`.
- Checkbox: `border-primary/50` in place of `border-input`; remove `shadow-xs` and `dark:bg-input/30`.

- [ ] **Step 4: `alert.tsx`**

Base: add `border-line`. `destructive`: add `border-destructive`.

- [ ] **Step 5: `ActiveToggle.tsx`**

A `Button` with `variant="ghost" size="icon-sm" className="size-7"` holding lucide's `Star`: lit is `fill-current text-star`, unlit is `text-muted-foreground`. `aria-pressed`, `aria-label` and `title` stay. Update the doc comment.

- [ ] **Step 6: `StageSelect.tsx`**

Add `compact?: boolean`. Both forms pass `size="sm"`.
- Not compact: the trigger takes `className="w-full data-[size=sm]:h-7"`.
- Compact: the trigger is a 28 px icon button that opens the same list: it holds lucide's `ArrowRightLeft` in place of `SelectValue`, takes `title={label}`, and its classes are `data-[size=sm]:h-7 w-7 justify-center border-transparent bg-transparent p-0 text-muted-foreground hover:bg-primary/9 hover:text-foreground [&>svg:last-child]:hidden` (the last hides the chevron). No `!` modifier.

Update the doc comment with one line on `compact`.

- [ ] **Step 7: The compact story**

In `StageSelect.stories.tsx`: `export const Compact: Story = { args: { compact: true, value: 'S02DS', label: 'Change stage for Ana' } };`

- [ ] **Step 8: Verify**

Run: `npm run typecheck && npm test && npm run build && npm run build-storybook`
Expected: all pass. `grep -n '!' src/components/StageSelect.tsx` shows no class ending in `!`.

- [ ] **Step 9: Commit**

```bash
git add src/components
git commit -m "feat: the components take the plumage look; a compact stage dropdown"
```

---

### Task 3: The panel's rows and room panels

**Kit:** ui [react-tailwind-shadcn]
**Screens:** /src/panel/panel.html?fake&at=collecting, /src/panel/panel.html?fake&at=split, /src/panel/panel.html?fake&at=filled
**Failing-test check:** exempt: components only draw the controller's view; behaviour is tested in controller.js

**Files:**
- Modify: `src/panel/Panel.tsx` (everything but `Tally` and `FakeMeet`), `CLAUDE.md`

**Interfaces:**
- Consumes: `StageSelect`'s `compact`, `ActiveToggle`, Task 1's utilities.
- Produces, inside `Panel.tsx`, for Task 4:
  - `IconButton({ label, pressed, disabled, onClick, children })`: `label: string; pressed?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode`.
  - `roomPeople(room: RoomSummary, members: Map<string, Member>): Member[]`: the room's members then its placed students.
  - `RoomSize({ room, members, ties })`: the count pill; `ties` is `!session.mixWorkingGroups`.
  - `Name`, which now truncates, and `muted`.

`git show c32214b:src/panel/Panel.tsx` has these rows as the owner picked them. Port into the current file only what the steps name; do not start from the try-out's whole file, which predates Task 1 (its headings and Roster link are the old ones). `Tally` and `RoomDots` there are Task 4's; the current `Tally` stays as it is until then, with `roomSize` and `rowClass` kept for it.

- [ ] **Step 1: The row grid and `IconButton`**

One grid for every row, written once: a name cell `minmax(0, 1fr)`, then fixed trailing columns, `1.75rem` per icon and `7rem` per stage dropdown, as the try-out's `row`, `ICON`, `PICK` and `cols` do. A row is one line, `min-h-8`, with `hover:bg-primary/7` and no rule between rows. `IconButton` is the try-out's: a ghost `Button` at `size-7`, muted until hovered, `variant="secondary"` when pressed, its `label` as `aria-label` and `title`.

Differences from the try-out, for the whole file:
- No `data-part` attribute, and no `VARIANT`, `ROOM_SELECT` or `DOTS`: the room rows always use the compact stage dropdown.
- Sections sit 20 px apart (`gap-5` in `Session`), 4 px inside one.

- [ ] **Step 2: The sections' rows**

As the try-out's `MemberRow`, `NotInRoom`, `Flags`, `Unclear`, `NoAnswer`, `Ignored` and `SplitGroups`, and the spec's row table. Icons from `lucide-react`: `EyeOff` (ignore), `Eye` (restore), `Check` (placed), `Diamond` (working group). Differences and pinned values:

- **Names:** every name's `title` is the full name. In a member row, where today's tooltip is the chat message, it is `<name>: <message>` when there is a message, as one template string.
- **Member row:** the star column is always there; a student not on the roster leaves its cell empty (an empty `<span />`). So the trailing columns are icon, and before Fill two more icons.
- **Labels:** `Change stage for <name>`, `Ignore <name>`, `Restore <name>`, `<name> is placed in <room>`, and `No room to place <name> in` on the disabled placed button.
- **Not in a room yet:** the hint line under the row is exactly `Suggested: <room>`, `No room fits <stage label>` or `No stage yet`; `last: <stage label>` shows beside the name when the stage is a guess.
- **Working groups split by stage:** the heading is exactly that; a group with no name shows `Working group`; each student row is `min-h-8`.
- **Stage tag:** an outline `Badge` with the member's stage label when their stage is set and differs from `room.stage`.

- [ ] **Step 3: Room panels, `roomPeople` and the count pill**

- Each room is an `li` with `sheen rounded-lg border border-line bg-card` and padding `8px 10px 4px`; rooms sit 12 px apart. Its first line is the room's name (`font-strong`) and `RoomSize`, over a `border-b border-line`; its member rows follow, drawn from `roomPeople`.
- `RoomSize` is a `Badge` in its default variant with `font-bold tabular-nums`: the size is `roomPeople(...).length`, then one filled `Star` per active student among them, then one filled `Diamond` per working group that has two or more of them, matched on `member.group`, and none when `session.mixWorkingGroups` is on. So `RoomSize` also takes `ties: boolean`, as the cluster will. *(The controller's `room.active` and `room.units` leave placed students out, so the pill counts from `roomPeople`, as the cluster's stars and ties do.)*

- [ ] **Step 4: `CLAUDE.md`**

Under `## Code conventions` add:

```markdown
- Every panel row uses the one row grid in `Panel.tsx`: the name cell first, then fixed trailing columns; a row action is an icon button whose label is its tooltip and accessible name.
```

- [ ] **Step 5: Verify**

Run: `npm run typecheck && npm test && npm run build`
Expected: all pass. `grep -n "data-part\|VARIANT" src/panel/Panel.tsx` prints nothing.

- [ ] **Step 6: Commit**

```bash
git add src/panel/Panel.tsx CLAUDE.md
git commit -m "feat: the panel's rows on one grid, icon actions and room panels"
```

---

### Task 4: The tally

**Kit:** ui [react-tailwind-shadcn]
**Screens:** /src/panel/panel.html?fake&at=collecting, /src/panel/panel.html?fake&at=split, /src/panel/panel.html?fake&at=filled
**Failing-test check:** exempt: components only draw the controller's view; behaviour is tested in controller.js

**Files:**
- Modify: `src/panel/Panel.tsx` (`Tally`, the new `RoomCluster`; `roomSize` and `rowClass`, which nothing uses any more, are deleted)

**Interfaces:**
- Consumes: `IconButton`, `roomPeople`, `Name`, `muted` from Task 3.
- Produces: `RoomCluster({ room, members, ties })` with `ties: boolean`, inside `Panel.tsx`.

Start from `Tally` and `RoomDots` in `git show c32214b:src/panel/Panel.tsx`.

- [ ] **Step 1: The tally grid and the lone row**

As the try-out's `Tally`: a three-column grid (stage label in `font-strong`, count right-aligned with `tabular-nums`, rooms), each stage a `min-h-8` row on the shared columns. The "No answers yet" line is unchanged. A stage with a student alone keeps the text `<name> is alone` or `<name> joins <room>`, muted and truncating, with two `IconButton`s: `User` labelled `Keep <name> alone` and, when there is a room to join, `Users` labelled `<name> joins <room>`; each is `pressed` when it is the choice and disabled when `locked`.

- [ ] **Step 2: `RoomCluster`**

The try-out's `RoomDots`, renamed, with its geometry (step 13, dot radius 3.2, the 10 px star path, two rows packed like a honeycomb with the top row holding half rounded up, one or two students in one row). Differences:

- It draws `roomPeople(room, members)`, not `room.members` alone.
- `ties` is `!session.mixWorkingGroups`. When false, no line is drawn and students are not ordered by working group.
- No CSS class hooks: a dot is `fill-primary`, a star `fill-star stroke-star`, a tie `stroke-primary` at 60 % opacity, width 1.6, round caps.
- The accessible name, also the `<title>`, is `<room>: <n> students`, and `<room>: 1 student` for one.

Clusters of one stage sit on one line and wrap, `gap-x-4 gap-y-1`.

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm test && npm run build && npm run check:extension && npm run build-storybook`
Expected: all pass. `grep -n "data-part\|DOTS\|roomSize\|rowClass\|className=\"tie\|className=\"bird" src/panel/Panel.tsx` prints nothing.

- [ ] **Step 4: Commit**

```bash
git add src/panel/Panel.tsx
git commit -m "feat: the tally draws each room as a cluster of marks"
```
