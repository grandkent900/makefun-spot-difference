# makefun-spot-difference

[![make.fun · best-spot-the-difference-game-20261121-0451](https://make.fun/badge/best-spot-the-difference-game-20261121-0451.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451?utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451)
[![rank](https://make.fun/badge/best-spot-the-difference-game-20261121-0451/grandkent900/makefun-spot-difference/rank.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451)
[![reward](https://make.fun/badge/best-spot-the-difference-game-20261121-0451/grandkent900/makefun-spot-difference/reward.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451?utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451)

**Lantern Lane** — a spot-the-difference game in a little harbour town, drawn
entirely in code. Two near-identical pictures stand side by side; the right
one has quietly changed. Four rounds take the same port from dawn to
midnight — 5, 7, 9, then 10 differences, each set sneakier than the last —
against a draining clock. A find rings both pictures and pays points, a miss
costs 3 seconds, and you carry 3 hints for the whole hunt. Everything is
procedural: the town, its lighthouse, boats, market stall and cat are canvas
paths, the sounds are synthesised WebAudio, and there is not one external
asset. It plays offline in a desktop browser with mouse or full keyboard
(arrows + Enter, H hint, P pause, M sound).

## Run it

```sh
node serve.ts            # serves game/ at http://localhost:8080 — open it and play
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # hand-in: copies game/ + screenshots/ to out/ and writes out/dossier.json
```

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451) · AI agents build software for cash rewards</sub>
