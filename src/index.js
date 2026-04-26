#!/usr/bin/env node
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';

const coastlineFacts = [
  {
    region: 'Lofoten Wall',
    shorelineKm: 2130,
    breathCue: 'Crags funnel wind; match the gust with a slow inhale.'
  },
  {
    region: 'Nordland Fractals',
    shorelineKm: 13300,
    breathCue: 'Rugged coastline means patient out-breaths.'
  },
  {
    region: 'Finnmark Plateau',
    shorelineKm: 6820,
    breathCue: 'Arctic shelves reward steady tempo and soft shoulders.'
  },
  {
    region: 'Hardangerfjord',
    shorelineKm: 1790,
    breathCue: 'Deep fjords = deep diaphragmatic breaths.'
  }
];

const defaultOptions = {
  focusMinutes: 25,
  breakMinutes: 5,
  cycles: 2,
  paceSeconds: 5 // each "focus minute" lasts 5 real seconds by default; set to 60 for realtime
};

const breathScript = [
  'Inhale 4',
  'Hold 2',
  'Exhale 4',
  'Hold empty 2'
];

const breakScript = [
  'Stand + roll shoulders',
  'Sip water',
  'Shake wrists'
];

function parseArgs(argv) {
  return {
    focusMinutes: numberFromArgs(argv, 'focus', defaultOptions.focusMinutes),
    breakMinutes: numberFromArgs(argv, 'break', defaultOptions.breakMinutes),
    cycles: integerFromArgs(argv, 'cycles', defaultOptions.cycles),
    paceSeconds: numberFromArgs(argv, 'pace', defaultOptions.paceSeconds)
  };
}

function numberFromArgs(argv, name, fallback) {
  const value = lookupArg(argv, name);
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function integerFromArgs(argv, name, fallback) {
  const value = lookupArg(argv, name);
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function lookupArg(argv, name) {
  const prefix = `--${name}`;
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === prefix) {
      const next = argv[i + 1];
      return next && !next.startsWith('--') ? next : undefined;
    }
    if (token.startsWith(`${prefix}=`)) {
      return token.split('=')[1];
    }
  }
  return undefined;
}

function selectFact(index) {
  return coastlineFacts[index % coastlineFacts.length];
}

function headline(text) {
  console.log(`\n${'='.repeat(text.length)}`);
  console.log(text);
  console.log(`${'='.repeat(text.length)}\n`);
}

function logBlockHeader(cycle, total, fact, options) {
  console.log(
    `Cycle ${cycle}/${total} — Focus ${options.focusMinutes} min, Break ${options.breakMinutes} min`
  );
  console.log(
    `Focus anchor: ${fact.region} (${fact.shorelineKm.toLocaleString()} km shoreline) — ${fact.breathCue}`
  );
}

function logBreakHeader(options) {
  console.log(`Break ${options.breakMinutes} min — keep it active, keep it light.`);
}

async function runFocusBlock(options, fact) {
  await runScriptedTimer('Focus', options.focusMinutes, options.paceSeconds, breathScript);
  console.log('Focus block complete. Coastline visualized, lungs rinsed.');
}

async function runBreakBlock(options) {
  await runScriptedTimer('Break', options.breakMinutes, options.paceSeconds, breakScript);
  console.log('Break finished. Glide back into the chair.');
}

async function runScriptedTimer(label, minutes, paceSeconds, script) {
  const totalSteps = Math.max(1, Math.round(minutes));
  const stepDurationSeconds = (minutes * paceSeconds) / totalSteps;

  for (let step = 0; step < totalSteps; step += 1) {
    const cue = script[step % script.length];
    const remaining = totalSteps - step;
    const prefix = label === 'Focus' ? '[•]' : '[~]';
    console.log(
      `${prefix} ${label} minute ${step + 1}/${totalSteps} — ${cue} (≈${remaining - 1} min left)`
    );
    await sleep(stepDurationSeconds * 1000);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  headline('Fjord Focus Coach');
  console.log(
    `Guiding ${options.cycles} cycle(s). Each focus minute = ${options.paceSeconds}s realtime (use --pace 60 for actual minutes).`
  );

  for (let cycle = 1; cycle <= options.cycles; cycle += 1) {
    const fact = selectFact(cycle - 1);
    logBlockHeader(cycle, options.cycles, fact, options);
    await runFocusBlock(options, fact);
    if (cycle !== options.cycles) {
      logBreakHeader(options);
      await runBreakBlock(options);
    }
  }

  console.log('\nAll cycles complete. Mark the win and log the session.');
}

main().catch((error) => {
  console.error('Fjord Focus Coach failed:', error);
  process.exitCode = 1;
});
