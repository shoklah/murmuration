# Meet checks

Date: 2026-11-20, Google Meet in Chrome (English UI), host account plus a
second account in the call, breakout rooms turned on.

**Tier: 1** — all four checks pass; the extension creates and names the rooms
and types the names. The owner presses Open rooms.

| Check | Result |
|---|---|
| 1. Read chat | Pass, with the chat panel open and closed. The second account's messages come back in order, each once, with the same ids on every read. The host's own messages are left out. `hello <b>x</b>` comes back as text. |
| 2. Read participants | Pass. Display names as others see them, no "(You)". The list stays current with the People panel closed (a leave and a rejoin both showed). |
| 3. Create and rename rooms | Pass. The editor ends with exactly the given rooms, in order; rooms are not opened. |
| 4. Type a name into a room | Pass. Also moves a person from another room. |

## How `src/meet/meet.js` finds things

Meet's class names are generated and change; the code relies on `data-*`
attributes, `jsname` attributes, ARIA roles and English ARIA labels instead.
If Meet's language is not English, the label-based lookups fail and each op
returns a Failure.

- **Chat.** Every message element has `data-message-id` (Meet's own id, used
  as the message id, so ids are stable and independent of list position). The
  text is in `[jsname="dTKtvb"]`. Messages from one person sit under a header
  holding the time, `[jsname="biJjHb"]`, and the sender's name next to it; the
  signed-in account's header has only the time, which is how its messages are
  left out. Meet renders some messages twice (a pinned copy) under the same id,
  so ids are deduplicated. The messages stay in the page with the chat panel
  closed.
- **Participants.** `[role="list"][aria-label="Participants"]`, one
  `[role="listitem"]` per person, its `aria-label` the display name. The list
  exists once the People panel has been opened; `readParticipants` opens and
  closes the panel itself the first time (the People button is labelled by an
  element reading "People"). Not checked: whether Meet virtualises this list
  in a call of about 40.
- **Breakout editor.** Opened with "Set up breakout rooms" or "Edit rooms" in
  the breakout panel, or through the "Breakout rooms Break into smaller
  groups" meeting tool. It has `input[aria-label="Room count"]`, one
  `input[aria-label^="Room name"]` per room, and "Open rooms", which the
  extension never presses. Values are set with the native value setter plus
  `input` and `change` events, which Meet's model takes (its `aria-label`
  updates to the new name).
- **Rooms and members.** Each room is `[jsname="lhPi8b"]` with
  `data-display-name` = room name (the main call has none); each member is a
  chip `[jsname="XPtOyb"][data-display-name=<person>]` inside it. Typing into
  the room's `input[aria-label="Participants"]` lists matches in
  `[role="listbox"][aria-label="Participants"] [role="option"]`; clicking the
  option whose text equals the name moves that person. Meet's search matches
  the name as typed, so the exact display name must be given.
- The room edits stay pending in the editor until Open rooms; "Cancel changes"
  or closing the breakout panel may drop them, so the owner opens the rooms
  from the editor the extension filled.
