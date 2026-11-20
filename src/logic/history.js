// Session history: past stages, CSV export and the JSON backup.
import { stage } from './stages.js';

const BACKUP_APP = 'meet-mentoring-groups';
const BACKUP_VERSION = 1;
const NOT_A_BACKUP = 'This file is not a mentoring-groups backup.';

export function lastKnownStages(history) {
  const stages = {};
  for (const record of history) {
    for (const s of record.students) {
      if (s.stage && (s.source === 'answer' || s.source === 'owner')) {
        Object.defineProperty(stages, s.key, { value: s.stage, enumerable: true, writable: true, configurable: true });
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

function csvField(value) {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const yesNo = flag => (flag ? 'yes' : 'no');

export function historyToCsv(history) {
  const lines = [CSV_HEADER];
  for (const record of history) {
    for (const s of record.students) {
      lines.push([
        record.startedAt, record.meetingCode, s.name, s.stage && stage(s.stage)?.label,
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
