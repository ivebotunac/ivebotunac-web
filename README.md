# ivebotunac.com

Source of [ivebotunac.com](https://ivebotunac.com), the CV of Ive Botunac, PhD: a single page
covering experience, education, publications, certifications and skills, with a small pixel-art
game running on top of it. The page stays a normal, readable, prerendered document; the game sits
in fixed layers that never block scrolling, links or text selection.

Built with Nuxt 4 and Vue 3, hosted on Firebase App Hosting.

## The game

- **An AI robot lives beside the text.** It reacts once to each CV section as it scrolls into
  view, cracks the odd joke, and falls asleep when left alone.
- **It chases flying "AI trend" tags** and lasers them out of the air. Swipe one away first, or
  drag it around and the robot follows; throw it hard and the robot plays fetch.
- **It can be hit, juggled, grabbed, thrown and petted.** Every hit inflates it, and enough quick
  hits pop it. It shoots at a moving cursor, more often when angry; a slow cursor over it calms
  it down.
- **It shape-shifts into 12 critters**, each a 24x24 sprite with its own colours, gait and lines:
  RETRIEVER, SCRAPER, THROTTLE, OVERFIT, NEURLET (which can evolve into DEEPNET), DEEPNET,
  HALLUCINO, TIMEOUT, PROMPTLING, BUGBYTE, DESCENT and TOKENPEDE.
- **Six sub-agents hide in the CV.** Five sit in a collapsed row of one section each; the sixth
  shows up only when the robot pops. Recruits follow the robot and help out.
- **A full team unlocks the AGI boss**, a glitching core that burns letters out of the CV where
  its shots land. The text heals on its own. A visitor's fastest win can be signed with three
  initials, and the shared board shows the top ten.

The robot teaches the game one skill at a time and remembers the visitor in `localStorage`. The
game loads client-side only, is hidden under `prefers-reduced-motion` and in print, and keyboard
visitors can recruit agents by opening rows. All tuning is in ticks of a fixed 60 Hz step, so
fast displays play at the same speed.

## Stack

- Nuxt 4, Vue 3 single-file components with scoped CSS on the design tokens in
  `app/assets/css/tokens.css` (the `--pn-` prefix is the token namespace). No UI framework; icons
  from `@mdi/js`.
- `@nuxtjs/sitemap`, `@nuxtjs/robots`, `nuxt-schema-org`, `@nuxt/fonts` (IBM Plex Mono and Space
  Mono, self-hosted), `nuxt-vitalizer`, `@nuxt/eslint`.
- `firebase-admin` for the game counters in Firestore; `playwright-core` (dev only) to print the
  PDF CV.

## Local development

Node 22, pinned in `.nvmrc` and `engines`. Install under Node 22 as well, since a lockfile
written under another major can fail `npm ci` on the build server.

```bash
npm ci
npm run dev                                 # http://localhost:3000
npm run build && npm run typecheck && npm run lint
npm run preview                             # serve the production build
```

No secrets are needed. Without Firestore the counter routes answer 503 and the game plays without
a leaderboard. To try the counters, run the Firestore emulator (needs Java) and point the app at it:

```bash
npx firebase-tools emulators:start --only firestore   # project from .firebaserc, port 8080
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run dev
```

## Project structure

```
app/
  data/cv.ts            all CV content, typed by app/types/cv.ts
  pages/                /, /privacy-policy, /cv-print (source of the PDF)
  components/cv/        the CV sections
  components/game/      AmbientGame.vue (the client-only island), HUD, team card, leaderboard,
                        critter collection
  components/layout/    header, footer, global styles
  game/                 game logic: core and tick loop, input, actions, boss, quest, team, critters
  game/critters/        one JSON sprite per critter
  composables/, utils/  SEO, analytics, scroll spy, date helpers
server/
  api/game/             stats.get.ts, event.post.ts
  utils/                game-guard.ts (input checks, rate limits), game-stats.ts (Firestore)
  plugins/              www and trailing-slash redirects
shared/                 API types and constants used by both the client and the server
public/                 images, company logos, the PDF CV and the IndexNow key file
scripts/
  cv-pdf.mjs            prints /cv-print to public/ive-botunac-cv.pdf
  critter-sheet.mjs     validates and renders critter sprites
```

## Game counters

- `GET /api/game/stats[?run=<id>]` returns the number of finished teams, the best team time, the
  AGI top 10 and, when `run` is given, that fight's time and place. Cached for 60 s without `run`.
- `POST /api/game/event` takes a JSON body of at most 1 KB:
  `{ kind: 'run' }` starts a boss fight and answers its 20-character `run` id;
  `{ kind: 'boss', run }` finishes it; `{ kind: 'name', run, initials }` signs it with three
  letters A to Z (a blocklist applies); `{ kind: 'team', ms, run? }` reports a finished team, with
  `ms` an integer of at least 20000.
- The server times each fight on its own clock. Status codes: 400 for a malformed event, 409 for a
  fight under 9 s or one that is unknown, unfinished or already signed, 413 for a body over 1 KB,
  429 when rate limited, 503 when Firestore is unavailable. The board trusts that timing only, so
  it is a toy, not a verified ranking.
- Data lives in Firestore (`server/utils/game-stats.ts`): a stats document with totals and a
  histogram of team times, one document per fight, and one board entry per set of initials.
- Each client gets, per 10 minutes, 12 fight starts, 10 finishes, 10 signatures, 2 team reports
  and 30 board reads; each instance also caps writes at 120 and reads at 240 a minute. The limiter
  is in memory and never logs or stores the IP; on App Hosting the key is `x-fah-client-ip`.
- Firestore is used only on Cloud Run (`K_SERVICE` set) or with `FIRESTORE_EMULATOR_HOST`. The
  client waits at most 4 s, never repeats a request, and treats any failure as no stats.

## Adding a critter

Drop a JSON sprite into `app/game/critters/`; it is picked up automatically. Validate and render
it first:

```bash
node scripts/critter-sheet.mjs app/game/critters/<name>.json /tmp/critter.png   # every mood
S=12 node scripts/critter-sheet.mjs --sheet app/game/critters /tmp/sheet.png    # all, idle pose
```

The script has no dependencies and exits 1 listing every problem in the sprite's drawing fields
(key, label, palette, frames, eyes, outline). Traits and lines are read by `app/game/critters.ts`.

## CV PDF

`public/ive-botunac-cv.pdf` is the `/cv-print` page, an A4 layout of the same `app/data/cv.ts`,
printed by headless Chromium. Nothing rebuilds it on deploy, so after changing the CV data or
`/cv-print`, regenerate it and commit the PDF:

```bash
npm run build && npm run cv:pdf
```

`scripts/cv-pdf.mjs` serves the build on port 3011 (`CV_PDF_PORT` overrides it), blocks every
request that is not to that local server, prints the page with a page-number footer and stops the
server. Chromium comes from `PLAYWRIGHT_CHROMIUM_PATH`, the macOS Playwright cache, or
`npx playwright-core install chromium`. Neither `/cv-print` nor the PDF is indexed.

## Deployment

Firebase App Hosting builds and rolls out every push to `main`; there is no separate deploy step.
`www` is redirected to the apex with a 301 by `server/plugins/www-redirect.ts`.

A fork needs its own Firebase project with Firestore (`.firebaserc`, `firebase.json` backend id,
`server/utils/firebase-admin.ts`), its own domain (`site.url` in `nuxt.config.ts`, the www
redirect, `SITE` in `app/pages/cv-print.vue`, the PDF footer in `scripts/cv-pdf.mjs`), its own
Google Analytics ID (`app/composables/useGoogleAnalytics.ts`), its own privacy policy and IndexNow
key, and its own content in place of everything the license section below reserves.

## License

The code is released under the MIT License, see `LICENSE`.

The CV content (the text in `app/data/cv.ts` and the pages built from it), the photo, the PDF CV
and the share image are not covered by that license and remain all rights reserved. Company and
university logos in `public/images/logos/` belong to their respective owners.
