# Meridian Sky — Island Run

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/Harliboys2991/flight-game-entry/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/Harliboys2991/flight-game-entry/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

A complete original flight game for the make.fun bounty
[`best-flight-game-20261126-0057`](https://make.fun/bounty/best-flight-game-20261126-0057).
It runs in a desktop browser from static files, with no network request, played
with keyboard and mouse.

## The game

You are the pilot of a light island-hopper at golden hour. Take off from the
island strip, thread 12 golden target rings over the valley, mind your fuel and
your hull over the peaks — and put her down on runway 27 at the far airfield.

- **Chase view** over recognisable terrain: patchwork fields, a winding river,
  snow-capped peaks, hot-air balloons and the runway ahead
- **The aircraft in frame** with a lit instrument panel: artificial horizon,
  altimeter and airspeed dials, a compass tape, throttle and fuel bars, hull
- **HUD** with altitude (ft), airspeed (kt), heading, score, rings and the
  distance to the runway, plus a pointer to the next ring
- **Flying that rewards discipline**: throttle and climb need flying speed, a
  stall sinks you, rings pay fuel back, and a rushed landing on the hills
  costs hull
- **Synthesised sound** (WebAudio, no audio files): engine hum, ring chimes,
  hits, landing and crash stingers. `M` mutes.

## Controls

| Key | Action |
| --- | --- |
| ← → or A D, or the mouse | Bank and steer |
| W | Climb |
| S | Descend |
| E / Q | Throttle up / down |
| Shift | Boost |
| Space / Enter / click | Start, restart |
| P | Pause |
| M | Mute |

## How to play it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

## Files

- `game/index.html` and `game/src/` — the game itself (config, random, world,
  render, input, audio, shots, main), plain ES modules, no library
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the
  output and writes `dossier.json` with the vendored make.fun library
- `screenshots/` — 4 real renders of the game's own code in a browser
- `vendor/makefun-game.ts` — the kit's copy, unchanged
- `shots.json` — the staged scenes the screenshots were taken from
