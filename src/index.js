#!/usr/bin/env node
/**
 * Fjord Focus Coach v2.0 — Focus timer with live Norwegian fjord weather and daylight data.
 *
 * Data Sources:
 *   MET Norway Locationforecast 2.0 — real-time weather
 *   MET Norway Sunrise 3.0 — sunrise, sunset, daylight hours
 *
 * Commands: timer, status, history, locations, breathing, report
 */

import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';

// ── Constants ───────────────────────────────────────────────────────────────

const VERSION = '2.0.0';
const USER_AGENT = `FjordFocusCoach/${VERSION} github.com/egkristi/fjord-focus-coach`;
const DATA_DIR = join(homedir(), '.fjord-focus');
const SESSIONS_FILE = join(DATA_DIR, 'sessions.json');

const LOCATIONS = [
  { id: 'geirangerfjorden', name: 'Geirangerfjorden', lat: 62.10, lon: 7.09, shorelineKm: 260, depthM: 233, cue: 'UNESCO waters reflect patience — let each breath mirror the stillness.' },
  { id: 'sognefjorden', name: 'Sognefjorden', lat: 61.20, lon: 6.60, shorelineKm: 205, depthM: 1308, cue: "Norway's deepest fjord rewards the deepest breaths." },
  { id: 'hardangerfjorden', name: 'Hardangerfjorden', lat: 60.09, lon: 6.50, shorelineKm: 750, depthM: 891, cue: 'Orchard blossoms over deep water — breathe in the contrast.' },
  { id: 'naeroyfjorden', name: 'Nærøyfjorden', lat: 60.85, lon: 6.87, shorelineKm: 17, depthM: 12, cue: 'Narrow walls amplify every sound — focus your hearing inward.' },
  { id: 'lysefjorden', name: 'Lysefjorden', lat: 58.98, lon: 6.14, shorelineKm: 42, depthM: 497, cue: 'Preikestolen stands above — find your own steady platform.' },
  { id: 'trollfjorden', name: 'Trollfjorden', lat: 68.50, lon: 15.22, shorelineKm: 3, depthM: 64, cue: 'Tight and dramatic — channel intensity into each exhale.' },
  { id: 'lofoten', name: 'Lofoten (Svolvær)', lat: 68.23, lon: 14.57, shorelineKm: 2130, depthM: null, cue: 'Crags funnel wind — match the gust with a slow inhale.' },
  { id: 'nordfjord', name: 'Nordfjord', lat: 61.90, lon: 6.12, shorelineKm: 110, depthM: 565, cue: 'Glacier-fed calm — let cool clarity flow through you.' },
  { id: 'romsdalsfjorden', name: 'Romsdalsfjorden', lat: 62.56, lon: 7.10, shorelineKm: 85, depthM: 550, cue: 'Trollstigen above, deep water below — find balance in between.' },
  { id: 'trondheimsfjorden', name: 'Trondheimsfjorden', lat: 63.45, lon: 10.40, shorelineKm: 660, depthM: 617, cue: 'The fjord of kings — breathe with purpose and presence.' },
  { id: 'altafjorden', name: 'Altafjorden', lat: 69.97, lon: 23.27, shorelineKm: 38, depthM: 425, cue: 'Northern Lights above this fjord — let wonder soften your jaw.' },
  { id: 'tromso', name: 'Tromsø', lat: 69.65, lon: 18.96, shorelineKm: null, depthM: null, cue: 'Gateway to the Arctic — steady breathing through cold clarity.' },
  { id: 'nordkapp', name: 'Nordkapp', lat: 71.17, lon: 25.78, shorelineKm: null, depthM: null, cue: "Europe's edge — here the breath meets the open sea." },
  { id: 'reine', name: 'Reine (Lofoten)', lat: 67.93, lon: 13.09, shorelineKm: null, depthM: null, cue: 'Red cabins, turquoise water — simplicity sharpens focus.' },
  { id: 'alesund', name: 'Ålesund', lat: 62.47, lon: 6.15, shorelineKm: null, depthM: null, cue: 'Art Nouveau on ocean — beauty built on resilience.' },
  { id: 'bergen', name: 'Bergen', lat: 60.39, lon: 5.32, shorelineKm: null, depthM: null, cue: 'Rain-washed Bryggen — persistence in every drop.' },
  { id: 'stavanger', name: 'Stavanger', lat: 58.97, lon: 5.73, shorelineKm: null, depthM: null, cue: 'Energy city — fuel your focus from ancient stone.' },
  { id: 'flam', name: 'Flåm', lat: 60.86, lon: 7.11, shorelineKm: null, depthM: null, cue: 'Valley meets fjord — where momentum narrows to a point.' },
  { id: 'helgeland', name: 'Helgelandskysten', lat: 65.85, lon: 13.16, shorelineKm: 11000, depthM: null, cue: 'Thousand islands, thousand breaths — each one counts.' },
  { id: 'vesteralen', name: 'Vesterålen', lat: 68.80, lon: 15.40, shorelineKm: null, depthM: null, cue: 'Whale waters — breathe deep and slow like the ocean giants.' },
];

const BREATHING_PATTERNS = {
  box:      { name: 'Box Breathing',  description: 'Equal-phase military standard for calm focus',          steps: [['Inhale', 4], ['Hold', 4], ['Exhale', 4], ['Hold empty', 4]] },
  relax:    { name: '4-7-8 Relaxing', description: "Dr. Weil's natural tranquilizer for deep calm",         steps: [['Inhale', 4], ['Hold', 7], ['Exhale', 8]] },
  deep:     { name: 'Deep Fjord',     description: 'Extended exhale for sustained concentration',            steps: [['Inhale', 4], ['Hold', 2], ['Exhale', 6], ['Hold empty', 2]] },
  tactical: { name: 'Tactical',       description: 'First-responder pattern for alertness under pressure',   steps: [['Inhale', 4], ['Hold', 4], ['Exhale', 6]] },
  energy:   { name: 'Energizing',     description: 'Quick-tempo breath for a mid-session boost',             steps: [['Inhale', 6], ['Exhale', 2]] },
};

const BREAK_PROMPTS = [
  'Stand and roll your shoulders',
  'Sip water — hydrate the fjord within',
  'Shake out your wrists',
  'Close your eyes and listen',
  'Stretch your neck side to side',
  'Look at something far away for 20 seconds',
  'Take three deep belly breaths',
  'Wiggle your toes and ground your feet',
];

const WEATHER_SYMBOLS = {
  clearsky: 'Clear sky', fair: 'Fair', partlycloudy: 'Partly cloudy', cloudy: 'Cloudy',
  lightrainshowers: 'Light rain showers', rainshowers: 'Rain showers', heavyrainshowers: 'Heavy rain showers',
  lightsleetshowers: 'Light sleet showers', sleetshowers: 'Sleet showers', lightsnowshowers: 'Light snow showers',
  snowshowers: 'Snow showers', heavysnowshowers: 'Heavy snow showers',
  lightrain: 'Light rain', rain: 'Rain', heavyrain: 'Heavy rain',
  lightsleet: 'Light sleet', sleet: 'Sleet', lightsnow: 'Light snow', snow: 'Snow', heavysnow: 'Heavy snow',
  fog: 'Fog', lightrainandthunder: 'Rain and thunder', rainandthunder: 'Rain and thunder',
  heavyrainandthunder: 'Heavy rain and thunder',
};

// ── API Fetching ────────────────────────────────────────────────────────────

async function fetchJson(url) {
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch { return null; }
}

async function fetchWeather(lat, lon) {
  const data = await fetchJson(
    `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`
  );
  if (!data) return null;
  try {
    const ts = data.properties.timeseries[0];
    const d = ts.data.instant.details;
    const nextData = ts.data.next_1_hours ?? ts.data.next_6_hours ?? {};
    const symbolRaw = nextData?.summary?.symbol_code ?? 'unknown';
    const symbolBase = symbolRaw.includes('_') ? symbolRaw.split('_').slice(0, -1).join('_') : symbolRaw;
    const description = WEATHER_SYMBOLS[symbolBase] ?? symbolRaw.replace(/_/g, ' ');
    return {
      tempC: d.air_temperature, windSpeed: d.wind_speed, windDir: d.wind_from_direction,
      humidity: d.relative_humidity, pressure: d.air_pressure_at_sea_level,
      clouds: d.cloud_area_fraction, symbol: symbolRaw, description,
    };
  } catch { return null; }
}

async function fetchDaylight(lat, lon) {
  const today = new Date().toISOString().slice(0, 10);
  const data = await fetchJson(
    `https://api.met.no/weatherapi/sunrise/3.0/sun?lat=${lat}&lon=${lon}&date=${today}&offset=%2B02:00`
  );
  if (!data) return null;
  try {
    const p = data.properties;
    const sunrise = p.sunrise?.time ?? null;
    const sunset = p.sunset?.time ?? null;
    const noonElev = p.solarnoon?.disc_centre_elevation ?? null;
    const midnightVisible = p.solarmidnight?.visible ?? false;
    let daylightHours = null;
    if (sunrise && sunset) {
      const sr = new Date(sunrise);
      const ss = new Date(sunset);
      daylightHours = (ss - sr) / 3_600_000;
    } else if (midnightVisible) {
      daylightHours = 24;
    } else {
      daylightHours = 0;
    }
    return { sunrise, sunset, noonElev, midnightVisible, daylightHours };
  } catch { return null; }
}

function windDirection(deg) {
  if (deg == null) return '';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

// ── Session Persistence ─────────────────────────────────────────────────────

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function loadSessions() {
  try {
    const raw = await readFile(SESSIONS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch { return []; }
}

async function saveSession(session) {
  await ensureDataDir();
  const sessions = await loadSessions();
  sessions.push(session);
  await writeFile(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

// ── Display Helpers ─────────────────────────────────────────────────────────

function headline(text) {
  const bar = '='.repeat(Math.max(text.length, 30));
  console.log(`\n${bar}\n${text}\n${bar}\n`);
}

function fmtDaylight(hours) {
  if (hours == null) return 'unknown';
  if (hours >= 24) return '24h (midnight sun!)';
  if (hours <= 0) return '0h (polar night)';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function fmtTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch { return iso; }
}

function fmtWeatherLine(w) {
  if (!w) return 'Weather: unavailable (offline)';
  let wind = w.windSpeed != null ? `, wind ${w.windSpeed} m/s` : '';
  const wd = windDirection(w.windDir);
  if (wd) wind += ` from ${wd}`;
  return `Weather: ${w.tempC}°C, ${w.description}${wind}`;
}

function fmtDaylightLine(d) {
  if (!d) return '';
  const sr = fmtTime(d.sunrise);
  const ss = fmtTime(d.sunset);
  const dl = fmtDaylight(d.daylightHours);
  let line = `Daylight: ${dl} (sunrise ${sr}, sunset ${ss})`;
  if (d.midnightVisible) line += '  ☀ Midnight sun!';
  return line;
}

function printLocationHeader(loc) {
  const parts = [];
  if (loc.depthM) parts.push(`${loc.depthM.toLocaleString()}m deep`);
  if (loc.shorelineKm) parts.push(`${loc.shorelineKm.toLocaleString()} km shoreline`);
  const extra = parts.length ? `  (${parts.join(' | ')})` : '';
  console.log(`${loc.name} (${loc.lat.toFixed(2)}°N, ${loc.lon.toFixed(2)}°E)${extra}`);
}

// ── Timer Engine ────────────────────────────────────────────────────────────

async function runTimer(label, minutes, pace, cues) {
  const total = Math.max(1, Math.round(minutes));
  const stepMs = ((minutes * pace) / total) * 1000;
  const prefix = label === 'Focus' ? '[*]' : '[~]';

  for (let i = 0; i < total; i += 1) {
    const cue = cues[i % cues.length];
    const left = total - i - 1;
    console.log(`  ${prefix} ${label} minute ${i + 1}/${total} — ${cue} (${left} min left)`);
    await sleep(stepMs);
  }
}

// ── Arg Parsing ─────────────────────────────────────────────────────────────

function lookupArg(argv, name) {
  const prefix = `--${name}`;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === prefix) return argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : undefined;
    if (argv[i].startsWith(`${prefix}=`)) return argv[i].split('=')[1];
    if (argv[i] === `-${name[0]}`) return argv[i + 1] && !argv[i + 1].startsWith('-') ? argv[i + 1] : undefined;
  }
  return undefined;
}

function hasFlag(argv, name) {
  return argv.includes(`--${name}`);
}

function parseArgs(argv) {
  const command = argv[0] && !argv[0].startsWith('-') ? argv[0] : 'timer';
  const rest = command === argv[0] ? argv.slice(1) : argv;
  return {
    command,
    focusMinutes: Math.max(1, parseInt(lookupArg(rest, 'focus') ?? '25', 10) || 25),
    breakMinutes: Math.max(1, parseInt(lookupArg(rest, 'break') ?? '5', 10) || 5),
    cycles: Math.max(1, parseInt(lookupArg(rest, 'cycles') ?? '2', 10) || 2),
    paceSeconds: Math.max(0.1, parseFloat(lookupArg(rest, 'pace') ?? '5') || 5),
    location: lookupArg(rest, 'location') ?? lookupArg(rest, 'l') ?? null,
    pattern: lookupArg(rest, 'pattern') ?? lookupArg(rest, 'p') ?? 'box',
    json: hasFlag(rest, 'json'),
  };
}

// ── Location Lookup ─────────────────────────────────────────────────────────

function normalize(s) {
  return s.toLowerCase().replace(/\s/g, '').replace(/ø/g, 'o').replace(/å/g, 'a').replace(/æ/g, 'ae');
}

function findLocation(name) {
  if (!name) {
    const idx = Math.floor(Date.now() / 3_600_000) % LOCATIONS.length;
    return LOCATIONS[idx];
  }
  const key = normalize(name);
  let found = LOCATIONS.find(l => l.id === key || normalize(l.name) === key);
  if (!found) found = LOCATIONS.find(l => l.id.includes(key) || normalize(l.name).includes(key));
  if (!found) {
    console.error(`Unknown location: ${name}. Use 'locations' to see options.`);
    process.exit(1);
  }
  return found;
}

// ── Commands ────────────────────────────────────────────────────────────────

async function cmdTimer(opts) {
  const loc = findLocation(opts.location);
  const pat = BREATHING_PATTERNS[opts.pattern] ?? BREATHING_PATTERNS.box;
  const breathCues = pat.steps.map(([n, c]) => `${n} ${c}`);

  headline('Fjord Focus Coach');
  console.log(`Fetching conditions at ${loc.name}...\n`);

  const [weather, daylight] = await Promise.all([
    fetchWeather(loc.lat, loc.lon),
    fetchDaylight(loc.lat, loc.lon),
  ]);

  printLocationHeader(loc);
  console.log(`  ${fmtWeatherLine(weather)}`);
  const dlLine = fmtDaylightLine(daylight);
  if (dlLine) console.log(`  ${dlLine}`);
  console.log(`  "${loc.cue}"`);
  console.log();

  const stepsStr = pat.steps.map(([n, c]) => `${n} ${c}`).join(' → ');
  console.log(`Pattern: ${pat.name} (${stepsStr})`);
  console.log(
    `Session: ${opts.cycles} cycle(s) × ${opts.focusMinutes} min focus + ${opts.breakMinutes} min break (pace: ${opts.paceSeconds}s/min)`
  );

  const sessionStart = new Date().toISOString();
  let cyclesDone = 0;
  let totalFocus = 0;

  for (let cycle = 1; cycle <= opts.cycles; cycle += 1) {
    console.log(`\n── Cycle ${cycle}/${opts.cycles} — Focus ${opts.focusMinutes} min ──`);
    await runTimer('Focus', opts.focusMinutes, opts.paceSeconds, breathCues);
    totalFocus += opts.focusMinutes;
    cyclesDone = cycle;
    console.log('  Focus block complete. Coastline visualized, lungs rinsed.');

    if (cycle !== opts.cycles) {
      console.log(`\n── Break ${opts.breakMinutes} min ──`);
      await runTimer('Break', opts.breakMinutes, opts.paceSeconds, BREAK_PROMPTS);
      console.log('  Break complete. Glide back in.');
    }
  }

  const session = {
    id: randomUUID(),
    started: sessionStart,
    ended: new Date().toISOString(),
    location: loc.id,
    location_name: loc.name,
    cycles_target: opts.cycles,
    cycles_completed: cyclesDone,
    focus_minutes: opts.focusMinutes,
    break_minutes: opts.breakMinutes,
    pattern: opts.pattern,
    total_focus_minutes: totalFocus,
    weather,
    daylight_hours: daylight?.daylightHours ?? null,
  };
  await saveSession(session);

  console.log(`\n${cyclesDone} cycle(s) complete. ${totalFocus} minutes focused.`);
  console.log(`Session saved to ${SESSIONS_FILE}`);
  if (opts.json) console.log(JSON.stringify(session, null, 2));
}

async function cmdStatus(opts) {
  const loc = findLocation(opts.location);
  console.log();
  printLocationHeader(loc);

  const [weather, daylight] = await Promise.all([
    fetchWeather(loc.lat, loc.lon),
    fetchDaylight(loc.lat, loc.lon),
  ]);

  console.log(`  ${fmtWeatherLine(weather)}`);
  if (weather) {
    console.log(`  Humidity: ${weather.humidity}% | Pressure: ${weather.pressure} hPa | Clouds: ${weather.clouds}%`);
  }
  const dlLine = fmtDaylightLine(daylight);
  if (dlLine) console.log(`  ${dlLine}`);
  if (daylight?.noonElev != null) console.log(`  Solar noon elevation: ${daylight.noonElev.toFixed(1)}°`);
  console.log(`  "${loc.cue}"`);
  if (opts.json) console.log(JSON.stringify({ location: loc, weather, daylight }, null, 2));
}

async function cmdHistory(opts) {
  const sessions = await loadSessions();
  if (!sessions.length) {
    console.log('\nNo sessions recorded yet. Start one with: node src/index.js timer');
    return;
  }

  headline('Focus History');
  const recent = sessions.slice(-10).reverse();
  for (const s of recent) {
    const date = s.started.slice(0, 10);
    const locName = (s.location_name ?? s.location ?? '?').padEnd(22);
    const cycles = `${s.cycles_completed ?? '?'}/${s.cycles_target ?? '?'}`;
    const mins = String(s.total_focus_minutes ?? 0).padStart(4);
    const patName = (BREATHING_PATTERNS[s.pattern]?.name ?? s.pattern ?? '?');
    console.log(`  ${date}  ${locName}  ${cycles} cycles  ${mins} min  ${patName}`);
  }

  const total = sessions.length;
  const totalMins = sessions.reduce((s, x) => s + (x.total_focus_minutes ?? 0), 0);

  const dates = [...new Set(sessions.map(s => s.started.slice(0, 10)))].sort();
  const today = new Date().toISOString().slice(0, 10);
  let currentStreak = 0;
  let check = today;
  for (let i = 0; i <= dates.length; i += 1) {
    if (dates.includes(check)) {
      currentStreak += 1;
      const d = new Date(check);
      d.setDate(d.getDate() - 1);
      check = d.toISOString().slice(0, 10);
    } else break;
  }

  let bestStreak = 0;
  let streak = 0;
  for (let i = 0; i < dates.length; i += 1) {
    if (i === 0) { streak = 1; }
    else {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      streak = (curr - prev) === 86_400_000 ? streak + 1 : 1;
    }
    bestStreak = Math.max(bestStreak, streak);
  }

  const locCounts = {};
  for (const s of sessions) {
    const k = s.location_name ?? s.location ?? 'unknown';
    locCounts[k] = (locCounts[k] ?? 0) + 1;
  }
  const fav = Object.entries(locCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  console.log(`\n  Total: ${total} sessions, ${(totalMins / 60).toFixed(1)} hours focused`);
  console.log(`  Current streak: ${currentStreak} day(s)`);
  console.log(`  Best streak: ${bestStreak} day(s)`);
  console.log(`  Favorite location: ${fav} (${locCounts[fav] ?? 0} sessions)`);

  if (opts.json) console.log(JSON.stringify({ sessions, stats: { total, totalMins, currentStreak, bestStreak, fav } }, null, 2));
}

function cmdLocations(opts) {
  headline('Fjord Locations');
  for (const loc of LOCATIONS) {
    const depth = loc.depthM ? `${String(loc.depthM).padStart(5)}m` : '      ';
    const shore = loc.shorelineKm ? `${String(loc.shorelineKm).padStart(5)} km` : '        ';
    console.log(
      `  ${loc.id.padEnd(22)} ${loc.name.padEnd(22)} ${loc.lat.toFixed(2).padStart(6)}°N ${loc.lon.toFixed(2).padStart(6)}°E  ${depth}  ${shore}`
    );
  }
  if (opts.json) console.log(JSON.stringify(LOCATIONS, null, 2));
}

function cmdBreathing(opts) {
  headline('Breathing Patterns');
  for (const [key, pat] of Object.entries(BREATHING_PATTERNS)) {
    const stepsStr = pat.steps.map(([n, c]) => `${n} ${c}`).join(' → ');
    console.log(`  ${key.padEnd(10)} ${pat.name.padEnd(18)} ${stepsStr}`);
    console.log(`  ${''.padEnd(10)} ${pat.description}`);
    console.log();
  }
  if (opts.json) {
    const out = {};
    for (const [k, v] of Object.entries(BREATHING_PATTERNS)) {
      out[k] = { name: v.name, description: v.description, steps: v.steps.map(([n, c]) => `${n} ${c}`) };
    }
    console.log(JSON.stringify(out, null, 2));
  }
}

async function cmdReport(opts) {
  const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  headline(`Fjord Focus Report — ${todayStr}`);

  const sampleIds = ['geirangerfjorden', 'sognefjorden', 'lofoten', 'nordkapp', 'tromso'];
  const sampleLocs = LOCATIONS.filter(l => sampleIds.includes(l.id));

  const conditions = [];
  console.log('Current Conditions');
  console.log('─'.repeat(65));
  for (const loc of sampleLocs) {
    const [w, d] = await Promise.all([fetchWeather(loc.lat, loc.lon), fetchDaylight(loc.lat, loc.lon)]);
    conditions.push({ location: loc, weather: w, daylight: d });
    const temp = w ? `${w.tempC.toFixed(1).padStart(5)}°C` : '     —';
    const desc = (w?.description ?? 'unavailable').slice(0, 18).padEnd(20);
    const dl = d ? fmtDaylight(d.daylightHours) : '—';
    console.log(`  ${loc.name.padEnd(22)} ${temp}  ${desc} ${dl}`);
  }

  console.log('\nFocus Recommendation');
  console.log('─'.repeat(40));
  let best = null;
  let bestScore = -999;
  for (const c of conditions) {
    if (c.weather) {
      const score = (c.weather.tempC ?? 0) - (c.weather.clouds ?? 100) / 10 - (c.weather.windSpeed ?? 10);
      if (score > bestScore) { bestScore = score; best = c; }
    }
  }
  if (best?.weather) console.log(`  Best conditions: ${best.location.name} — ${best.weather.description}, ${best.weather.tempC}°C`);

  const longest = conditions.reduce((a, b) => ((b.daylight?.daylightHours ?? 0) > (a.daylight?.daylightHours ?? 0) ? b : a));
  if (longest.daylight?.daylightHours > 0) {
    console.log(`  Most daylight: ${longest.location.name} — ${fmtDaylight(longest.daylight.daylightHours)}`);
  }

  const sessions = await loadSessions();
  console.log('\nYour Stats');
  console.log('─'.repeat(30));
  if (sessions.length) {
    const now = new Date();
    const weekAgo = new Date(now - 7 * 86_400_000).toISOString();
    const monthAgo = new Date(now - 30 * 86_400_000).toISOString();
    const ws = sessions.filter(s => s.started >= weekAgo);
    const ms = sessions.filter(s => s.started >= monthAgo);
    const wMins = ws.reduce((s, x) => s + (x.total_focus_minutes ?? 0), 0);
    const mMins = ms.reduce((s, x) => s + (x.total_focus_minutes ?? 0), 0);
    console.log(`  This week: ${ws.length} sessions, ${(wMins / 60).toFixed(1)} hours`);
    console.log(`  This month: ${ms.length} sessions, ${(mMins / 60).toFixed(1)} hours`);
  } else {
    console.log('  No sessions logged yet. Start one with: node src/index.js timer');
  }

  if (opts.json) {
    console.log(JSON.stringify({
      date: todayStr,
      conditions: conditions.map(c => ({
        location: c.location.name, weather: c.weather, daylightHours: c.daylight?.daylightHours ?? null,
      })),
    }, null, 2));
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const argv = process.argv.slice(2);

  if (argv.includes('--version') || argv.includes('-v')) {
    console.log(`fjord-focus-coach ${VERSION}`);
    return;
  }
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`Fjord Focus Coach ${VERSION} — Focus timer with live Norwegian fjord data

Usage: node src/index.js [command] [options]

Commands:
  timer       Start a focus session (default)
  status      Show conditions at a fjord location
  history     Show session history and statistics
  locations   List all fjord locations
  breathing   List available breathing patterns
  report      Full focus and conditions report

Timer options:
  --focus N    Minutes per focus block (default: 25)
  --break N    Minutes per break (default: 5)
  --cycles N   Focus/break cycles (default: 2)
  --pace N     Real seconds per minute (default: 5, use 60 for realtime)
  --location   Fjord location ID or name
  --pattern    Breathing pattern: box, relax, deep, tactical, energy
  --json       Output session data as JSON`);
    return;
  }

  const opts = parseArgs(argv);
  const commands = { timer: cmdTimer, status: cmdStatus, history: cmdHistory, locations: cmdLocations, breathing: cmdBreathing, report: cmdReport };
  const cmd = commands[opts.command];
  if (!cmd) {
    console.error(`Unknown command: ${opts.command}. Use --help for usage.`);
    process.exitCode = 1;
    return;
  }
  await cmd(opts);
}

main().catch((error) => {
  console.error('Fjord Focus Coach failed:', error);
  process.exitCode = 1;
});
