// The roster page: students, working groups, the owner's Meet names, backup and CSV.

import { useEffect, useState, type FormEvent } from 'react';
import { createGroup, deleteGroup } from '@/logic/roster.js';
import { timeline, historyToCsv, exportBackup, parseBackup } from '@/logic/history.js';
import { TRACKS, trackLabel } from '@/logic/stages.js';
import { ActiveToggle } from '@/components/ActiveToggle';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

type Student = { name: string; track: string | null; active: boolean; group: string | null };
type Roster = { students: Record<string, Student>; groups: Record<string, { name: string }>; ownerNames: string[] };
type SessionRecord = { startedAt: string; meetingCode: string; students: { key: string; name: string; stage: string | null; source: string | null }[] };
type Data = { roster: Roster; history: SessionRecord[] };
export type RosterStore = {
  load(): Promise<Data>;
  save(changes: { roster?: Roster; history?: SessionRecord[] }): Promise<void>;
  onChange(cb: (changes: { roster?: Roster; history?: SessionRecord[] }) => void): void;
};

type Act = (change: () => void) => Promise<void>;

const REPLACE_QUESTION = 'Replace the roster and history with this file?';

// Radix allows no option with an empty value, so "no choice" is `none` here and `null` in the roster.
const NONE = 'none';

function NullableSelect({ noneText, options, value, label, onChange }: {
  noneText: string;
  options: [string, string][];
  value: string | null;
  label: string;
  onChange: (value: string | null) => void;
}) {
  return (
    <Select value={value ?? NONE} onValueChange={v => onChange(v === NONE ? null : v)}>
      <SelectTrigger size="sm" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{noneText}</SelectItem>
        {options.map(([v, text]) => <SelectItem key={v} value={v}>{text}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

const TRACK_OPTIONS = TRACKS.map((t): [string, string] => [t, trackLabel(t)]);

function StudentRow({ studentKey, student, groupOptions, history, act }: {
  studentKey: string; student: Student; groupOptions: [string, string][]; history: SessionRecord[]; act: Act;
}) {
  const entries = timeline(history, studentKey);
  return (
    <TableRow>
      <TableCell className="whitespace-normal wrap-anywhere">{student.name}</TableCell>
      <TableCell>
        <NullableSelect
          noneText="–"
          options={TRACK_OPTIONS}
          value={student.track}
          label={`Track for ${student.name}`}
          onChange={track => act(() => { student.track = track; })}
        />
      </TableCell>
      <TableCell>
        <ActiveToggle active={student.active} onToggle={() => act(() => { student.active = !student.active; })} label="Active" />
      </TableCell>
      <TableCell>
        <NullableSelect
          noneText="none"
          options={groupOptions}
          value={student.group}
          label={`Working group for ${student.name}`}
          onChange={group => act(() => { student.group = group; })}
        />
      </TableCell>
      <TableCell className="whitespace-normal wrap-anywhere">
        {entries.length === 0 ? (
          <span className="text-muted-foreground">
            <span aria-hidden="true">–</span>
            <span className="sr-only">no sessions yet</span>
          </span>
        ) : entries.map(entry => (
          <span
            key={entry.startedAt}
            title={entry.startedAt.slice(0, 10)}
            className={entry.source === 'guess' ? 'mr-1.5 italic text-muted-foreground' : 'mr-1.5'}
          >
            {entry.stage ?? '–'}
          </span>
        ))}
      </TableCell>
    </TableRow>
  );
}

function StudentsSection({ roster, history, act }: { roster: Roster; history: SessionRecord[]; act: Act }) {
  const students = Object.entries(roster.students).sort(([, a], [, b]) => a.name.localeCompare(b.name));
  const groupOptions = Object.entries(roster.groups).map(([id, g]): [string, string] => [id, g.name]);
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">Students</h2>
      {/* The named region scrolls, not the Table's own container: the minimum width sits between them. */}
      <div
        className="overflow-x-auto rounded-md border scroll-shadow-x"
        role="region"
        aria-label="Students"
        tabIndex={0}
      >
        <div className="min-w-2xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Track</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Working group</TableHead>
                <TableHead>Timeline</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    No students yet. They are added when they answer in a session.
                  </TableCell>
                </TableRow>
              ) : students.map(([key, s]) => (
                <StudentRow key={key} studentKey={key} student={s} groupOptions={groupOptions} history={history} act={act} />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  );
}

function GroupsSection({ roster, act }: { roster: Roster; act: Act }) {
  const groups = Object.entries(roster.groups);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get('name') ?? '').trim();
    if (!name) return;
    form.reset();
    act(() => { createGroup(roster, name); });
  };

  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">Working groups</h2>
      {groups.length === 0 ? (
        <p className="text-muted-foreground">No working groups yet.</p>
      ) : (
        <ul>
          {groups.map(([id, group]) => {
            const members = Object.values(roster.students).filter(s => s.group === id).map(s => s.name);
            return (
              <li key={id} className="flex items-center gap-2 border-b py-1">
                {/* Keyed by the name, so a name saved elsewhere replaces what the field shows. */}
                <Input
                  key={group.name}
                  defaultValue={group.name}
                  aria-label={`Name of working group ${group.name}`}
                  className="w-48 shrink-0"
                  onBlur={e => {
                    const name = e.currentTarget.value;
                    if (name !== group.name) act(() => { group.name = name; });
                  }}
                />
                <span className="min-w-0 flex-1 wrap-break-word text-muted-foreground">{members.join(', ')}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Delete the working group ${group.name}?`)) act(() => deleteGroup(roster, id));
                  }}
                >
                  Delete
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <form className="flex items-center gap-2" onSubmit={onSubmit}>
        <Input name="name" placeholder="Group name" aria-label="Group name" autoComplete="off" className="w-48" />
        <Button type="submit" variant="outline">New group</Button>
      </form>
    </section>
  );
}

function OwnerNamesSection({ roster, act }: { roster: Roster; act: Act }) {
  const text = roster.ownerNames.join('\n');
  return (
    <section className="space-y-2">
      <h2 id="owner-names-heading" className="text-base font-semibold">Your Meet names</h2>
      <p className="text-muted-foreground">One name per line. Messages from these names never count as a student's.</p>
      <Textarea
        key={text}
        defaultValue={text}
        rows={3}
        aria-labelledby="owner-names-heading"
        className="max-w-sm"
        onBlur={e => {
          const value = e.currentTarget.value;
          if (value !== text) {
            act(() => { roster.ownerNames = value.split('\n').map(line => line.trim()).filter(Boolean); });
          }
        }}
      />
    </section>
  );
}

const today = () => new Date().toISOString().slice(0, 10);

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function BackupSection({ data, onImport }: { data: Data; onImport: (data: Data) => Promise<void> }) {
  const [importError, setImportError] = useState<string | null>(null);

  const importBackup = async (file: File) => {
    let parsed: Data;
    try {
      parsed = parseBackup(await file.text());
    } catch (error) {
      setImportError((error as Error).message);
      return;
    }
    setImportError(null);
    if (!confirm(REPLACE_QUESTION)) return;
    await onImport(parsed);
  };

  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">Backup</h2>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          onClick={() => download(`mentoring-backup-${today()}.json`, exportBackup(data, new Date().toISOString()), 'application/json')}
        >
          Export backup
        </Button>
        <Button
          variant="outline"
          onClick={() => download(`mentoring-history-${today()}.csv`, historyToCsv(data.history), 'text/csv')}
        >
          Export CSV
        </Button>
        <Label className="min-w-0">
          Import backup
          <Input
            type="file"
            className="w-auto"
            onChange={e => {
              const file = e.currentTarget.files?.[0];
              e.currentTarget.value = '';
              if (file) importBackup(file);
            }}
          />
        </Label>
      </div>
      {importError && <Alert variant="destructive">{importError}</Alert>}
    </section>
  );
}

export function RosterPage({ store }: { store: RosterStore }) {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    store.load().then(setData);
    store.onChange(changes => {
      if (!changes.roster && !changes.history) return;
      setData(current => current && { roster: changes.roster ?? current.roster, history: changes.history ?? current.history });
    });
  }, [store]);

  if (!data) {
    return (
      <main className="p-4">
        <h1 className="text-lg font-semibold">Roster</h1>
      </main>
    );
  }

  const { roster, history } = data;

  // Runs a change on the roster in place, saves it, then draws again.
  const act: Act = async change => {
    change();
    await store.save({ roster });
    setData({ roster, history });
  };

  const onImport = async (imported: Data) => {
    await store.save(imported);
    setData(imported);
  };

  return (
    <main className="space-y-6 p-4 text-sm">
      <h1 className="text-lg font-semibold">Roster</h1>
      <StudentsSection roster={roster} history={history} act={act} />
      <GroupsSection roster={roster} act={act} />
      <OwnerNamesSection roster={roster} act={act} />
      <BackupSection data={data} onImport={onImport} />
    </main>
  );
}
