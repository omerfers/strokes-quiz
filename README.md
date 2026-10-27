# The Strokes — Song Quiz (Grafana plugins)

A music guessing game for Grafana: a random The Strokes clip plays, you type the
song title, and a correct answer reveals the album art and plays the track for
another 8 seconds. Score and streak are tracked per run, over the band's
wallpaper.

Built for the MIS 251 final project, where the deliverable is **a Grafana plugin
that builds, loads in Grafana and shows the student's name**.

- Panel plugin: **Strokes Song Quiz** (`omer-strokesquiz-panel`) — the game UI
- Data source plugin: **Strokes Song Catalog** (`omer-strokesquiz-datasource`) — serves the song catalog

## Quick start

```bash
# 1. dependencies (once)
(cd omer-strokesquiz-panel && npm install)
(cd omer-strokesquiz-datasource && npm install)

# 2. build both plugins and start Grafana with them loaded
./tools/dev.sh
```

Open <http://localhost:3000> → log in with `admin` / `admin` → dashboard
**The Strokes — Song Quiz**. For the distraction-free version used in the
screenshots, open
<http://localhost:3000/d/strokes-quiz/?kiosk&hideLogo=1> — `kiosk` hides the
Grafana navigation and `hideLogo=1` removes the sticky Grafana footer. The
dashboard keeps its own slim “Powered by Grafana” line directly above the song
catalog instead.

`tools/dev.sh` builds both plugins, copies `dist/` into `plugins/<plugin-id>/`
and starts Grafana with `grafana/custom.ini`. Plugins are unsigned, so
`allow_loading_unsigned_plugins` is set there.

You do not need Docker: the repo uses a standalone Grafana 13.2.4 build in
`.grafana-dl/` (see "Installing Grafana manually" if it is missing).

## The catalog

**78 songs across all 8 releases**, in release order:

| Year | Release | Type | Songs |
| --- | --- | --- | --- |
| 2001 | Is This It | Album | 11 |
| 2003 | Room on Fire | Album | 11 |
| 2006 | First Impressions of Earth | Album | 14 |
| 2011 | Angles | Album | 10 |
| 2013 | Comedown Machine | Album | 11 |
| 2016 | Future Present Past | EP | 3 |
| 2020 | The New Abnormal | Album | 9 |
| 2026 | Reality Awaits | Album | 9 |

The data source serves the whole catalog, and every song has a 30-second iTunes
preview bundled with the panel, so the footer reads `78/78 with audio` and any
song in the table can come up in a round.

## Screenshots

| Idle | Listening | Correct guess |
| --- | --- | --- |
| ![Idle](docs/screenshots/00-idle.png) | ![Listening](docs/screenshots/01-playing.png) | ![Reveal](docs/screenshots/03-correct.png) |

| Revealing the answer |
| --- |
| ![Reveal](docs/screenshots/02-reveal.png) |

## Verify it works

```bash
# unit tests: answer matching, queue building, Room on Fire offsets
(cd omer-strokesquiz-panel && npm run test:ci)

# end-to-end: loads the dashboard headlessly, plays a round, checks the score,
# and regenerates the screenshots above
node tools/smoke.mjs
```

## How the game works

| Step | Behaviour |
| --- | --- |
| Start | 15 songs are shuffled into a queue (configurable) |
| Listen | A clip plays for 5s from the song's start offset; pause or resume it any time |
| Guess | Type the title; accents, case, punctuation and a leading "The" are ignored |
| Hints | 1st miss reveals album + year, 2nd reveals the title pattern |
| Correct | +1 score, cover + title shown, track plays for 8s |
| Reveal | "Reveal answer" skips without scoring |

Everything is local: no backend, no external API, no network calls at runtime.

## Room on Fire intro offset

Songs from *Room on Fire* (2003) have a lead-in before the music starts, so every
song carries a `startOffsetSeconds` field. The whole album defaults to **1.2s**,
with per-track overrides where the intro runs longer:

| Song | Offset |
| --- | --- |
| What Ever Happened? | 1.6s |
| Reptilia | 1.0s |
| 12:51 | 1.3s |
| Every other Room on Fire track | 1.2s |

Non-*Room on Fire* songs default to `0`. The offset is applied to both the
guessing clip and the reveal, and `ClipPlayer` clamps it so a short clip can
never seek past its own end. A panel option (**Extra intro skip**) adds a global
nudge if a clip still starts silent.

To change the values, edit `ROOM_ON_FIRE_OFFSET` / `ROOM_ON_FIRE_OVERRIDES` in
[`tools/build-assets.mjs`](tools/build-assets.mjs) and run
`node tools/build-assets.mjs`.

## Background wallpaper

The panel uses a bundled Strokes wallpaper
(`omer-strokesquiz-panel/src/img/background.jpg`) with a dark overlay so the
text stays readable. Two panel options control it, both under **Appearance**:

| Option | Default | What it does |
| --- | --- | --- |
| Wallpaper background | on | Show or hide the image |
| Wallpaper dimming | 72 | 0 = original colours, 100 = almost black |

The image is bundled through webpack, so it works offline and travels with the
plugin. Swap the file to change the wallpaper, then rebuild.

## Audio

The repo ships a **30-second iTunes preview** for every one of the 78 songs in
`omer-strokesquiz-panel/src/audio/clips/`, named by song id
(`reptilia.m4a`, `last-nite.m4a`, …). `src/audio/index.ts` resolves that folder
with `require.context` and prefers `mp3 > m4a > ogg > wav`, so dropping a
higher-quality file with the same id silently replaces the preview.

To import a folder of downloads (any file names, nested folders are fine):

```bash
node tools/import-clips.mjs ~/Desktop/strokes-songs/src/audio

# preview the mapping without copying anything
node tools/import-clips.mjs ~/Desktop/strokes-songs/src/audio --dry-run
```

It matches each file to a catalog title (case, accents, punctuation and `&`
versus `and` are ignored), copies it as `<song-id>.<ext>`, and reports files
that matched nothing. Then rebuild with `./tools/dev.sh`.

You do not need to trim tracks: the player seeks to the song's intro offset and
stops after the configured clip/reveal length, so full-length files work.

Song ids are in
[`omer-strokesquiz-panel/src/catalog.json`](omer-strokesquiz-panel/src/catalog.json).

> **Copyright:** these are 30-second previews of recordings owned by The Strokes
> and RCA. They are included for a course demo only.

## Adding songs

1. Add the title to the matching release's `tracks` array in the `ALBUMS` list in
   `tools/build-assets.mjs` (add a new release object if needed).
2. `node tools/build-assets.mjs` — rewrites both catalogs and prints the counts.
3. `node tools/import-clips.mjs <folder>` to copy its audio (optional).
4. `./tools/dev.sh`

The panel uses the data source when one is attached, and falls back to the
catalog bundled in `catalog.json` otherwise — so it never shows an empty screen.

## Project layout

```
strokes-quiz/
├── omer-strokesquiz-panel/        # panel plugin (game)
│   ├── webpack.config.ts          # extends .config/webpack with the audio rule
│   ├── src/components/StrokesQuizPanel.tsx
│   ├── src/components/AlbumArt.tsx  # real cover art per release
│   ├── src/img/covers/            # 8 album covers
│   ├── src/img/background.jpg     # bundled wallpaper
│   ├── src/audio/index.ts         # require.context clip resolver
│   ├── src/audio/player.ts        # offset-aware HTMLAudioElement wrapper
│   ├── src/audio/clips/           # 78 song clips, named by id
│   ├── src/catalog.json           # generated song metadata
│   ├── src/utils/answer.ts        # answer normalisation
│   └── src/utils/queue.ts         # shuffle + round queue
├── omer-strokesquiz-datasource/   # data source plugin (catalog)
│   └── src/songs.json             # generated "mock JSON" endpoint
├── grafana/                       # custom.ini, provisioning, dashboard JSON
├── plugins/                       # built plugins loaded by Grafana (generated)
└── tools/
    ├── build-assets.mjs           # catalog generator
    ├── import-clips.mjs           # bulk-rename audio downloads to song ids
    ├── sync.sh                    # build both plugins into ./plugins
    ├── dev.sh                     # sync + run Grafana
    └── smoke.mjs                  # headless end-to-end check + screenshots
```

## Course requirement mapping

| Requirement | Where |
| --- | --- |
| One Grafana plugin | Two: panel + data source |
| Builds successfully | `npm run build` in both projects |
| Loads inside Grafana | `./tools/dev.sh`, dashboard provisioned |
| Student's name visible | Footer of the panel: "Developed by Ömer Faruk Ersakay" |
| Panel bonus: real data from a query | Panel reads the data source frame when attached |
| Panel bonus: configuration options | 10 options (songs per game, clip length, reveal length, max guesses, extra intro skip, album art, hints, wallpaper, dimming, credit) |
| Panel bonus: interactivity | Keyboard submit, hover states, replay, shake feedback |
| Data source bonus: mock JSON | `src/songs.json` |
| Data source bonus: query params | Album filter + row limit in the query editor |
| Data source bonus: table format | Five fields (id, title, album, year, intro offset), table visualisation |
| Data source bonus: error handling | `query()` returns `LoadingState.Error`; `testDatasource()` validates the catalog |
| Git repo bonus | This repository |
| Docs + demo video | This README + your recording |

## Installing Grafana manually

If `.grafana-dl/` is missing:

```bash
mkdir -p .grafana-dl && cd .grafana-dl
curl -L -o grafana.tar.gz https://dl.grafana.com/oss/release/grafana-13.2.4.darwin-arm64.tar.gz
tar -xzf grafana.tar.gz && rm grafana.tar.gz
```

For Intel macOS use `darwin-amd64`; for Linux use `linux-amd64` / `linux-arm64`.

## Troubleshooting

- **Dashboard says "Panel plugin not found"** — `plugins/` is stale: rerun `./tools/dev.sh`.
- **Audio does not start** — browsers block autoplay until you interact with the page; the first Start click unlocks it. The panel also shows a warning if a clip is missing.
- **Clip starts silent** — that song needs a larger `startOffsetSeconds`, or raise the **Extra intro skip** panel option.
- **Port 3000 busy** — change `http_port` in `grafana/custom.ini`.

## Credits

Songs and album titles belong to The Strokes. Album artwork and audio clips are
the band's own releases, included for a course demo. Wallpaper image supplied by
the student.
