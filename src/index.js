#!/usr/bin/env node
const dataset = [
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
];

function highlightEntries() {
  return dataset
    .filter(entry => entry['minutes'] >= 20)
    .map(entry => ({ name: entry.name, score: entry['minutes'] }));
}

console.log('
Fjord Focus Coach');
console.log('Minimalistic timer that pairs breaths with coastline stats.');
console.log('
Top signals:');
highlightEntries().forEach((entry, idx) => {
  const rank = String(idx + 1).padStart(2, ' ');
  console.log(' ' + rank + '. ' + entry.name + ' (' + entry.score + ')');
});
