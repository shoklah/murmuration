# UI backlog fixes: design

Fixes items 1 to 9 of `docs/ui-backlog.md` (the `ui` kit's adoption audit) before any other UI work, so
the screens match `DESIGN.md` going into the first real mentoring session.

## Intent

The owner said "Let's fix the issues first". Success: each item's evidence is gone on the five fake
screens, the kit's checks pass, and the backlog marks every item fixed or ruled. Non-goals: anything not
in the backlog, and changes to how the screens work (those come from real use). Anti-goal: a fix that
breaks the one-row grid, the dark-only tokens or the conventions in `CLAUDE.md`.

## Approaches

Each item has one sensible fix inside the existing components; the alternatives considered were:

- **Item 2 (sessions in the Timeline):** an outline pill per session (chosen: it is `DESIGN.md`'s stage
  tag, already used in room rows), a `·` separator (still reads as one run of text), or a date per entry
  (too wide for the column).
- **Item 4 (file input):** an outline button that opens a hidden file input (chosen: matches the two
  export buttons beside it and removes the two-line label of item 10), or styling the native
  `::file-selector-button` (still shows "No file chosen").
- **Item 5 (clamped message):** a trailing chevron (owner's pick), `More`/`Less` text, or a dotted
  underline.
- **Item 7 (lowercase strings):** sentence case (owner's pick) or an exception noted in `DESIGN.md`.
- **Item 8 (Mix checkbox):** drawn just above the button whose result it changes (chosen), or a tooltip
  on Re-split (does not move the control into view).

## The changes

| # | Screen | Change |
|---|---|---|
| 1 | roster | The Timeline shows `stageLabel(entry.stage)`, imported from `src/logic/stages.js`. |
| 2 | roster | Each session in the Timeline is an outline `Badge` in a wrapping flex row with a 4 px gap; the date stays as its tooltip; a guessed stage keeps italic muted text; a session with no stage shows `–`. The empty Timeline keeps its muted dash with the `no sessions yet` label. |
| 3 | roster | The Working group select's "no value" option reads `–`, as Track's does. |
| 4 | roster | Backup: an outline button `Import backup` opens a hidden `<input type="file">`; the `Label` wrapper goes. Same import behaviour and error alert. |
| 5 | all panel states with a long Unclear message | `ClampedText`, when it overflows, draws a muted `ChevronDown` (14 px) at the end of the last line, `ChevronUp` when open. The whole button still toggles; the text keeps its two-line clamp. |
| 6 | collecting, split | `Name` in `Panel.tsx` drops `font-medium`, so names are 400 like room rows. |
| 7 | collecting, split, filled | `StageSelect`'s placeholder reads `Stage…`; the `last: <stage>` prefix in Not in a room yet and No answer reads `Last: <stage>`. |
| 8 | collecting, split | The Mix checkbox is drawn just above the button it changes: above Split while there is no plan (as now), inside Rooms just above Re-split once there is one. Its disabled rule (`locked`) is unchanged. |
| 9 | every screen with an `Input` | `ui/input.tsx` uses `text-sm` at every width (drop `text-base` and `md:text-sm`), as a hand edit. |

The rendered mockups (collecting, split, filled and roster at 375 and 1440 px) are in
`~/.claude/workflow-archive/2026-11-22-claude-ui-backlog-fixes-88fad3-kit/approved/`, with the throwaway
diff that produced them (`mockup.diff`).

## Kit points

- **Question each screen answers:** unchanged (panel: who goes in which room; roster: who is who and
  where they have been).
- **Empty, loading, error:** unchanged; item 2 keeps the empty Timeline's dash, item 4 keeps the import
  error alert.
- **Widths:** 375, 768, 1440: Timeline pills wrap inside the cell; at 375 the Backup row's three buttons
  sit on one line.
- **Screens:** `/src/panel/panel.html?fake&at=collecting`, `…&at=split`, `…&at=filled`,
  `/src/roster-page/roster-page.html?fake`; item 9 also touches `/src/panel/panel.html?fake`.
- **Components:** all existing (`Badge` outline, `Button` outline, `ClampedText`, `StageSelect`,
  `Checkbox`, `Input`); `ClampedText` and `ui/input.tsx` are adapted. Their stories stay valid.

## Rulings on the rest of the backlog

- 10: fixed by item 4. 11 and 12: left until real use shows a need. 13: dropped, overtaken by
  `DESIGN.md`.
- The six "Follows the project" items: kept as designed.

## Left to the builder

Where the Mix checkbox's component lives in `Panel.tsx` (a small function used in two places is fine);
the specs' strings in item 7 change only in code, and the older specs are not edited.
