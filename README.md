# RipLab

A pack-breaking simulator — buy a spot, rip the box, and see what you pulled.

This is a real static web app (no backend, no build step). Everything a player does is
saved locally in their browser (`localStorage`) — there are no accounts and nothing is
sent to a server. It's set up as an installable **PWA** (Progressive Web App), so once it's
hosted somewhere with HTTPS, people can install it to their phone's home screen or their
desktop and it'll open in its own window and work offline after the first visit.

## Project structure

```
index.html              the app shell (markup only)
styles.css              all styling
app.js                  all game logic + install/offline wiring
manifest.webmanifest    name, icons, colors used when installed
sw.js                   service worker — caches the app for offline use + installability
icons/                  app icons (192px, 512px, and a maskable 512px for Android)
gen_icons.py            the script that generated the icons (Pillow) — rerun it if you
                         want to tweak the icon design, it's not needed at runtime
```

There's no `npm install` or build step. It's plain HTML/CSS/JS on purpose, so it stays easy
to keep changing — a future card-art system just means changing what `cardFaceHTML()` in
`app.js` renders.

## Running it locally

Opening `index.html` directly (`file://`) will run the game, but **service workers and
install prompts require a real server** (even a local one), so use one of these from inside
the project folder:

```
python3 -m http.server 8080
# or
npx serve
```

Then visit `http://localhost:8080`. On `localhost`, Chrome/Edge treat the connection as
secure, so install prompts and the service worker work exactly like they would in production.

## Deploying it so it's installable for real

Installing to a home screen requires the app to be served over **HTTPS** from a real domain
— `localhost` is fine for testing, but a phone installing it needs a real URL. Any static
host works; these are free and require no backend:

- **Netlify Drop** — go to [app.netlify.com/drop](https://app.netlify.com/drop) and drag the
  whole `break-room-app` folder in. You get a live HTTPS URL immediately.
- **GitHub Pages** — push this folder to a GitHub repo, then enable Pages for it in the repo
  settings (Settings → Pages → deploy from branch).
- **Vercel** — `npx vercel` from inside the folder (needs a free Vercel account).

Once it's live at an HTTPS URL:

- **Android / desktop Chrome or Edge**: visiting the site shows an "Install" banner built
  into the app itself (and the browser's own address-bar install icon). Installing adds it
  as a standalone app with its own icon.
- **iPhone / iPad (Safari)**: iOS doesn't support automatic install prompts. The app shows
  its own banner telling the player to tap **Share → Add to Home Screen**. That's the only
  way to install on iOS — it's an Apple restriction, not something any web app can skip.

## Updating the deployed app

Whenever you change `index.html`, `styles.css`, `app.js`, or the icons, bump `CACHE_NAME` in
`sw.js` (e.g. `riplab-v1` → `riplab-v2`). The service worker caches files by that
name, so bumping it is what makes already-installed copies pick up your changes instead of
serving the stale cached version.

## What's not in here yet

- Real card artwork — cards are still text/color placeholders (see `cardFaceHTML()` and
  `.card-face` in `styles.css` — that's the one place to change when art is ready).
- Accounts / cloud save — intentionally out of scope for now (local-only, per how this was
  scoped). Revisit if the game ever needs progress to follow a player across devices.
- App store distribution — this is a home-screen-installable web app, not a store listing.
  Getting into the Apple App Store / Google Play would mean wrapping it (e.g. with
  Capacitor) and going through each store's developer/review process — a separate step if
  it's ever worth it.
