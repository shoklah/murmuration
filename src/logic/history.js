// Session history: past stages, CSV export and the JSON backup.
import { stageLabel } from './stages.js';
import { setOwn } from './roster.js';

const BACKUP_APP = 'meet-mentoring-groups';   // the format id; kept so older backups still import
const BACKUP_VERSION = 1;
const NOT_A_BACKUP = 'This file is not a Murmuration backup.';

export function lastKnownStages(history) {
  const stages = {};
  for (const record of history) {
    for (const s of record.students) {
      if (s.stage && (s.source === 'answer' || s.source === 'owner')) {
        setOwn(stages, s.key, s.stage);
      }
    }
  }
  return stages;
}

export function timeline(history, key) {
  const entries = [];
  for (const record of history) {
    const s = record.students.find(student => student.key === key);
    if (s) entries.push({ startedAt: record.startedAt, stage: s.stage, source: s.source });
  }
  return entries;
}

const CSV_HEADER = 'date,meeting,name,stage,source,room,active,working group,alone,after fill';

// A leading ' keeps a spreadsheet from reading an untrusted name as a formula.
function csvField(value) {
  const raw = value == null ? '' : String(value);
  const text = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const yesNo = flag => (flag ? 'yes' : 'no');

export function historyToCsv(history) {
  const lines = [CSV_HEADER];
  for (const record of history) {
    for (const s of record.students) {
      lines.push([
        record.startedAt, record.meetingCode, s.name, s.stage && stageLabel(s.stage),
        s.source, s.room, yesNo(s.active), s.group, s.alone, yesNo(s.afterFill),
      ].map(csvField).join(','));
    }
  }
  return lines.map(line => line + '\n').join('');
}

export function exportBackup({ roster, history }, exportedAt) {
  return JSON.stringify({ app: BACKUP_APP, version: BACKUP_VERSION, exportedAt, roster, history }, null, 2);
}

const isObject = value => typeof value === 'object' && value !== null && !Array.isArray(value);

export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(NOT_A_BACKUP);
  }
  if (!isObject(data) || data.app !== BACKUP_APP || data.version !== BACKUP_VERSION) throw new Error(NOT_A_BACKUP);
  const { roster, history } = data;
  if (!isObject(roster) || !isObject(roster.students) || !isObject(roster.groups)
    || !Array.isArray(roster.ownerNames) || !Array.isArray(history)) throw new Error(NOT_A_BACKUP);
  return { roster, history };
}
