// The stage list and track paths, from the spec's Stages section.
// Change them here if the curriculum changes.

export const TRACKS = ['SE', 'DS', 'ML'];

const TRACK_LABELS = { SE: 'SE', DS: 'DS', ML: 'AI/ML' };

export const STAGES = [
  { code: 'PW', label: 'Preseason Web', season: 0 },
  { code: 'PD', label: 'Preseason Data', season: 0 },
  { code: 'S01A1', label: 'S01 Arc01', season: 1 },
  { code: 'S01A2', label: 'S01 Arc02', season: 1 },
  { code: 'S02SE', label: 'S02 SE', season: 2 },
  { code: 'S02DS', label: 'S02 DS', season: 2 },
  { code: 'S03SE', label: 'S03 SE', season: 3 },
  { code: 'S03DS', label: 'S03 DS', season: 3 },
  { code: 'S03ML', label: 'S03 ML', season: 3 },
];

export const PATHS = {
  SE: ['PW', 'S01A1', 'S01A2', 'S02SE', 'S03SE'],
  DS: ['PD', 'S01A1', 'S02DS', 'S03DS'],
  ML: ['PD', 'S01A1', 'S02DS', 'S03ML'],
};

export function stage(code) {
  return STAGES.find(s => s.code === code);
}

export const stageLabel = code => stage(code)?.label ?? code;

export function tracksOf(code) {
  return TRACKS.filter(track => PATHS[track].includes(code));
}

export function trackLabel(track) {
  return TRACK_LABELS[track];
}
