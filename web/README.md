# The Strokes — Song Quiz (web)

The Grafana panel, rebuilt as a plain web app so anyone can play it without
installing Grafana or downloading anything.

Live: **https://strokes-quiz-seven.vercel.app**

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
```

Deploy on Vercel: import the `omerfers/strokes-quiz` repository, set **Root
Directory** to `web`, and deploy. No environment variables are needed.

Audio is not bundled: each song's `itunesTrackId` (in `data/catalog.json`) is
resolved against Apple's public preview API at play time. The catalog is a copy
of `omer-strokesquiz-panel/src/catalog.json`; regenerate both with
`node tools/build-assets.mjs` from the repo root, then copy it here.
