# The Strokes — Song Quiz (Grafana plugins)

A music guessing game for Grafana: a random The Strokes clip plays, you type the
song title, and a correct answer reveals the album art and plays the track for
another 8 seconds. Score and streak are tracked per run, over the band's
wallpaper.

This is a quiz about my favourite band, made for me to play on my own: a clip
plays, I get five seconds to name the song, and a correct answer reveals the
album cover. I wanted to build it anyway. When I found out the MIS 233 final
project could be this exact idea, it became this repo.

- Panel plugin: **Strokes Song Quiz** (`omer-strokesquiz-panel`) — the game UI
- Data source plugin: **Strokes Song Catalog** (`omer-strokesquiz-datasource`) — serves the
  catalog metadata (titles, albums, years, intro offsets); the audio previews are
  resolved from iTunes by the panel, not by the data source

## Play it on the web

The quiz also runs as a normal website, no Grafana needed: **https://strokes-quiz-seven.vercel.app**

The `web/` folder is a standalone Next.js app with the same rules, design and
iTunes previews.

```bash
cd web
npm install
npm run dev        # http://localhost:3000
```

To publish it on Vercel, import this repository, set **Root Directory** to
`web`, and deploy — there is nothing to configure.

## Quick start


```bash
# 1. dependencies (once)
(cd omer-strokesquiz-panel && npm install)
(cd omer-strokesquiz-datasource && npm install)

# 2. build both plugins and start Grafana with them loaded
./tools/dev.sh
```

Open <http://localhost:3000> → log in with `admin` / `admin` → dashboard
**The Strokes — Song Quiz**. For the distraction-free version, open
<http://localhost:3000/d/strokes-quiz/?kiosk&hideLogo=1> — `kiosk` hides the
Grafana navigation and `hideLogo=1` stops the sticky Grafana footer before the
page renders. The quiz panel also hides that footer itself, so the only
attribution is the slim “Powered by Grafana” line directly above the song
catalog, whichever URL you open.

`tools/dev.sh` builds both plugins, copies `dist/` into `plugins/<plugin-id>/`
and starts Grafana with `grafana/custom.ini`. Plugins are unsigned, so
`allow_loading_unsigned_plugins` is set there.

You do not need Docker: the repo uses a standalone Grafana 13.2.4 build in
`.grafana-dl/` (see "Installing Grafana manually" if it is missing).

## The catalog

**79 songs across 9 releases**, in release order:

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
| 2013 | The Singles, Vol. 1 | Compilation | 1 |

The data source serves the whole catalog. Audio is **not** stored in this repo:
every song carries its iTunes track id, and the panel fetches Apple's
30-second preview the first time a round needs it, then keeps it in memory for
the session. The footer reads `79 tracks · previews via iTunes`.

## Screenshots

`node tools/smoke.mjs` writes the end-to-end screenshots to
`docs/screenshots/`; that folder is ignored by git. The panel's backdrop is
`src/img/background.jpg` (replace it with any 16:9 image and rebuild).

## Verify it works

```bash
# unit tests: answer matching, queue building, Room on Fire offsets
(cd omer-strokesquiz-panel && npm run test:ci)

# end-to-end: loads the dashboard headlessly, plays a round, checks the score,
# and writes screenshots to docs/screenshots/
node tools/smoke.mjs
```

## How the game works

| Step | Behaviour |
| --- | --- |
| Start | 15 songs are shuffled into a queue (configurable) |
| Listen | A clip plays for 5s from the song's start offset; pause or resume it any time |
| Guess | Type the title; accents, case, punctuation and a leading "The" are ignored |
| Hints | A wrong guess reveals the album and year |
| Correct | +1 score, cover + title shown, track plays for 8s |
| Reveal | "Reveal answer" skips without scoring |
| Abandon | "Abandon quiz" twice leaves the run, stops the audio and resets the score |

Everything else is local: no backend and no service of ours to run; the only
network calls are the iTunes preview lookups described below.

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

Nothing audio-related is committed. Each catalog row carries an
`itunesTrackId`, and `src/audio/preview.ts` resolves it against Apple's public
iTunes API the first time the song is played:

```ts
const preview = await resolvePreview(song); // { url, artworkUrl } | undefined
await player.play(preview.url, offsetFor(song), seconds);
```

- One `lookup?id=<trackId>` request per song, cached in memory for the session.
- The same response supplies `artworkUrl100`, which `AlbumArt` requests at
  600×600, so the repo ships no cover images either.
- The player already stops after the configured clip/reveal length, so a
  30-second preview is enough for the 5-second clip and the reveal.
- If a lookup fails the round is skipped with a warning instead of breaking.

Song ids and track ids live in
[`omer-strokesquiz-panel/src/catalog.json`](omer-strokesquiz-panel/src/catalog.json);
`tools/build-assets.mjs` keeps the ids it finds when it regenerates the catalog.

> **Copyright:** the previews are streamed from Apple at play time and are not
> redistributed with the plugin. A personal, non-commercial project is the usual
> case for Apple's preview terms; check them if this ever ships publicly.

## Adding songs

1. Add the title to the matching release's `tracks` array in the `ALBUMS` list in
   `tools/build-assets.mjs` (add a new release object if needed).
2. `node tools/build-assets.mjs` — rewrites both catalogs and prints the counts.
3. Find its iTunes track id (`https://itunes.apple.com/search?term=...`) and add
   it as `itunesTrackId` in `catalog.json` — without one the panel falls back to
   a title search, which is slower and less reliable.
4. `./tools/dev.sh`

The panel uses the data source when one is attached, and falls back to the
catalog bundled in `catalog.json` otherwise — so it never shows an empty screen.
The data source frame carries the metadata only; the panel matches each row to
`catalog.json` by `id` to pick up the `itunesTrackId` it needs for playback.

## Project layout

```
strokes-quiz/
├── omer-strokesquiz-panel/        # panel plugin (game)
│   ├── webpack.config.ts          # extends .config/webpack with the audio rule
│   ├── src/components/StrokesQuizPanel.tsx
│   ├── src/components/AlbumArt.tsx  # cover art from the iTunes response
│   ├── src/img/background.jpg     # bundled wallpaper
│   ├── src/audio/preview.ts       # iTunes preview + artwork lookup, cached
│   ├── src/audio/player.ts        # offset-aware HTMLAudioElement wrapper
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

## What's in the quiz

**The game**

- 79 songs from all nine releases, in release order — album tracks, the
  *Future Present Past* EP and *The Singles, Vol. 1*
- A shuffled queue of 15 songs per run (configurable), with a fresh order every
  time
- 5-second clips that start at the song's real intro, with pause and resume
- Forgiving answer matching: case, accents, punctuation and a leading "The"
  don't matter
- A hint after a miss shows the album and year; the round is lost after the
  configured number of misses (two by default)
- Live score, current streak, best streak and accuracy
- Album art on a correct answer, then 8 more seconds of the song
- Reveal, abandon, play again, and Enter to move through the round
- A verdict at the end, including "Julian Casablancas himself." for a perfect
  run

**The Grafana side**

- A panel plugin with ten options: songs per game, clip length, reveal length,
  guesses per round, extra intro skip, album art, hints, wallpaper, dimming and
  the credit line
- A data source plugin that serves the catalog as a table, with an album filter
  and a row limit in the query editor
- Proper error states: a failed query reports the error instead of drawing an
  empty panel
- A provisioned dashboard, plus kiosk mode for playing without the Grafana
  chrome

**The web side**

- A standalone Next.js build with the same rules and the same look, live at
  <https://strokes-quiz-seven.vercel.app>

## MIS 233 bonuses

The bonus items from the assignment, and where each one lives:

| Bonus | Where |
| --- | --- |
| A second plugin | Panel + data source, not just one |
| Panel: real data from a query | The panel reads the data source frame when one is attached |
| Panel: configuration options | 10 options across Quiz, Audio, Appearance and About |
| Panel: interactivity | Start, guess with Enter, pause/resume, abandon, reveal, next, play again, hover states |
| Data source: mock JSON | `omer-strokesquiz-datasource/src/songs.json` |
| Data source: query parameters | Album filter and row limit in the query editor |
| Data source: table format | Five fields (id, title, album, year, intro offset), `preferredVisualisationType: 'table'` |
| Data source: error handling | `query()` returns `LoadingState.Error`; `testDatasource()` validates the catalog |
| Git repository | This repository |
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
the band's own releases, streamed from Apple's iTunes previews at play time.
Wallpaper image is my own.

## AI usage

I made the project with using opencode agent.

| | |
| --- | --- |
| **Me** | The idea, and every call about how the game should play: 79 songs in release order, 15 per run, five seconds to guess, eight to enjoy the reveal, two misses and the round is over, a hint for the album after a miss. I picked the wallpaper and the way the album cover lands on a correct answer. The *Room on Fire* offsets are mine too — I went through the intros by ear and wrote down where the music actually starts. And I tested it by playing, in Grafana and on the web, which is how the silent intros and the previews starting twice got found. |
| **AI** | The code and the scaffolding: both plugins, the React components, `ClipPlayer`, the iTunes preview and artwork lookup, answer normalisation, the queue, the data source query and table frame, the Grafana provisioning and dashboard, the build and smoke-test scripts, the Next.js version, the tests and this README. |

Most of the back-and-forth was me playing the quiz and noticing what was off: a
clip that started on silence, a preview that restarted itself, a kiosk view that
didn't fill the screen. Those went back as small, specific fixes rather than
open-ended prompts. The AI did the typing; which songs, which rules and what the reveal
looks like were decided before the first file existed.
