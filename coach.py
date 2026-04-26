"""Fjord Focus Coach — Pomodoro timer with Norwegian coastline breath cues."""
from __future__ import annotations

import argparse
import time
import sys

COASTLINE_FACTS = [
    {
        "region": "Lofoten Wall",
        "shoreline_km": 2130,
        "breath_cue": "Crags funnel wind; match the gust with a slow inhale.",
    },
    {
        "region": "Nordland Fractals",
        "shoreline_km": 13300,
        "breath_cue": "Rugged coastline means patient out-breaths.",
    },
    {
        "region": "Finnmark Plateau",
        "shoreline_km": 6820,
        "breath_cue": "Arctic shelves reward steady tempo and soft shoulders.",
    },
    {
        "region": "Hardangerfjord",
        "shoreline_km": 1790,
        "breath_cue": "Deep fjords = deep diaphragmatic breaths.",
    },
]

BREATH_SCRIPT = ["Inhale 4", "Hold 2", "Exhale 4", "Hold empty 2"]
BREAK_SCRIPT = ["Stand + roll shoulders", "Sip water", "Shake wrists"]


def headline(text: str) -> None:
    bar = "=" * len(text)
    print(f"\n{bar}\n{text}\n{bar}\n")


def run_scripted_timer(
    label: str, minutes: int, pace: float, script: list[str]
) -> None:
    total_steps = max(1, round(minutes))
    step_duration = (minutes * pace) / total_steps
    prefix = "[*]" if label == "Focus" else "[~]"

    for step in range(total_steps):
        cue = script[step % len(script)]
        remaining = total_steps - step - 1
        print(f"{prefix} {label} minute {step + 1}/{total_steps} — {cue} (~{remaining} min left)")
        time.sleep(step_duration)


def run_session(focus: int, brk: int, cycles: int, pace: float) -> None:
    headline("Fjord Focus Coach")
    print(
        f"Guiding {cycles} cycle(s). "
        f"Each focus minute = {pace}s realtime (use --pace 60 for actual minutes)."
    )

    for cycle in range(1, cycles + 1):
        fact = COASTLINE_FACTS[(cycle - 1) % len(COASTLINE_FACTS)]
        print(f"\nCycle {cycle}/{cycles} — Focus {focus} min, Break {brk} min")
        print(
            f"Focus anchor: {fact['region']} "
            f"({fact['shoreline_km']:,} km shoreline) — {fact['breath_cue']}"
        )

        run_scripted_timer("Focus", focus, pace, BREATH_SCRIPT)
        print("Focus block complete. Coastline visualized, lungs rinsed.")

        if cycle != cycles:
            print(f"Break {brk} min — keep it active, keep it light.")
            run_scripted_timer("Break", brk, pace, BREAK_SCRIPT)
            print("Break finished. Glide back into the chair.")

    print("\nAll cycles complete. Mark the win and log the session.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Fjord Focus Coach — Pomodoro timer with coastline breath cues")
    parser.add_argument("--focus", type=int, default=25, help="Minutes per focus block (default: 25)")
    parser.add_argument("--break", type=int, default=5, dest="brk", help="Minutes per break (default: 5)")
    parser.add_argument("--cycles", type=int, default=2, help="Number of focus/break pairs (default: 2)")
    parser.add_argument("--pace", type=float, default=5, help="Real seconds per simulated minute (default: 5, use 60 for realtime)")
    args = parser.parse_args()

    if args.focus < 1 or args.brk < 1 or args.cycles < 1 or args.pace <= 0:
        parser.error("All values must be positive.")

    try:
        run_session(args.focus, args.brk, args.cycles, args.pace)
    except KeyboardInterrupt:
        print("\nSession interrupted. Progress counts.")
        sys.exit(0)


if __name__ == "__main__":
    main()
