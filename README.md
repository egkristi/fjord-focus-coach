# Fjord Focus Coach

Minimalistic timer that pairs breaths with coastline stats. It guides short focus/break cycles while narrating a Norwegian shoreline fact so each sprint has a distinct visual anchor.

## Features
- Cycle-based timer (default: 25/5 Pomodoro style) with adjustable `--focus`, `--break`, and `--cycles` flags.
- Breath cues for every simulated minute, plus light-movement prompts during breaks.
- `--pace` lets you decide how long a "focus minute" lasts in real time (default 5 seconds for quick runs, set to 60 for true minutes).
- Zero dependencies, pure Node.js (ESM) script.

## Quick start
```bash
cd projects/nightly/2026-02-14-fjord-focus-coach
node src/index.js --focus 20 --break 3 --cycles 3 --pace 3
# or install globally
npm install -g .
fjord-focus-coach --pace 60 --cycles 4
```

### Flags
| Flag       | Default | Description |
|------------|---------|-------------|
| `--focus`  | 25      | Minutes per focus block (simulated). |
| `--break`  | 5       | Minutes per break. |
| `--cycles` | 2       | Number of focus/break pairs. |
| `--pace`   | 5       | Real seconds per simulated minute. Use 60 for real-time Pomodoros. |

The script prints a headline, walks through each block with coastline lore + breath cues, and confirms when the session is finished.
