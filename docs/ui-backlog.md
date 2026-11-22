# UI backlog: the kit's audit

The `ui` kit's adoption audit (kit 0.2.0, react-tailwind-shadcn), run on 2026-11-22 against `origin/main` at `7e737da`. It covers five screens at 375, 768 and 1440 px. This is a list to pick from, not a commitment: changes to how the screens work are expected to come from real use.

- **Screens check:** passed. No sideways scroll, main-width or accessibility failures on any screen at any width. It ran without `--dark`, because the extension is dark only and has no `dark:` line.
- **Shared layout defect:** none. Nothing has to be fixed before later kit tasks.
- **Readers:** two `kit-reviewer` audits. Reader A covered the panel at rest, `collecting` and `split`. Reader B covered `filled` and the roster page.
- **Carried over:** items from the look-and-rows spec's non-goals and from the two earlier runs' ledgers (the React port run and the look run). Each was checked on `origin/main` and kept only if still true.

Screens below are short names: *rest* `/src/panel/panel.html?fake`, *collecting* `…&at=collecting`, *split* `…&at=split`, *filled* `…&at=filled`, *roster* `/src/roster-page/roster-page.html?fake`.

## Backlog

| # | Screen | Width | Where | Checklist line | Severity | What | Source |
|---|---|---|---|---|---|---|---|
| 1 | roster | all; at 375 it is in the part of the table scrolled off to the right | Timeline column, every row | the reader's words; matches the design | Important | It shows raw stage codes (`S01A2`, `S02DS`, `PW`) where the panel shows labels (`S01 Arc02`, `Preseason Web`). `DESIGN.md` says to use labels, never codes. `RosterPage.tsx:95` renders `entry.stage`, and `stageLabel` is not imported there. | Reader B; carried over (look-and-rows non-goal; look ledger L28) |
| 2 | roster | 768, 1440 | Timeline column | one value per cell | Minor | Several sessions' stages are joined only by spaces (`PW  S01A1`, `PW  PW`). Nothing visible marks where one session ends; the date is only in a tooltip. | Reader B |
| 3 | roster | all | Working group column | zero, empty and unknown | Minor | "No group" shows as lowercase `none` at full text colour, as loud as a real value. The Track column shows its empty value as a dash, so one table marks "no value" two ways. Comes from `noneText="none"` at `RosterPage.tsx:76`. | Reader B; carried over (look ledger L44) |
| 4 | roster | all; at 375 beside a two-line "Import backup" | Backup section | controls look like controls | Minor | The native file input (`Choose File  No file chosen`) looks like a filled-in text field. The outline buttons beside it look like buttons. | Reader B; carried over (look-and-rows non-goal; React port ledger K7) |
| 5 | filled (and any state with a long Unclear message) | all | Unclear section, a clamped message | controls look like controls | Minor | A two-line clamp ends in `…` with nothing at rest showing that it expands on click; there is only a hover fill (`ClampedText.tsx:33`). | Reader B; carried over (look-and-rows non-goal; React port ledger K2) |
| 6 | collecting, split | all | student names in Unclear and No answer rows | matches the design | Minor | Names are at weight 500 (`Name`, `Panel.tsx:137`), which is not one of `DESIGN.md`'s levels. Room rows draw names at 400, so one screen has two name weights, and 500 sits close to the 650 headings. | Reader A |
| 7 | collecting, split (also filled) | all | the `stage…` placeholder and the `last: <stage>` prefix | matches the design (sentence case) | Minor | Both are lowercase, against "Sentence case everywhere". The specs give these exact strings, so you choose: change the strings or note the exception in `DESIGN.md`. Reader B filed this under Follows the project. | Readers A and B |
| 8 | split | all | the `Mix working groups this time` checkbox | reading order | Minor | It changes what Re-split does but sits about 300 px below that button, below Unclear and No answer and out of the first view. In `collecting` it sits just above Split. | Reader A |
| 9 | every screen with an `Input` (Fake Meet box; roster fields) | 375 | text fields | matches the design | Minor | `ui/input.tsx:10` keeps shadcn's `text-base md:text-sm`. Below 768 px fields are 16 px, not the 14 px body, and the real side panel (~360 px) is always below 768. It shows on every screen but is not a layout defect. | Reader A; carried over (look ledger L44) |

### Carried over, not confirmed by the readers

| # | Screen | Where | What | Status on `origin/main` |
|---|---|---|---|---|
| 10 | roster, 375 | the "Import backup" label | It wraps to two lines (look ledger L44). | Reader B saw it wrap in the 375 capture but did not file it. It is a flex-wrap row (`RosterPage.tsx:256-272`). |
| 11 | filled | the Re-split button | The disabled Re-split looks close to the outline buttons (look ledger L70). | Only the code was checked (`Panel.tsx:366`). Reader B counts Re-split being disabled after Fill as per spec, not a finding. |
| 12 | collecting, split | Not in a room yet rows | "No stage yet" rows offer no suggestion (React port ledger K4). | Partly still true. `Panel.tsx:380` still shows `Suggested: X`, the "No room to place" label is still there, and your earlier list item F31 was left open. |
| 13 | all | overall | Stock shadcn look (React port ledger K8). | Not verified; a judgement call. It is mostly overtaken by the look (`DESIGN.md`). |

Fixed since the earlier ledgers, so dropped: React port K1 and K5 (the active star is now filled, `ActiveToggle.tsx:15`), K6 (the Students table has `scroll-shadow-x`), and K3 (the tally is now clusters).

## Follows the project: for your ruling

In each of these, a screen follows `DESIGN.md` or an approved spec while a checklist line disagrees. Keep each, or change the screen.

- **machine-made tells (decorative gradient, glow on near-black):** the room sheen and the glow at the top of the page, on every screen. `DESIGN.md` chooses both on purpose. (Readers A and B)
- **one value per cell / controls look like controls:** room count pills combine the size with ★ and ◆, in the cream used for the main action. `DESIGN.md` specifies "a cream pill with the size, a star per active student and a diamond per working group". (Readers A and B)
- **every width:** at 1440 (and 768) rows and rooms stretch the full width, so the trailing icons end up ~1,300 px from the name. This follows "One column that fills the width it is given"; the panel is built for 360 px. (Readers A and B)
- **one value per cell:** the tally's `Leo is alone` sentence in place of a cluster (*filled*). The look-and-rows spec asks for it, against `DESIGN.md`'s "never a sentence". (Reader B)
- **controls look like controls:** muted, unlabelled icon buttons (keep alone, join, star). This follows `DESIGN.md`'s icon button, whose label is its tooltip. (Reader B)
- **matches the design (one-line rows):** "Not in a room yet" rows take two lines, with the suggestion underneath. The approved look-and-rows spec asks for "one muted line under the row", against `DESIGN.md`'s one-line rule. (Reader B)

## Not judged

The dashed "Fake Meet" box exists only with `?fake` and is not part of the extension. It was not judged, except for the field size in item 9.
