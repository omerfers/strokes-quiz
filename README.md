# The Strokes — Song Quiz (Grafana plugins)

A music guessing game for Grafana: a random The Strokes clip plays, you type the
song title, and a correct answer reveals the album art and plays the track for
another 15 seconds. Score and streak are tracked per run.

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
**The Strokes — Song Quiz**.

`tools/dev.sh` builds both plugins, copies `dist/` into `plugins/<plugin-id>/`
and starts Grafana with `grafana/custom.ini`. Plugins are unsigned, so
`allow_loading_unsigned_plugins` is set there.

You do not need Docker: the repo uses a standalone Grafana 13.2.4 build in
`.grafana-dl/` (see "Installing Grafana manually" if it is missing).

## Screenshots

| Listening | Correct guess |
| --- | --- |
| ![Listening](docs/screenshots/01-playing.png) | ![Reveal](docs/screenshots/03-correct.png) |

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
| Start | 10 songs are shuffled into a queue (configurable) |
| Listen | A clip plays for 10s from the song's start offset |
| Guess | Type the title; accents, case, punctuation and a leading "The" are ignored |
| Hints | 1st miss reveals album + year, 2nd reveals the title pattern |
| Correct | +1 score, album art + title shown, track plays for 15s |
| Reveal | "Reveal answer" skips without scoring |

Everything is local: no backend, no external API, no network calls at runtime.

## Room on Fire intro offset

Songs from *Room on Fire* (2003) have a lead-in before the music starts, so every
song carries a `startOffsetSeconds` field:

| Song | Offset |
| --- | --- |
| What Ever Happened? | 1.6s |
| Reptilia | 1.0s |
| 12:51 | 1.3s |

Non-*Room on Fire* songs default to `0`. The offset is applied to both the
guessing clip and the reveal, and `ClipPlayer` clamps it so a short clip can
never seek past its own end. A panel option (**Extra intro skip**) adds a global
nudge if a clip still starts silent.

To change the values, edit [`tools/build-assets.mjs`](tools/build-assets.mjs) and
run `node tools/build-assets.mjs`.

## Adding real audio

Placeholder `.wav` clips are generated so the plugin is playable immediately.
To use real tracks, drop files into `omer-strokesquiz-panel/src/audio/clips/`
using the song id as the file name:

```
omer-strokesquiz-panel/src/audio/clips/reptilia.mp3
omer-strokesquiz-panel/src/audio/clips/last-nite.mp3
```

`src/audio/index.ts` resolves every clip in that folder and prefers
`mp3 > m4a > ogg > wav`, so a real mp3 silently replaces the placeholder — no
code change. Rebuild with `./tools/dev.sh`.

Song ids are in [`omer-strokesquiz-panel/src/catalog.json`](omer-strokesquiz-panel/src/catalog.json).

> **Copyright:** short clips only, and keep unlicensed audio out of the submitted
> git repository if you can — the plugin works with placeholders for the demo.

## Adding songs

1. Add the song to the `catalog` array in `tools/build-assets.mjs`.
2. `node tools/build-assets.mjs` — rewrites both catalogs and creates a placeholder clip.
3. Drop the real audio file in `src/audio/clips/<id>.mp3` (optional).
4. `./tools/dev.sh`

The panel uses the data source when one is attached, and falls back to the
catalog bundled in `catalog.json` otherwise — so it never shows an empty screen.

## Project layout

```
strokes-quiz/
├── omer-strokesquiz-panel/        # panel plugin (game)
│   ├── src/components/StrokesQuizPanel.tsx
│   ├── src/components/AlbumArt.tsx
│   ├── src/audio/index.ts         # require.context clip resolver
│   ├── src/audio/player.ts        # offset-aware HTMLAudioElement wrapper
│   ├── src/audio/clips/           # audio (wav placeholders + your mp3s)
│   ├── src/catalog.json           # generated song metadata
│   └── src/utils/answer.ts        # answer normalisation
├── omer-strokesquiz-datasource/   # data source plugin (catalog)
│   └── src/songs.json             # generated "mock JSON" endpoint
├── grafana/                       # custom.ini, provisioning, dashboard JSON
├── plugins/                       # built plugins loaded by Grafana (generated)
└── tools/
    ├── build-assets.mjs           # catalog + placeholder audio generator
    └── dev.sh                     # build + sync + run Grafana
```

## Course requirement mapping

| Requirement | Where |
| --- | --- |
| One Grafana plugin | Two: panel + data source |
| Builds successfully | `npm run build` in both projects |
| Loads inside Grafana | `./tools/dev.sh`, dashboard provisioned |
| Student's name visible | Footer of the panel: "Developed by Omer — Fall 2026" |
| Panel bonus: real data from a query | Panel reads the data source frame when attached |
| Panel bonus: configuration options | 8 options (rounds, clip length, reveal length, max guesses, extra intro skip, album art, hints, credit) |
| Panel bonus: interactivity | Keyboard submit, hover states, replay, shake feedback |
| Data source bonus: mock JSON | `src/songs.json` |
| Data source bonus: query params | Album filter + row limit in the query editor |
| Data source bonus: table format | Six string/number fields, table visualisation |
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

Songs and album titles belong to The Strokes. Album artwork in the plugin is
generated (gradients + initials), not the real covers. Audio placeholders are
synthesised tones, not the recordings.
