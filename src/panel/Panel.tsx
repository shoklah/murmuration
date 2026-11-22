import type { FormEvent, ReactNode } from 'react';
import { Check, Diamond, Eye, EyeOff, Star } from 'lucide-react';
import { stageLabel } from '@/logic/stages.js';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ActiveToggle } from '@/components/ActiveToggle';
import { ClampedText } from '@/components/ClampedText';
import { StageSelect } from '@/components/StageSelect';
import type { Member, PanelActions, PanelView, SessionView } from './controller.js';

export type FakeMeetBox = {
  rooms: { name: string; members: string[] }[];
  say(sender: string, text: string): void;
  join(name: string): void;
  playDemo(): void;
};

type RoomSummary = SessionView['summary']['rooms'][number];

// What every section of a started session draws from.
type Parts = { session: SessionView; actions: PanelActions; members: Map<string, Member>; locked: boolean };

/** The side panel: draws the controller's view and calls its actions. */
export function Panel({ view, actions, rosterHref, onOpenRoster, fake }: {
  view: PanelView;
  actions: PanelActions;
  rosterHref: string;
  onOpenRoster?: () => void;   // when given, the Roster link calls it instead of following its href
  fake?: FakeMeetBox;          // when given, the Fake Meet box is drawn at the bottom
}) {
  const { session } = view;
  const answers = session && (session.summary.answers === 1 ? '1 answer' : `${session.summary.answers} answers`);
  return (
    <main className="flex w-full min-w-0 flex-col gap-4 p-3 text-sm wrap-anywhere">
      <header className="flex items-baseline justify-between gap-2">
        <h1 className="text-xl font-strong tracking-title">Murmuration</h1>
        {answers && <span className="tabular-nums">{answers}</span>}
      </header>
      {!view.loading && (
        <>
          {view.ownerNamesMissing && (
            <Alert>Your own Meet names aren't set, so your messages count as a student's. Set them on the roster page.</Alert>
          )}
          {view.notice !== null && <Alert>{view.notice}</Alert>}
          {view.errors.length > 0 && (
            <Alert variant="destructive">
              <ul className="list-disc pl-4">
                {view.errors.map((text, i) => <li key={i}>{text}</li>)}
              </ul>
            </Alert>
          )}
          {session === null ? (
            <div className="flex flex-col items-start gap-2">
              <p>Start a session to read stage answers from the Meet chat.</p>
              <Button disabled={view.starting} onClick={() => actions.start()}>Start</Button>
            </div>
          ) : (
            <Session
              session={session}
              actions={actions}
              members={new Map(session.members.map(m => [m.key, m]))}
              locked={session.filled || session.filling}
            />
          )}
          <p>
            <a
              href={rosterHref}
              target="_blank"
              onClick={onOpenRoster && (event => { event.preventDefault(); onOpenRoster(); })}
            >
              Roster
            </a>
          </p>
          {fake && <FakeMeet fake={fake} />}
        </>
      )}
    </main>
  );
}

function Session(parts: Parts) {
  const { session, actions, locked } = parts;
  return (
    <div className="flex flex-col gap-5">
      <Tally {...parts} />
      <SplitGroups session={session} />
      {session.hasPlan && <Rooms {...parts} />}
      <NotInRoom {...parts} />
      <Flags {...parts} />
      <Unclear {...parts} />
      <NoAnswer {...parts} />
      <Ignored {...parts} />
      <div className="flex items-center gap-2">
        <Checkbox
          id="mix"
          checked={session.mixWorkingGroups}
          disabled={locked}
          onCheckedChange={checked => actions.setMix(checked === true)}
        />
        <Label htmlFor="mix">Mix working groups this time</Label>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {!session.hasPlan && <Button onClick={() => actions.split()}>Split</Button>}
        <Button variant="outline" disabled={session.filling} onClick={() => actions.end()}>
          {session.endArmed ? 'Press again to end' : 'End'}
        </Button>
      </div>
    </div>
  );
}

// A section with a heading, drawn only when it has rows.
function Section({ title, children }: { title: string; children: ReactNode[] }) {
  if (children.length === 0) return null;
  return (
    <section className="flex flex-col gap-1">
      <h2 className="font-strong">{title}</h2>
      <ul>{children}</ul>
    </section>
  );
}

const rowClass = 'flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 border-b py-1';
const muted = 'text-muted-foreground';

// Every list row: one line high, its name cell first, its controls in fixed columns at the trailing edge.
const row = '-mx-1.5 grid min-h-8 items-center gap-x-1 rounded-md px-1.5 hover:bg-primary/7';
const ICON = '1.75rem';
const PICK = '7rem';
const cols = (...trailing: string[]) => ({ gridTemplateColumns: ['minmax(0, 1fr)', ...trailing].join(' ') });

const Name = ({ children }: { children: string }) => <span className="min-w-0 truncate font-medium" title={children}>{children}</span>;
const NewBadge = ({ isNew }: { isNew: boolean }) => (isNew ? <Badge variant="secondary">new</Badge> : null);

// An action shown as its icon; the label is its tooltip and accessible name.
function IconButton({ label, pressed, disabled, onClick, children }: {
  label: string; pressed?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode;
}) {
  return (
    <Button
      variant={pressed ? 'secondary' : 'ghost'}
      size="icon-sm"
      className={pressed ? 'size-7' : 'size-7 text-muted-foreground hover:text-foreground'}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

// A room's people: its members, then the students placed in it after Fill.
const roomPeople = (room: RoomSummary, members: Map<string, Member>) => [...room.members, ...room.placed].map(key => members.get(key)!);

// A room's size, with a star per active student and, when `ties`, a diamond per working group with two or more of them.
function RoomSize({ room, members, ties }: { room: RoomSummary; members: Map<string, Member>; ties: boolean }) {
  const people = roomPeople(room, members);
  const active = people.filter(m => m.active).length;
  const groups = people.map(m => m.group).filter((g, i, all): g is string => g !== null && all.indexOf(g) === i);
  const units = ties ? groups.filter(g => people.filter(m => m.group === g).length > 1).length : 0;
  return (
    <Badge className="font-bold tabular-nums">
      {people.length}
      {Array.from({ length: active }, (_, i) => <Star key={`a${i}`} className="fill-current" />)}
      {Array.from({ length: units }, (_, i) => <Diamond key={`g${i}`} className="fill-current" />)}
    </Badge>
  );
}

// A room's size with ★ per active student and ◆ per working group in it.
function roomSize(room: RoomSummary) {
  const marks = '★'.repeat(room.active) + '◆'.repeat(room.units);
  return marks ? `${room.members.length} ${marks}` : String(room.members.length);
}

function Tally({ session, actions, locked }: Parts) {
  const { summary } = session;
  if (summary.answers === 0) {
    return <p className={muted}>No answers yet. Students write their stage in the Meet chat.</p>;
  }
  return (
    <ul>
      {summary.stages.map(line => {
        const lone = summary.lone.find(l => l.stage === line.stage);
        let rest: ReactNode;
        if (!lone) {
          const sizes = line.rooms.map(roomSize).join(', ');
          rest = <span className={muted}>{line.rooms.length === 1 ? `→ 1 room (${sizes})` : `→ ${line.rooms.length} rooms (${sizes})`}</span>;
        } else {
          const joining = lone.choice === 'join' && lone.joinRoom;
          rest = (
            <>
              <span className={muted}>{joining ? `→ ${lone.name} joins ${lone.joinRoom}` : `→ ${lone.name} is alone`}</span>
              <Button
                size="sm"
                variant={lone.choice === 'alone' ? 'secondary' : 'outline'}
                aria-pressed={lone.choice === 'alone'}
                disabled={locked}
                onClick={() => actions.setLone(lone.key, 'alone')}
              >
                Keep alone
              </Button>
              {lone.joinRoom && (
                <Button
                  size="sm"
                  variant={lone.choice === 'join' ? 'secondary' : 'outline'}
                  aria-pressed={lone.choice === 'join'}
                  disabled={locked}
                  onClick={() => actions.setLone(lone.key, 'join')}
                >
                  {`Join ${lone.joinRoom}`}
                </Button>
              )}
            </>
          );
        }
        return (
          <li key={line.stage} className={rowClass}>
            <Name>{line.label}</Name>
            <span className="tabular-nums">{line.count}</span>
            {rest}
          </li>
        );
      })}
    </ul>
  );
}

function SplitGroups({ session }: { session: SessionView }) {
  const groups = session.summary.splitGroups;
  if (groups.length === 0) return null;
  return (
    <section className="flex flex-col gap-1">
      <h2 className="font-strong">Working groups split by stage</h2>
      <ul className="flex flex-col gap-1">
        {groups.map((g, i) => (
          <li key={i}>
            <span className={`flex min-w-0 items-center gap-1.5 ${muted}`}>
              <Diamond className="size-2.5 shrink-0 fill-current" />
              <span className="min-w-0 truncate" title={g.group ?? 'Working group'}>{g.group ?? 'Working group'}</span>
            </span>
            <ul>
              {g.members.map(m => (
                <li key={m.name} className={row} style={cols('auto')}>
                  <span className="min-w-0 truncate" title={m.name}>{m.name}</span>
                  <span className={muted}>{stageLabel(m.stage)}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

// A room member in the preview: the name and its marks, then the star and, before Fill, change stage and ignore.
function MemberRow({ member, roomStage, actions, locked }: { member: Member; roomStage: string; actions: PanelActions; locked: boolean }) {
  return (
    <li className={row} style={locked ? cols(ICON) : cols(ICON, ICON, ICON)}>
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="min-w-0 truncate" title={member.message ? `${member.name}: ${member.message}` : member.name}>{member.name}</span>
        {member.onRoster && member.group && (
          <span className={`flex min-w-0 items-center gap-1 ${muted}`}>
            <Diamond className="size-2.5 shrink-0 fill-current" />
            <span className="min-w-0 truncate" title={member.group}>{member.group}</span>
          </span>
        )}
        <NewBadge isNew={member.isNew} />
        {member.guessed && <Badge variant="secondary" title="Guessed stage">?</Badge>}
        {member.stage !== null && member.stage !== roomStage && <Badge variant="outline">{stageLabel(member.stage)}</Badge>}
      </span>
      {member.onRoster
        ? <ActiveToggle active={member.active} onToggle={() => actions.toggleActive(member.key)} label="Active student" />
        : <span />}
      {!locked && (
        <>
          <StageSelect
            compact
            value={member.stage}
            onChange={code => actions.setStage(member.key, code)}
            label={`Change stage for ${member.name}`}
          />
          <IconButton label={`Ignore ${member.name}`} onClick={() => actions.setIgnored(member.key, true)}>
            <EyeOff />
          </IconButton>
        </>
      )}
    </li>
  );
}

function Rooms({ session, actions, members, locked }: Parts) {
  const { fillResult } = session;
  const fillText = session.filling ? 'Filling rooms…' : session.ownerCreatesRooms ? 'Fill names' : 'Fill breakout rooms';
  return (
    <section className="flex flex-col gap-1">
      <h2 className="font-strong">Rooms</h2>
      {session.outdated && !session.filled && <Alert>Changed since Split. Press Re-split before Fill.</Alert>}
      <ul className="flex flex-col gap-3">
        {session.summary.rooms.map(room => (
          <li key={room.name} className="sheen rounded-lg border border-line bg-card px-2.5 pt-2 pb-1">
            <div className="flex items-center justify-between gap-2 border-b border-line pb-1">
              <span className="min-w-0 truncate font-strong" title={room.name}>{room.name}</span>
              <RoomSize room={room} members={members} ties={!session.mixWorkingGroups} />
            </div>
            <ul>
              {roomPeople(room, members).map(member => (
                <MemberRow key={member.key} member={member} roomStage={room.stage} actions={actions} locked={locked} />
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {fillResult && (
        <Alert variant={fillResult.ok ? 'default' : 'destructive'}>
          {fillResult.lines.map((text, i) => <p key={i}>{text}</p>)}
          {fillResult.items.length > 0 && (
            <ul className="list-disc pl-4">
              {fillResult.items.map((text, i) => <li key={i}>{text}</li>)}
            </ul>
          )}
        </Alert>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {session.filled && <span className={muted}>Change rooms in Meet directly.</span>}
        <Button variant="outline" disabled={locked} onClick={() => actions.split()}>Re-split</Button>
        {!session.filled && (
          <Button disabled={session.outdated || session.filling} onClick={() => actions.fill()}>{fillText}</Button>
        )}
      </div>
    </section>
  );
}

function NotInRoom({ session, actions, members }: Parts) {
  return (
    <Section title="Not in a room yet">
      {session.summary.notInRoom.map(n => {
        const hint = n.suggested
          ? `Suggested: ${n.suggested}`
          : (n.stage ? `No room fits ${stageLabel(n.stage)}` : 'No stage yet');
        return (
          <li key={n.key} className={row} style={cols(PICK, ICON)}>
            <span className="flex min-w-0 items-center gap-1.5">
              <Name>{n.name}</Name>
              {n.guess && n.stage && <span className={`truncate ${muted}`}>{`last: ${stageLabel(n.stage)}`}</span>}
            </span>
            <StageSelect value={members.get(n.key)!.stage} onChange={code => actions.setStage(n.key, code)} label={`Stage for ${n.name}`} />
            <IconButton
              label={n.suggested ? `${n.name} is placed in ${n.suggested}` : `No room to place ${n.name} in`}
              disabled={n.suggested === null}
              onClick={() => actions.markPlaced(n.key, n.suggested!)}
            >
              <Check />
            </IconButton>
            <span className={`col-span-3 truncate pb-1 ${muted}`}>{hint}</span>
          </li>
        );
      })}
    </Section>
  );
}

function Flags({ session, actions }: Parts) {
  return (
    <Section title="Flags">
      {session.summary.flags.map(f => (
        <li key={f.key} className={row} style={cols(PICK)}>
          <span>{`${f.name} wrote ${f.text} after Fill. Move them in Meet if needed.`}</span>
          <StageSelect value={null} onChange={code => actions.setStage(f.key, code)} label={`Stage for ${f.name}`} />
        </li>
      ))}
    </Section>
  );
}

function Unclear({ session, actions, locked }: Parts) {
  return (
    <Section title="Unclear">
      {session.summary.unclear.map(u => (
        <li key={u.key} className={row} style={cols(PICK, ICON)}>
          <span className="flex min-w-0 items-center gap-1.5">
            <Name>{u.name}</Name>
            <NewBadge isNew={u.isNew} />
          </span>
          <StageSelect value={u.stage} onChange={code => actions.setStage(u.key, code)} label={`Stage for ${u.name}`} disabled={session.filling} />
          <IconButton label={`Ignore ${u.name}`} disabled={locked} onClick={() => actions.setIgnored(u.key, true)}>
            <EyeOff />
          </IconButton>
          <ClampedText text={u.text} className={`col-span-3 pb-1 ${muted}`} />
        </li>
      ))}
    </Section>
  );
}

function NoAnswer({ session, actions }: Parts) {
  const { noAnswer } = session.summary;
  return (
    <Section title={`No answer (${noAnswer.length})`}>
      {noAnswer.map(n => (
        <li key={n.key} className={row} style={cols(PICK, ICON)}>
          <span className="flex min-w-0 items-center gap-1.5">
            <Name>{n.name}</Name>
            <NewBadge isNew={n.isNew} />
            {n.lastStage && <span className={`truncate ${muted}`}>{`last: ${stageLabel(n.lastStage)}`}</span>}
          </span>
          <StageSelect value={null} onChange={code => actions.setStage(n.key, code)} label={`Stage for ${n.name}`} disabled={session.filling} />
          <IconButton label={`Ignore ${n.name}`} disabled={session.filling} onClick={() => actions.setIgnored(n.key, true)}>
            <EyeOff />
          </IconButton>
        </li>
      ))}
    </Section>
  );
}

function Ignored({ session, actions }: Parts) {
  return (
    <Section title="Ignored">
      {session.summary.ignored.map(i => (
        <li key={i.key} className={row} style={cols(ICON)}>
          <Name>{i.name}</Name>
          <IconButton label={`Restore ${i.name}`} onClick={() => actions.setIgnored(i.key, false)}>
            <Eye />
          </IconButton>
        </li>
      ))}
    </Section>
  );
}

function FakeMeet({ fake }: { fake: FakeMeetBox }) {
  // Splits "Name: message" at the first colon; a line with no colon does nothing.
  function say(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const line = String(new FormData(form).get('line'));
    const colon = line.indexOf(':');
    if (colon === -1) return;
    fake.say(line.slice(0, colon).trim(), line.slice(colon + 1).trim());
    form.reset();
  }
  function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get('name')).trim();
    if (name) fake.join(name);
    form.reset();
  }
  return (
    <section className="flex flex-col gap-2 rounded-md border border-dashed p-2">
      <h2 className="font-strong">Fake Meet</h2>
      <form className="flex gap-2" onSubmit={say}>
        <Input name="line" placeholder="Name: message" aria-label="Name: message" autoComplete="off" />
        <Button type="submit" variant="outline">Send</Button>
      </form>
      <p>
        <Button variant="outline" onClick={() => fake.playDemo()}>Play demo answers</Button>
      </p>
      <form className="flex gap-2" onSubmit={join}>
        <Input name="name" placeholder="Name" aria-label="Name" autoComplete="off" />
        <Button type="submit" variant="outline">Join</Button>
      </form>
      {fake.rooms.length > 0 && (
        <pre className="font-sans whitespace-pre-wrap">{fake.rooms.map(r => `${r.name}: ${r.members.join(', ')}`).join('\n')}</pre>
      )}
    </section>
  );
}
