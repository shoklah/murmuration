// Turns a chat message into a stage, by the spec's answer-reading rules.

import { STAGES, PATHS, stage, tracksOf } from './stages.js';

const FILLERS = ['i', 'im', 'am', 'in', 'on', 'at', 'now'];
const OTHER_WORDS = ['season', 'arc', 'web', 'data', ...FILLERS];
const TRACK_WORDS = { se: 'SE', ds: 'DS', ml: 'ML', ai: 'ML' };
const SEASON_RE = /^s0?([1-3])(?:a(?:rc)?0?([12]))?(se|ds|ml|ai)?$/;
const ARC_RE = /^a(?:rc)?0?([12])$/;
const NUMBER_RE = /^0?([1-3])$/;

export function parseAnswer(text) {
  const words = text.toLowerCase().replace(/['’]/g, '').match(/[\p{L}\p{N}]+/gu) ?? [];
  const parsed = { preseason: null, season: null, arc: null, track: null, stageOnly: true };
  const set = (field, value) => { parsed[field] ??= value; };
  const preseason = words.includes('web') ? 'web' : words.includes('data') ? 'data' : 'any';
  let bare = null;
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const next = words[i + 1] ?? '';
    let m;
    if (word === 'pw') set('preseason', 'web');
    else if (word === 'pd') set('preseason', 'data');
    else if (word === 'preseason') set('preseason', preseason);
    else if (word === 'pre') {
      set('preseason', preseason);
      if (next === 'season') i++;
    } else if ((m = SEASON_RE.exec(word))) {
      set('season', Number(m[1]));
      if (m[2]) set('arc', Number(m[2]));
      if (m[3]) set('track', TRACK_WORDS[m[3]]);
    } else if (word === 'season' && (m = NUMBER_RE.exec(next))) {
      set('season', Number(m[1]));
      i++;
    } else if (word === 'arc' && (m = /^0?([12])$/.exec(next))) {
      set('arc', Number(m[1]));
      i++;
    } else if ((m = ARC_RE.exec(word))) set('arc', Number(m[1]));
    else if (Object.hasOwn(TRACK_WORDS, word)) set('track', TRACK_WORDS[word]);
    else if ((m = NUMBER_RE.exec(word))) bare ??= Number(m[1]);
    else if (!OTHER_WORDS.includes(word)) parsed.stageOnly = false;
  }
  if (parsed.stageOnly && bare !== null) set('season', bare);
  if (parsed.preseason === null && parsed.season === null) return null;
  return parsed;
}

// The stages with this season on the track's path, in path order.
function onPath(track, season) {
  return PATHS[track].filter(code => stage(code).season === season);
}

export function resolveStage(parsed, { track, lastStage }) {
  const T = parsed.track ?? track;
  let code;
  let guess = false;
  if (parsed.season === null) {
    const pathTrack = { web: 'SE', data: 'DS', any: T }[parsed.preseason];
    if (!pathTrack) return null;
    code = onPath(pathTrack, 0)[0];
  } else if (parsed.season === 1 && parsed.arc !== null) {
    code = STAGES.filter(s => s.season === 1)[parsed.arc - 1].code;
  } else {
    if (!T) return null;
    const candidates = onPath(T, parsed.season);
    guess = candidates.length > 1;
    code = candidates.includes(lastStage) ? lastStage : candidates[0];
  }
  if (T && !PATHS[T].includes(code)) return null;
  const tracks = tracksOf(code);
  return { stage: code, guess, track: tracks.length === 1 ? tracks[0] : null };
}
