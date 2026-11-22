---
version: alpha
name: Murmuration
description: >
  Starling plumage. A near-black page, a green and violet sheen on the rooms, speckle cream for
  counts and the one main action, bill yellow for the active star. Dark only.
colors:
  primary: "#f4ecd6"
  primary-foreground: "#14161a"
  background: "#0d0f12"
  foreground: "#f1ead8"
  card: "#15181d"
  card-foreground: "#f1ead8"
  popover: "#181b21"
  popover-foreground: "#f1ead8"
  secondary: "#2a2740"
  secondary-foreground: "#e6dcff"
  muted: "#1a1d23"
  muted-foreground: "#aaa694"
  accent: "#1c2a29"
  accent-foreground: "#f1ead8"
  destructive: "#ff9580"
  border: "#2a2d33"
  input: "#4c4f55"
  ring: "#58cfae"
  star: "#f6c544"
  sheen-green: "#40be9c"
  sheen-violet: "#8468ff"
  line: "#f4ecd6"
typography:
  body:
    fontFamily: Source Sans 3 Variable
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.45
  title:
    fontFamily: Source Sans 3 Variable
    fontSize: 20px
    fontWeight: 650
    letterSpacing: 0.005em
  heading:
    fontFamily: Source Sans 3 Variable
    fontSize: 14px
    fontWeight: 650
  label:
    fontFamily: Source Sans 3 Variable
    fontSize: 14px
    fontWeight: 600
rounded:
  sm: 4px
  md: 8px
  lg: 10px
  full: 999px
spacing:
  row: 32px
  inside-group: 4px
  between-groups: 20px
  page: 12px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
  button-outline:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
  room:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
  room-count:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.full}"
  badge:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.full}"
---

# Murmuration

## Overview

A murmuration is a flock of starlings. The look is one starling up close: glossy near-black
feathers that turn green or violet with the light, pale speckles, a yellow bill.

- The page is the feather: near-black and quiet.
- Each room is a patch of plumage: a dark panel with a faint green and violet sheen.
- Students are the speckles: in the tally a room is a small cluster, one cream mark per student.
- The bill is the one warm colour, kept for the active star.

It is used in a 360 px side panel beside Meet's dark window, during a live call. Reading speed
comes first: rows on one grid, one line each, actions as icons at the trailing edge.

## Colors

| Role | Value | Used for |
|---|---|---|
| background | `#0d0f12` | the page |
| foreground | `#f1ead8` | text |
| card | `#15181d` | rooms, alerts |
| popover | `#181b21` | open dropdowns |
| primary | `#f4ecd6` | the one main action per state (Start, Split, Fill), room counts, checked boxes |
| primary-foreground | `#14161a` | text on primary |
| secondary | `#2a2740` | pressed icon buttons, `new` and `?` badges |
| secondary-foreground | `#e6dcff` | text on secondary |
| muted | `#1a1d23` | quiet fills |
| muted-foreground | `#aaa694` | metadata, hints, unlit icons |
| accent | `#1c2a29` | the highlighted item in a dropdown |
| destructive | `#ff9580` | error text and the error box's border |
| border | `#2a2d33` | table and box lines |
| input | `#4c4f55` | field and outline-button borders |
| ring | `#58cfae` | keyboard focus |
| star | `#f6c544` | a lit active star, in rows and in the tally |
| sheen-green, sheen-violet | `#40be9c`, `#8468ff` | the sheen only, at 20 to 30 % opacity |
| line | `#f4ecd6` at 14 % | room outlines and the rule under a room's name |

Cream is never used for an error, and red is never used for an action.

## Typography

One family: **Source Sans 3 Variable** (SIL Open Font License 1.1), bundled in the extension as a
`woff2` file. No font is loaded from the network.

| Level | Size | Weight | Used for |
|---|---|---|---|
| title | 20 px | 650 | the page name |
| heading | 14 px | 650 | section headings, stage and room names |
| body | 14 px | 400 | everything else; controls at 600 |

Three levels, carried by size and weight. Figures are tabular wherever they line up in a column.
Sentence case everywhere; no all-caps labels.

## Layout

- One column that fills the width it is given; 12 px page padding.
- Every list row is one line, 32 px high, on one grid: the name first and flexible, then fixed
  columns at the trailing edge (28 px per icon, 112 px for a stage dropdown).
- Groups are separated by space first: 20 px between sections, 4 px inside one.
- The tally is a three-column grid: stage, count (right-aligned), rooms.

## Elevation & Depth

Flat. No shadows. Depth comes from the room panels sitting one step lighter than the page, with
their sheen and a hairline outline. Open dropdowns sit on `popover` with a hairline.

## Shapes

- 8 px on controls, 10 px on room panels, full pills for counts and badges.
- In the tally, a student is a 6.4 px dot, an active student a 10 px star, and a working group a
  line tying its students.

## Components

- **Button, primary:** cream fill, ink text, weight 700. One per state.
- **Button, outline:** transparent, a cream hairline at 30 %; hover adds cream at 9 %.
- **Icon button:** 28 px, muted until hovered or pressed; its label is its tooltip and its
  accessible name.
- **Room panel:** `card` under a diagonal sheen, hairline outline, 10 px corners. The sheen's
  direction alternates over three rooms, so a list of rooms shifts like plumage.
- **Room count:** a cream pill with the size, a star per active student and a diamond per working
  group.
- **Room cluster (tally):** one mark per student in two packed rows.
- **Badge:** violet tint pill for `new` and `?`; outline pill for a stage tag.
- **Field and dropdown:** `#101216` fill, cream hairline at 22 %, no shadow.
- **Alert:** `card` with a hairline; an error uses `destructive` for its text and border.
- **Link:** cream text, green underline.

## Do's and Don'ts

Do:

- Use a gradient as decoration in exactly two places: the sheen on a room panel and the glow at
  the top of the page. *(The kit's checklist lists decorative gradients as a machine-made tell;
  here it is chosen: it is the plumage.)*
- Put each room in its own panel. A panel never sits inside another panel.
- Keep the star yellow and nothing else yellow.
- Keep cream for the one main action and for counts.
- Keep text flat: one colour per level, no gradient text, no glow on text.

Don't:

- Don't add a second accent colour. Green and violet exist only in the sheen, the focus ring and
  the link underline.
- Don't put a sheen on a row, a button, a field or a table.
- Don't use a shadow or a glow for depth.
- Don't use monospace type.
- Don't decorate the page with birds, feathers or speckle textures. The students are the speckles.

## Data display

- One value per cell. A room's make-up is a cluster or a count pill, never a sentence.
- Counts are right-aligned with tabular figures.
- Stages are shown by their label (`S02 DS`), never their code (`S02DS`).
- Zero is shown, muted. Unknown is a muted dash with an accessible label, never `0` or blank.
- A long name truncates with its full text as the tooltip; a long chat message is clamped to two
  lines and expands on click.
- A table that scrolls sideways sits in its own named, focusable region with a visible border.

## States

- **Empty:** one muted line that says what the area is and how it fills. A section with nothing
  in it is not drawn, unless the design gives it an empty line.
- **Loading:** storage is local and immediate, so no spinner. A running action disables its button
  and renames it (`Filling rooms…`).
- **Error:** an alert in `destructive` that says what failed and what to do next.

## Motion

- None for decoration. The sheen does not move.
- Hover and press change colour only, in under 150 ms.
- A dropdown opens with the stack's default fade, under 200 ms; nothing shifts the layout.
- With `prefers-reduced-motion`, transitions are removed.

## Dark mode

The extension is dark only: nothing switches a light theme on. Each role still has a light value,
so one can be added later without redesigning.

| Role | Dark (in use) | Light (recorded, not in use) |
|---|---|---|
| background | `#0d0f12` | `#f7f2e4` |
| foreground | `#f1ead8` | `#14161a` |
| card | `#15181d` | `#fffdf6` |
| popover | `#181b21` | `#fffdf6` |
| primary | `#f4ecd6` | `#14161a` |
| primary-foreground | `#14161a` | `#f4ecd6` |
| secondary | `#2a2740` | `#e6defc` |
| secondary-foreground | `#e6dcff` | `#3a2a7a` |
| muted | `#1a1d23` | `#efe9d8` |
| muted-foreground | `#aaa694` | `#5f5b4e` |
| accent | `#1c2a29` | `#dff1ea` |
| destructive | `#ff9580` | `#b3321c` |
| border | `#2a2d33` | `#ddd6c2` |
| input | `#4c4f55` | `#a8a290` |
| ring | `#58cfae` | `#1f8f74` |
| star | `#f6c544` | `#a96f00` |
| sheen-green | `#40be9c` | `#40be9c` |
| sheen-violet | `#8468ff` | `#8468ff` |
| line | `#f4ecd6` at 14 % | `#14161a` at 14 % |

## Chart colours

The extension has no chart. If one is added, its series take, in order: `#58cfae`, `#b6a1ff`,
`#f6c544`, `#ff9580`, `#aaa694`, read from tokens at run time.

---

References: the look is this project's own, drawn from its name (a starling's plumage); it follows
no kit genre and no library reference. Looks tried and dropped on the way: Amsterdam Tech's palette
as read from amsterdam.tech on 2026-11-22, the kit's genres Synthwave and Glassmorphism, and others
of the sessions' own.
