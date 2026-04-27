"""Fjord Focus Coach v2.0 — Focus timer with live Norwegian fjord weather and daylight data.

Data Sources:
  MET Norway Locationforecast 2.0 — real-time weather (temperature, wind, clouds, humidity)
  MET Norway Sunrise 3.0 — sunrise, sunset, daylight hours, midnight sun detection

Commands:
  timer      Start a focus session with live fjord conditions
  status     Show current conditions at a fjord location
  history    Show session history and statistics
  locations  List all available fjord locations
  breathing  List available breathing patterns
  report     Full focus and conditions report
"""
from __future__ import annotations

import argparse
import json
import sys
import time
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen

# ── Version ──────────────────────────────────────────────────────────────────

VERSION = "2.0.0"
USER_AGENT = f"FjordFocusCoach/{VERSION} github.com/egkristi/fjord-focus-coach"
DATA_DIR = Path.home() / ".fjord-focus"
SESSIONS_FILE = DATA_DIR / "sessions.json"

# ── Locations ────────────────────────────────────────────────────────────────

LOCATIONS = [
    {
        "id": "geirangerfjorden", "name": "Geirangerfjorden",
        "lat": 62.10, "lon": 7.09, "shoreline_km": 260, "depth_m": 233,
        "cue": "UNESCO waters reflect patience — let each breath mirror the stillness.",
    },
    {
        "id": "sognefjorden", "name": "Sognefjorden",
        "lat": 61.20, "lon": 6.60, "shoreline_km": 205, "depth_m": 1308,
        "cue": "Norway's deepest fjord rewards the deepest breaths.",
    },
    {
        "id": "hardangerfjorden", "name": "Hardangerfjorden",
        "lat": 60.09, "lon": 6.50, "shoreline_km": 750, "depth_m": 891,
        "cue": "Orchard blossoms over deep water — breathe in the contrast.",
    },
    {
        "id": "naeroyfjorden", "name": "Nærøyfjorden",
        "lat": 60.85, "lon": 6.87, "shoreline_km": 17, "depth_m": 12,
        "cue": "Narrow walls amplify every sound — focus your hearing inward.",
    },
    {
        "id": "lysefjorden", "name": "Lysefjorden",
        "lat": 58.98, "lon": 6.14, "shoreline_km": 42, "depth_m": 497,
        "cue": "Preikestolen stands above — find your own steady platform.",
    },
    {
        "id": "trollfjorden", "name": "Trollfjorden",
        "lat": 68.50, "lon": 15.22, "shoreline_km": 3, "depth_m": 64,
        "cue": "Tight and dramatic — channel intensity into each exhale.",
    },
    {
        "id": "lofoten", "name": "Lofoten (Svolvær)",
        "lat": 68.23, "lon": 14.57, "shoreline_km": 2130, "depth_m": None,
        "cue": "Crags funnel wind — match the gust with a slow inhale.",
    },
    {
        "id": "nordfjord", "name": "Nordfjord",
        "lat": 61.90, "lon": 6.12, "shoreline_km": 110, "depth_m": 565,
        "cue": "Glacier-fed calm — let cool clarity flow through you.",
    },
    {
        "id": "romsdalsfjorden", "name": "Romsdalsfjorden",
        "lat": 62.56, "lon": 7.10, "shoreline_km": 85, "depth_m": 550,
        "cue": "Trollstigen above, deep water below — find balance in between.",
    },
    {
        "id": "trondheimsfjorden", "name": "Trondheimsfjorden",
        "lat": 63.45, "lon": 10.40, "shoreline_km": 660, "depth_m": 617,
        "cue": "The fjord of kings — breathe with purpose and presence.",
    },
    {
        "id": "altafjorden", "name": "Altafjorden",
        "lat": 69.97, "lon": 23.27, "shoreline_km": 38, "depth_m": 425,
        "cue": "Northern Lights above this fjord — let wonder soften your jaw.",
    },
    {
        "id": "tromso", "name": "Tromsø",
        "lat": 69.65, "lon": 18.96, "shoreline_km": None, "depth_m": None,
        "cue": "Gateway to the Arctic — steady breathing through cold clarity.",
    },
    {
        "id": "nordkapp", "name": "Nordkapp",
        "lat": 71.17, "lon": 25.78, "shoreline_km": None, "depth_m": None,
        "cue": "Europe's edge — here the breath meets the open sea.",
    },
    {
        "id": "reine", "name": "Reine (Lofoten)",
        "lat": 67.93, "lon": 13.09, "shoreline_km": None, "depth_m": None,
        "cue": "Red cabins, turquoise water — simplicity sharpens focus.",
    },
    {
        "id": "alesund", "name": "Ålesund",
        "lat": 62.47, "lon": 6.15, "shoreline_km": None, "depth_m": None,
        "cue": "Art Nouveau on ocean — beauty built on resilience.",
    },
    {
        "id": "bergen", "name": "Bergen",
        "lat": 60.39, "lon": 5.32, "shoreline_km": None, "depth_m": None,
        "cue": "Rain-washed Bryggen — persistence in every drop.",
    },
    {
        "id": "stavanger", "name": "Stavanger",
        "lat": 58.97, "lon": 5.73, "shoreline_km": None, "depth_m": None,
        "cue": "Energy city — fuel your focus from ancient stone.",
    },
    {
        "id": "flam", "name": "Flåm",
        "lat": 60.86, "lon": 7.11, "shoreline_km": None, "depth_m": None,
        "cue": "Valley meets fjord — where momentum narrows to a point.",
    },
    {
        "id": "helgeland", "name": "Helgelandskysten",
        "lat": 65.85, "lon": 13.16, "shoreline_km": 11000, "depth_m": None,
        "cue": "Thousand islands, thousand breaths — each one counts.",
    },
    {
        "id": "vesteralen", "name": "Vesterålen",
        "lat": 68.80, "lon": 15.40, "shoreline_km": None, "depth_m": None,
        "cue": "Whale waters — breathe deep and slow like the ocean giants.",
    },
]

# ── Breathing Patterns ───────────────────────────────────────────────────────

BREATHING_PATTERNS = {
    "box": {
        "name": "Box Breathing",
        "description": "Equal-phase military standard for calm focus",
        "steps": [("Inhale", 4), ("Hold", 4), ("Exhale", 4), ("Hold empty", 4)],
    },
    "relax": {
        "name": "4-7-8 Relaxing",
        "description": "Dr. Weil's natural tranquilizer for deep calm",
        "steps": [("Inhale", 4), ("Hold", 7), ("Exhale", 8)],
    },
    "deep": {
        "name": "Deep Fjord",
        "description": "Extended exhale for sustained concentration",
        "steps": [("Inhale", 4), ("Hold", 2), ("Exhale", 6), ("Hold empty", 2)],
    },
    "tactical": {
        "name": "Tactical",
        "description": "First-responder pattern for alertness under pressure",
        "steps": [("Inhale", 4), ("Hold", 4), ("Exhale", 6)],
    },
    "energy": {
        "name": "Energizing",
        "description": "Quick-tempo breath for a mid-session boost",
        "steps": [("Inhale", 6), ("Exhale", 2)],
    },
}

BREAK_PROMPTS = [
    "Stand and roll your shoulders",
    "Sip water — hydrate the fjord within",
    "Shake out your wrists",
    "Close your eyes and listen",
    "Stretch your neck side to side",
    "Look at something far away for 20 seconds",
    "Take three deep belly breaths",
    "Wiggle your toes and ground your feet",
]

# ── Weather symbol descriptions ──────────────────────────────────────────────

WEATHER_SYMBOLS = {
    "clearsky": "Clear sky",
    "fair": "Fair",
    "partlycloudy": "Partly cloudy",
    "cloudy": "Cloudy",
    "lightrainshowers": "Light rain showers",
    "rainshowers": "Rain showers",
    "heavyrainshowers": "Heavy rain showers",
    "lightsleetshowers": "Light sleet showers",
    "sleetshowers": "Sleet showers",
    "heavysleetshowers": "Heavy sleet showers",
    "lightsnowshowers": "Light snow showers",
    "snowshowers": "Snow showers",
    "heavysnowshowers": "Heavy snow showers",
    "lightrain": "Light rain",
    "rain": "Rain",
    "heavyrain": "Heavy rain",
    "lightsleet": "Light sleet",
    "sleet": "Sleet",
    "heavysleet": "Heavy sleet",
    "lightsnow": "Light snow",
    "snow": "Snow",
    "heavysnow": "Heavy snow",
    "fog": "Fog",
    "lightrainandthunder": "Rain and thunder",
    "rainandthunder": "Rain and thunder",
    "heavyrainandthunder": "Heavy rain and thunder",
}

# ── API Fetching ─────────────────────────────────────────────────────────────


def _fetch_json(url: str, timeout: int = 10) -> dict | None:
    try:
        req = Request(url, headers={"User-Agent": USER_AGENT})
        with urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode())
    except (URLError, OSError, json.JSONDecodeError, ValueError):
        return None


def fetch_weather(lat: float, lon: float) -> dict | None:
    url = (
        f"https://api.met.no/weatherapi/locationforecast/2.0/compact"
        f"?lat={lat}&lon={lon}"
    )
    data = _fetch_json(url)
    if not data:
        return None
    try:
        ts = data["properties"]["timeseries"][0]
        instant = ts["data"]["instant"]["details"]
        next_data = ts["data"].get("next_1_hours") or ts["data"].get("next_6_hours") or {}
        symbol_raw = next_data.get("summary", {}).get("symbol_code", "unknown")
        symbol_base = symbol_raw.rsplit("_", 1)[0] if "_" in symbol_raw else symbol_raw
        description = WEATHER_SYMBOLS.get(symbol_base, symbol_raw.replace("_", " ").title())
        return {
            "temp_c": instant.get("air_temperature"),
            "wind_speed": instant.get("wind_speed"),
            "wind_dir": instant.get("wind_from_direction"),
            "humidity": instant.get("relative_humidity"),
            "pressure": instant.get("air_pressure_at_sea_level"),
            "clouds": instant.get("cloud_area_fraction"),
            "symbol": symbol_raw,
            "description": description,
        }
    except (KeyError, IndexError, TypeError):
        return None


def fetch_daylight(lat: float, lon: float) -> dict | None:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    url = (
        f"https://api.met.no/weatherapi/sunrise/3.0/sun"
        f"?lat={lat}&lon={lon}&date={today}&offset=%2B02:00"
    )
    data = _fetch_json(url)
    if not data:
        return None
    try:
        props = data["properties"]
        sunrise_str = props.get("sunrise", {}).get("time")
        sunset_str = props.get("sunset", {}).get("time")
        noon = props.get("solarnoon", {})
        midnight = props.get("solarmidnight", {})

        result = {
            "sunrise": sunrise_str,
            "sunset": sunset_str,
            "noon_elevation": noon.get("disc_centre_elevation"),
            "midnight_visible": midnight.get("visible", False),
        }

        if sunrise_str and sunset_str:
            sr = datetime.strptime(sunrise_str, "%Y-%m-%dT%H:%M%z")
            ss = datetime.strptime(sunset_str, "%Y-%m-%dT%H:%M%z")
            result["daylight_hours"] = (ss - sr).total_seconds() / 3600
        elif midnight.get("visible"):
            result["daylight_hours"] = 24.0
        else:
            result["daylight_hours"] = 0.0

        return result
    except (KeyError, TypeError, ValueError):
        return None


def _wind_direction(degrees: float | None) -> str:
    if degrees is None:
        return ""
    dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    return dirs[round(degrees / 45) % 8]


# ── Session Persistence ──────────────────────────────────────────────────────


def _ensure_data_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def load_sessions() -> list[dict]:
    if not SESSIONS_FILE.exists():
        return []
    try:
        return json.loads(SESSIONS_FILE.read_text())
    except (json.JSONDecodeError, OSError):
        return []


def save_session(session: dict) -> None:
    _ensure_data_dir()
    sessions = load_sessions()
    sessions.append(session)
    SESSIONS_FILE.write_text(json.dumps(sessions, indent=2))


# ── Display Helpers ──────────────────────────────────────────────────────────


def headline(text: str) -> None:
    bar = "=" * max(len(text), 30)
    print(f"\n{bar}\n{text}\n{bar}\n")


def _fmt_daylight(hours: float | None) -> str:
    if hours is None:
        return "unknown"
    if hours >= 24:
        return "24h (midnight sun!)"
    if hours <= 0:
        return "0h (polar night)"
    h = int(hours)
    m = int((hours - h) * 60)
    return f"{h}h {m:02d}m"


def _fmt_time(iso: str | None) -> str:
    if not iso:
        return "—"
    try:
        return datetime.strptime(iso, "%Y-%m-%dT%H:%M%z").strftime("%H:%M")
    except ValueError:
        return iso


def _fmt_weather_line(weather: dict | None) -> str:
    if not weather:
        return "Weather: unavailable (offline)"
    wind = f", wind {weather['wind_speed']} m/s" if weather.get("wind_speed") else ""
    wd = _wind_direction(weather.get("wind_dir"))
    if wd:
        wind += f" from {wd}"
    return f"Weather: {weather['temp_c']}°C, {weather['description']}{wind}"


def _fmt_daylight_line(daylight: dict | None) -> str:
    if not daylight:
        return ""
    sr = _fmt_time(daylight.get("sunrise"))
    ss = _fmt_time(daylight.get("sunset"))
    dl = _fmt_daylight(daylight.get("daylight_hours"))
    line = f"Daylight: {dl} (sunrise {sr}, sunset {ss})"
    if daylight.get("midnight_visible"):
        line += "  ☀ Midnight sun!"
    return line


def _print_location_header(loc: dict) -> None:
    parts = []
    if loc.get("depth_m"):
        parts.append(f"{loc['depth_m']:,}m deep")
    if loc.get("shoreline_km"):
        parts.append(f"{loc['shoreline_km']:,} km shoreline")
    extra = " | ".join(parts)
    if extra:
        extra = f"  ({extra})"
    print(f"{loc['name']} ({loc['lat']:.2f}°N, {loc['lon']:.2f}°E){extra}")


# ── Timer Engine ─────────────────────────────────────────────────────────────


def _run_timer(label: str, minutes: int, pace: float, cues: list[str]) -> None:
    total = max(1, round(minutes))
    step_sec = (minutes * pace) / total
    prefix = "[*]" if label == "Focus" else "[~]"

    for i in range(total):
        cue = cues[i % len(cues)]
        left = total - i - 1
        print(f"  {prefix} {label} minute {i + 1}/{total} — {cue} ({left} min left)")
        time.sleep(step_sec)


# ── Commands ─────────────────────────────────────────────────────────────────


def cmd_timer(args: argparse.Namespace) -> None:
    loc = _find_location(args.location)
    pattern = BREATHING_PATTERNS[args.pattern]
    breath_cues = [f"{name} {count}" for name, count in pattern["steps"]]

    headline("Fjord Focus Coach")
    print(f"Fetching conditions at {loc['name']}...\n")

    weather = fetch_weather(loc["lat"], loc["lon"])
    daylight = fetch_daylight(loc["lat"], loc["lon"])

    _print_location_header(loc)
    print(f"  {_fmt_weather_line(weather)}")
    dl_line = _fmt_daylight_line(daylight)
    if dl_line:
        print(f"  {dl_line}")
    print(f'  "{loc["cue"]}"')
    print()
    steps_str = " → ".join(f"{n} {c}" for n, c in pattern["steps"])
    print(f"Pattern: {pattern['name']} ({steps_str})")
    print(
        f"Session: {args.cycles} cycle(s) × {args.focus} min focus + {args.brk} min break"
        f" (pace: {args.pace}s/min)"
    )

    session_start = datetime.now(timezone.utc).isoformat()
    cycles_done = 0
    total_focus = 0

    try:
        for cycle in range(1, args.cycles + 1):
            print(f"\n── Cycle {cycle}/{args.cycles} — Focus {args.focus} min ──")
            _run_timer("Focus", args.focus, args.pace, breath_cues)
            total_focus += args.focus
            cycles_done = cycle
            print("  Focus block complete. Coastline visualized, lungs rinsed.")

            if cycle != args.cycles:
                print(f"\n── Break {args.brk} min ──")
                _run_timer("Break", args.brk, args.pace, BREAK_PROMPTS)
                print("  Break complete. Glide back in.")
    except KeyboardInterrupt:
        print("\n\nSession interrupted. Progress counts.")

    session = {
        "id": str(uuid.uuid4()),
        "started": session_start,
        "ended": datetime.now(timezone.utc).isoformat(),
        "location": loc["id"],
        "location_name": loc["name"],
        "cycles_target": args.cycles,
        "cycles_completed": cycles_done,
        "focus_minutes": args.focus,
        "break_minutes": args.brk,
        "pattern": args.pattern,
        "total_focus_minutes": total_focus,
        "weather": weather,
        "daylight_hours": daylight.get("daylight_hours") if daylight else None,
    }
    save_session(session)

    print(f"\n{cycles_done} cycle(s) complete. {total_focus} minutes focused.")
    print(f"Session saved to {SESSIONS_FILE}")

    if args.json:
        print(json.dumps(session, indent=2))


def cmd_status(args: argparse.Namespace) -> None:
    loc = _find_location(args.location)
    print()
    _print_location_header(loc)

    weather = fetch_weather(loc["lat"], loc["lon"])
    daylight = fetch_daylight(loc["lat"], loc["lon"])

    print(f"  {_fmt_weather_line(weather)}")
    if weather:
        print(
            f"  Humidity: {weather['humidity']}% | "
            f"Pressure: {weather['pressure']} hPa | "
            f"Clouds: {weather['clouds']}%"
        )
    dl_line = _fmt_daylight_line(daylight)
    if dl_line:
        print(f"  {dl_line}")
    if daylight and daylight.get("noon_elevation"):
        print(f"  Solar noon elevation: {daylight['noon_elevation']:.1f}°")
    print(f'  "{loc["cue"]}"')

    if args.json:
        print(json.dumps({"location": loc, "weather": weather, "daylight": daylight}, indent=2))


def cmd_history(args: argparse.Namespace) -> None:
    sessions = load_sessions()
    if not sessions:
        print("\nNo sessions recorded yet. Start one with: coach.py timer")
        return

    headline("Focus History")

    for s in reversed(sessions[-10:]):
        date = s["started"][:10]
        loc_name = s.get("location_name", s.get("location", "?"))
        cycles = f"{s.get('cycles_completed', '?')}/{s.get('cycles_target', '?')}"
        mins = s.get("total_focus_minutes", 0)
        pat_name = BREATHING_PATTERNS.get(s.get("pattern", ""), {}).get("name", s.get("pattern", "?"))
        print(f"  {date}  {loc_name:<22}  {cycles} cycles  {mins:>4} min  {pat_name}")

    total = len(sessions)
    total_mins = sum(s.get("total_focus_minutes", 0) for s in sessions)

    session_dates = sorted(set(s["started"][:10] for s in sessions))
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    current_streak = 0
    check = today
    for _ in range(len(session_dates) + 1):
        if check in session_dates:
            current_streak += 1
            d = datetime.strptime(check, "%Y-%m-%d") - timedelta(days=1)
            check = d.strftime("%Y-%m-%d")
        else:
            break

    best_streak = streak = 0
    for i, d in enumerate(session_dates):
        if i == 0:
            streak = 1
        else:
            prev = datetime.strptime(session_dates[i - 1], "%Y-%m-%d")
            curr = datetime.strptime(d, "%Y-%m-%d")
            streak = streak + 1 if (curr - prev).days == 1 else 1
        best_streak = max(best_streak, streak)

    loc_counts: dict[str, int] = {}
    for s in sessions:
        k = s.get("location_name", s.get("location", "unknown"))
        loc_counts[k] = loc_counts.get(k, 0) + 1
    fav = max(loc_counts, key=loc_counts.get) if loc_counts else "—"

    print(f"\n  Total: {total} sessions, {total_mins / 60:.1f} hours focused")
    print(f"  Current streak: {current_streak} day(s)")
    print(f"  Best streak: {best_streak} day(s)")
    print(f"  Favorite location: {fav} ({loc_counts.get(fav, 0)} sessions)")

    if args.json:
        print(json.dumps({
            "sessions": sessions,
            "stats": {
                "total_sessions": total,
                "total_minutes": total_mins,
                "current_streak": current_streak,
                "best_streak": best_streak,
                "favorite_location": fav,
            },
        }, indent=2))


def cmd_locations(args: argparse.Namespace) -> None:
    headline("Fjord Locations")
    for loc in LOCATIONS:
        depth = f"{loc['depth_m']:>5}m" if loc.get("depth_m") else "      "
        shore = f"{loc['shoreline_km']:>5} km" if loc.get("shoreline_km") else "        "
        print(
            f"  {loc['id']:<22} {loc['name']:<22} "
            f"{loc['lat']:>6.2f}°N {loc['lon']:>6.2f}°E  {depth}  {shore}"
        )
    if args.json:
        print(json.dumps(LOCATIONS, indent=2))


def cmd_breathing(args: argparse.Namespace) -> None:
    headline("Breathing Patterns")
    for key, pat in BREATHING_PATTERNS.items():
        steps_str = " → ".join(f"{n} {c}" for n, c in pat["steps"])
        print(f"  {key:<10} {pat['name']:<18} {steps_str}")
        print(f"  {'':10} {pat['description']}")
        print()
    if args.json:
        out = {}
        for k, v in BREATHING_PATTERNS.items():
            out[k] = {"name": v["name"], "description": v["description"],
                       "steps": [f"{n} {c}" for n, c in v["steps"]]}
        print(json.dumps(out, indent=2))


def cmd_report(args: argparse.Namespace) -> None:
    today_str = datetime.now(timezone.utc).strftime("%d %b %Y")
    headline(f"Fjord Focus Report — {today_str}")

    sample_ids = ["geirangerfjorden", "sognefjorden", "lofoten", "nordkapp", "tromso"]
    sample_locs = [loc for loc in LOCATIONS if loc["id"] in sample_ids]

    conditions = []
    print("Current Conditions")
    print("─" * 65)
    for loc in sample_locs:
        w = fetch_weather(loc["lat"], loc["lon"])
        d = fetch_daylight(loc["lat"], loc["lon"])
        conditions.append({"location": loc, "weather": w, "daylight": d})

        temp = f"{w['temp_c']:>5.1f}°C" if w else "     —"
        desc = (w["description"][:18] if w else "unavailable").ljust(20)
        dl = _fmt_daylight(d.get("daylight_hours")) if d else "—"
        print(f"  {loc['name']:<22} {temp}  {desc} {dl}")

    print("\nFocus Recommendation")
    print("─" * 40)

    best = None
    best_score = -999.0
    for c in conditions:
        w = c["weather"]
        if w:
            score = (w.get("temp_c") or 0) - (w.get("clouds") or 100) / 10 - (w.get("wind_speed") or 10)
            if score > best_score:
                best_score = score
                best = c
    if best and best["weather"]:
        bw = best["weather"]
        print(f"  Best conditions: {best['location']['name']} — {bw['description']}, {bw['temp_c']}°C")

    longest = max(conditions, key=lambda c: (c["daylight"] or {}).get("daylight_hours", 0))
    dl_h = (longest["daylight"] or {}).get("daylight_hours")
    if dl_h and dl_h > 0:
        print(f"  Most daylight: {longest['location']['name']} — {_fmt_daylight(dl_h)}")

    sessions = load_sessions()
    print("\nYour Stats")
    print("─" * 30)
    if sessions:
        now = datetime.now(timezone.utc)
        week_ago = (now - timedelta(days=7)).isoformat()
        month_ago = (now - timedelta(days=30)).isoformat()
        ws = [s for s in sessions if s["started"] >= week_ago]
        ms = [s for s in sessions if s["started"] >= month_ago]
        w_mins = sum(s.get("total_focus_minutes", 0) for s in ws)
        m_mins = sum(s.get("total_focus_minutes", 0) for s in ms)
        print(f"  This week: {len(ws)} sessions, {w_mins / 60:.1f} hours")
        print(f"  This month: {len(ms)} sessions, {m_mins / 60:.1f} hours")
    else:
        print("  No sessions logged yet. Start one with: coach.py timer")

    if args.json:
        print(json.dumps({
            "date": today_str,
            "conditions": [{
                "location": c["location"]["name"],
                "weather": c["weather"],
                "daylight_hours": (c["daylight"] or {}).get("daylight_hours"),
            } for c in conditions],
        }, indent=2))


# ── Location Lookup ──────────────────────────────────────────────────────────


def _normalize(s: str) -> str:
    return s.lower().replace(" ", "").replace("ø", "o").replace("å", "a").replace("æ", "ae")


def _find_location(name: str | None) -> dict:
    if name is None:
        idx = int(time.time() / 3600) % len(LOCATIONS)
        return LOCATIONS[idx]

    key = _normalize(name)
    for loc in LOCATIONS:
        if loc["id"] == key or _normalize(loc["name"]) == key:
            return loc
    for loc in LOCATIONS:
        if key in loc["id"] or key in _normalize(loc["name"]):
            return loc

    print(f"Unknown location: {name}. Use 'locations' to see options.")
    sys.exit(1)


# ── CLI ──────────────────────────────────────────────────────────────────────


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fjord Focus Coach — Focus timer with live Norwegian fjord data",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--version", action="version", version=f"%(prog)s {VERSION}")

    sub = parser.add_subparsers(dest="command")

    p_timer = sub.add_parser("timer", help="Start a focus session")
    p_timer.add_argument("--focus", type=int, default=25)
    p_timer.add_argument("--break", type=int, default=5, dest="brk")
    p_timer.add_argument("--cycles", type=int, default=2)
    p_timer.add_argument("--pace", type=float, default=5)
    p_timer.add_argument("--location", "-l", type=str, default=None)
    p_timer.add_argument("--pattern", "-p", type=str, default="box",
                         choices=BREATHING_PATTERNS.keys())
    p_timer.add_argument("--json", action="store_true")

    p_status = sub.add_parser("status", help="Show conditions at a fjord")
    p_status.add_argument("--location", "-l", type=str, default=None)
    p_status.add_argument("--json", action="store_true")

    p_history = sub.add_parser("history", help="Show session history")
    p_history.add_argument("--json", action="store_true")

    p_locs = sub.add_parser("locations", help="List fjord locations")
    p_locs.add_argument("--json", action="store_true")

    p_breath = sub.add_parser("breathing", help="List breathing patterns")
    p_breath.add_argument("--json", action="store_true")

    p_report = sub.add_parser("report", help="Full focus report")
    p_report.add_argument("--json", action="store_true")

    args = parser.parse_args()

    if args.command is None:
        args.command = "timer"
        args.focus = 25
        args.brk = 5
        args.cycles = 2
        args.pace = 5
        args.location = None
        args.pattern = "box"
        args.json = False

    if args.command == "timer" and hasattr(args, "focus"):
        if args.focus < 1 or args.brk < 1 or args.cycles < 1 or args.pace <= 0:
            parser.error("All values must be positive.")

    cmds = {
        "timer": cmd_timer,
        "status": cmd_status,
        "history": cmd_history,
        "locations": cmd_locations,
        "breathing": cmd_breathing,
        "report": cmd_report,
    }

    try:
        cmds[args.command](args)
    except KeyboardInterrupt:
        print("\nInterrupted.")
        sys.exit(0)


if __name__ == "__main__":
    main()
