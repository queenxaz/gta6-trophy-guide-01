# Leonida Legend — GTA VI Trophy Guide & Tracker

[![make.fun bounty](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![make.fun rank](https://make.fun/badge/gta6-trophy-guide-01/queenxaz/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![make.fun reward](https://make.fun/badge/gta6-trophy-guide-01/queenxaz/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01)

An offline web app that is the best guide and tracker for the **55 PlayStation 5 trophies of Grand Theft Auto VI** (launched 19 November 2026). Static files that open in a desktop browser and work with the network off.

## What it does

- **The official list, all 55** — every trophy with its official name, description and grade exactly as PlayStation publishes them (1 platinum, 2 gold, 6 silver, 46 bronze; 28 hidden), verified against Exophase and PSNProfiles.
- **Tracker** — a checklist saved in the browser (localStorage), with export to a file and import back, filters by kind (story, missable, collectibles, activities, robbery, exploration, side quests, combat, misc — and online, which correctly finds nothing), and a spoiler setting that hides hidden trophies until earned.
- **Roadmap to the platinum** — six stages built from the official descriptions: which story chapters and missions, which collectibles and counts, in what order. Around 200 hours, one playthrough.
- **Missables flagged** — Positive Mental Attitude is the one possibly-missable trophy (Lucia's Chapter 1 balcony meditation), plus the time-sensitive Race Against Yago in Chapter 3.
- **A guide to each trophy, in our own words, with its sources named** — what to do, where and how, and when it can be missed. Five hidden trophies had no confirmed method at launch; the guide says so plainly instead of guessing.

## Run it

Serve `app/` with any static server and open `index.html`, or open the file directly:

```sh
cd app && python3 -m http.server 8080
# open http://localhost:8080
```

Everything it loads is a file under `app/`; it makes no network request at run time.

## Sources

- Trophy names, descriptions and grades: the official PS5 list as published on PlayStation, via Exophase and PSNProfiles (the two agree on every name, description and grade).
- Guide facts: [GTABase — GTA 6 Trophy Guide & Achievements List](https://www.gtabase.com/articles/gta-6/gta-6-achievements-trophies-list-ps5-xbox-series) and [Output Lag — GTA 6 Trophy List](https://outputlag.com/guides/gta-6-trophy-list/), named beside each trophy they support. All guide text is written in this project's own words; nothing is copied from another guide.

## Entry

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the vendored make.fun library (`vendor/makefun-frontend.ts`):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

An independent fan-made guide. Not affiliated with, endorsed by, or connected to Rockstar Games or Sony Interactive Entertainment. No Rockstar logo, artwork, box art or game screenshots are used. Grand Theft Auto VI is developed and published by Rockstar Games.

## License

MIT — see [LICENSE](LICENSE).
