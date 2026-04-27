# Fjord Focus Coach

Pomodoro-style focus timer anchored to Norwegian fjords with live weather, daylight data, and guided breathing patterns. Each focus cycle connects you to a real fjord location — with current temperature, wind, sunrise/sunset, and a breathing exercise matched to the landscape.

## Data Sources

| Source | Data | API |
|--------|------|-----|
| MET Norway Locationforecast 2.0 | Temperature, wind, clouds, humidity, pressure | `api.met.no/weatherapi/locationforecast/2.0` |
| MET Norway Sunrise 3.0 | Sunrise, sunset, daylight hours, midnight sun | `api.met.no/weatherapi/sunrise/3.0` |

Zero external dependencies. Python uses `urllib` (stdlib). Node.js uses native `fetch`.

## Quick Start

### Python (3.10+)

```bash
# Quick demo (2 min focus, 1 min break, 1s per "minute")
python3 coach.py timer --focus 2 --break 1 --cycles 1 --pace 1

# Real 25-minute Pomodoro at a specific fjord
python3 coach.py timer --location sognefjorden --pattern box --pace 60

# Check weather at a fjord
python3 coach.py status --location geirangerfjorden

# Full report with weather across 5 fjords + your stats
python3 coach.py report
```

### Node.js (18+)

```bash
node src/index.js timer --focus 2 --break 1 --cycles 1 --pace 1
node src/index.js status --location lofoten
node src/index.js report
```

## Commands

| Command | Description |
|---------|-------------|
| `timer` | Start a focus session with live fjord conditions (default) |
| `status` | Show current weather and daylight at a fjord |
| `history` | Session history with streaks and statistics |
| `locations` | List all 20 fjord locations with coordinates |
| `breathing` | List available breathing patterns |
| `report` | Full conditions report across 5 key fjords + your stats |

## Timer Options

| Flag | Default | Description |
|------|---------|-------------|
| `--focus` | 25 | Minutes per focus block |
| `--break` | 5 | Minutes per break |
| `--cycles` | 2 | Number of focus/break pairs |
| `--pace` | 5 | Real seconds per simulated minute (60 = realtime) |
| `--location` / `-l` | auto | Fjord location ID or name |
| `--pattern` / `-p` | box | Breathing pattern |
| `--json` | | Output session data as JSON |

## Locations (20)

| ID | Name | Coordinates | Depth | Shoreline |
|----|------|-------------|-------|-----------|
| geirangerfjorden | Geirangerfjorden | 62.10°N, 7.09°E | 233m | 260 km |
| sognefjorden | Sognefjorden | 61.20°N, 6.60°E | 1,308m | 205 km |
| hardangerfjorden | Hardangerfjorden | 60.09°N, 6.50°E | 891m | 750 km |
| naeroyfjorden | Nærøyfjorden | 60.85°N, 6.87°E | 12m | 17 km |
| lysefjorden | Lysefjorden | 58.98°N, 6.14°E | 497m | 42 km |
| trollfjorden | Trollfjorden | 68.50°N, 15.22°E | 64m | 3 km |
| lofoten | Lofoten (Svolvær) | 68.23°N, 14.57°E | — | 2,130 km |
| nordfjord | Nordfjord | 61.90°N, 6.12°E | 565m | 110 km |
| romsdalsfjorden | Romsdalsfjorden | 62.56°N, 7.10°E | 550m | 85 km |
| trondheimsfjorden | Trondheimsfjorden | 63.45°N, 10.40°E | 617m | 660 km |
| altafjorden | Altafjorden | 69.97°N, 23.27°E | 425m | 38 km |
| tromso | Tromsø | 69.65°N, 18.96°E | — | — |
| nordkapp | Nordkapp | 71.17°N, 25.78°E | — | — |
| reine | Reine (Lofoten) | 67.93°N, 13.09°E | — | — |
| alesund | Ålesund | 62.47°N, 6.15°E | — | — |
| bergen | Bergen | 60.39°N, 5.32°E | — | — |
| stavanger | Stavanger | 58.97°N, 5.73°E | — | — |
| flam | Flåm | 60.86°N, 7.11°E | — | — |
| helgeland | Helgelandskysten | 65.85°N, 13.16°E | — | 11,000 km |
| vesteralen | Vesterålen | 68.80°N, 15.40°E | — | — |

## Breathing Patterns

| Key | Name | Pattern | Use Case |
|-----|------|---------|----------|
| `box` | Box Breathing | Inhale 4 → Hold 4 → Exhale 4 → Hold 4 | Calm focus (military standard) |
| `relax` | 4-7-8 Relaxing | Inhale 4 → Hold 7 → Exhale 8 | Deep calm (Dr. Weil) |
| `deep` | Deep Fjord | Inhale 4 → Hold 2 → Exhale 6 → Hold 2 | Sustained concentration |
| `tactical` | Tactical | Inhale 4 → Hold 4 → Exhale 6 | Alertness under pressure |
| `energy` | Energizing | Inhale 6 → Exhale 2 | Mid-session energy boost |

## Session Persistence

Sessions are saved to `~/.fjord-focus/sessions.json`. Each session records:
- Start/end time, location, cycles completed, breathing pattern
- Weather conditions and daylight hours at the time of the session
- Total focus minutes

Use `history` to see streaks, totals, and favorite locations.

## How It Works

1. **Pick a fjord** — Automatically rotated each hour, or choose with `--location`
2. **Fetch live conditions** — Real-time weather and daylight from MET Norway APIs
3. **Focus block** — Guided breathing cues cycle through your chosen pattern
4. **Break block** — Movement prompts (stretch, hydrate, rest eyes)
5. **Log the session** — Saved with weather snapshot for later review

## Examples

```bash
# Status check at multiple fjords
python3 coach.py status -l bergen
python3 coach.py status -l nordkapp

# Deep focus with 4-7-8 breathing at Sognefjorden
python3 coach.py timer -l sognefjorden -p relax --focus 45 --break 10 --pace 60

# Quick energizing sprint
python3 coach.py timer -l trollfjorden -p energy --focus 10 --break 2 --cycles 3 --pace 1

# View your history
python3 coach.py history

# JSON output for automation
python3 coach.py status -l tromso --json
python3 coach.py report --json
```

## Dependencies

- **Python**: Standard library only (`urllib`, `json`, `argparse`, `datetime`, `pathlib`, `uuid`)
- **Node.js**: Built-in modules only (`fetch`, `node:fs`, `node:os`, `node:crypto`, `node:timers/promises`)
