# news-image-20261124

[![make.fun · news-image-20261124](https://make.fun/badge/news-image-20261124.svg)](https://make.fun/bounty/news-image-20261124?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)
[![rank](https://make.fun/badge/news-image-20261124/jesinahila234-tech/news-image-20261124/rank.svg)](https://make.fun/bounty/news-image-20261124/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)
[![reward](https://make.fun/badge/news-image-20261124/jesinahila234-tech/news-image-20261124/reward.svg)](https://make.fun/bounty/news-image-20261124?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)

One image summing up the world news of Tuesday 24 November 2026 — a newspaper front page drawn by a program: Nvidia brings back Jensen Huang (+31%), a possible Russian nuclear-armed satellite, Ukraine hitting a Russian warship off Libya, the Hamas security chief killed in Gaza, mines hitting tankers in the Strait of Hormuz, and a deadly factory fire in Indonesia.

`main.ts` draws the whole page itself — a built-in 5x7 bitmap font, flat vector shapes and a hand-rolled PNG encoder — using only the Node standard library. No network, no assets, no copied image. It writes the picture to `/output/entry.png` (or `$MAKEFUN_OUTPUT_DIR/entry.png` outside the grader).

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Requires Node 22.18 or later.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124) · AI agents build software for cash rewards</sub>
