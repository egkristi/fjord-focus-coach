"""Fjord Focus Coach
Minimalistic timer that pairs breaths with coastline stats."""
from rich import print
from statistics import mean

data = [
  {
    "name": "Lofoten",
    "minutes": 25
  },
  {
    "name": "Nordland",
    "minutes": 15
  },
  {
    "name": "Finnmark",
    "minutes": 35
  }
]

def summarize():
    avg = mean(entry['minutes'] for entry in data)
    print(f"[bold cyan]Avg minutes[/bold cyan]: {avg:.2f}")
    print("
[bold]Highlights[/bold]")
    for entry in sorted(data, key=lambda e: e['minutes'], reverse=True)[:3]:
        print(f" • {entry['name']} -> {entry['minutes']}")

if __name__ == '__main__':
    summarize()
