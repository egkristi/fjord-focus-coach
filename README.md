# Fjord Focus Coach

Pomodoro-style focus timer that pairs breath cues with Norwegian coastline facts. Each focus cycle is anchored to a different fjord region, giving every sprint a distinct visual and breathing pattern.

## Quick Start

### Node.js (18+)

```bash
node src/index.js --focus 25 --break 5 --cycles 2 --pace 5
```

### Python (3.10+)

```bash
python3 coach.py --focus 25 --break 5 --cycles 2 --pace 5
```

### Flags

| Flag       | Default | Description                                        |
|------------|---------|----------------------------------------------------|
| `--focus`  | 25      | Minutes per focus block (simulated)                |
| `--break`  | 5       | Minutes per break                                  |
| `--cycles` | 2       | Number of focus/break pairs                        |
| `--pace`   | 5       | Real seconds per simulated minute (60 = realtime)  |

### Examples

```bash
# Quick demo (2 min focus, 1 min break, 1s per "minute")
node src/index.js --focus 2 --break 1 --cycles 2 --pace 1
python3 coach.py --focus 2 --break 1 --cycles 2 --pace 1

# Real 25-minute Pomodoro
node src/index.js --pace 60
python3 coach.py --pace 60

# Short 15/3 sprint
node src/index.js --focus 15 --break 3 --cycles 4 --pace 60
```

## How It Works

Each cycle picks a Norwegian coastline region (Lofoten, Nordland, Finnmark, Hardangerfjord) as a focus anchor. During focus blocks, you get 4-count breathing cues (inhale, hold, exhale, hold). During breaks, you get light movement prompts (stretch, sip water, shake wrists).

## Dependencies

- **Node.js**: Zero npm dependencies (uses `node:process`, `node:timers/promises`)
- **Python**: Standard library only (no pip install needed)
