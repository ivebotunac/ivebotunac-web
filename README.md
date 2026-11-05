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
  its shots land. The text heals on its own, and a fast win can be signed with three initials on
  a shared leaderboard.

The robot teaches itself one skill at a time and remembers the visitor in `localStorage`. The game
loads client-side only, is hidden under `prefers-reduced-motion` and in print, and keyboard
visitors can recruit agents by opening rows. All tuning is in ticks of a fixed 60 Hz step, so
fast displays play at the same speed.

## Stack

- Nuxt 4, Vue 3 single-file components with scoped CSS on the tokens in
  `app/assets/css/tokens.css`. No UI framework; icons from `@mdi/js`.
- `@nuxtjs/sitemap`, `@nuxtjs/robots`, `nuxt-schema-org`, `@nuxt/fonts` (IBM Plex Mono and Space
  Mono, self-hosted), `nuxt-vitalizer`, `@nuxt/eslint`.
- `firebase-admin` for the game counters in Firestore; `playwright-core` (dev only) to print the
  PDF CV.

## Local development

Node 22, pinned in `.nvmrc` and `engines`. Install under Node 22 as well, since a lockfile
written under another major can fail `npm ci` on the build server.

```bash
npm ci
npm run dev                               # http://localhost:3000
npm run build && npm run typecheck && npm run lint
PORT=3000 node .output/server/index.mjs   # serve the production build
```

No secrets are needed. Locally the counter routes answer 503 and the game plays without a
leaderboard.

## Project structure

```
app/
  data/cv.ts            all CV content, typed by types/cv.ts
  pages/                /, /privacy-policy, /cv-print (source of the PDF)
  components/cv/        the CV sections
  components/game/      AmbientGame.vue (the client-only island), HUD, team card, leaderboard
  game/                 game logic: core and tick loop, input, actions, boss, quest, team, critters
  game/critters/        one JSON sprite per critter
  composables/          SEO (useCvSeo), analytics, UI helpers
server/
  api/game/             stats.get.ts, event.post.ts
  utils/                game-guard.ts (input checks, rate limits), game-stats.ts (Firestore)
  plugins/              www and trailing-slash redirects
shared/                 API types and constants used by both the client and the server
scripts/
  cv-pdf.mjs            prints /cv-print to public/ive-botunac-cv.pdf
  critter-sheet.mjs     validates and renders critter sprites
```

## Game counters

- `GET /api/game/stats[?run=<id>]` returns the number of finished teams, the best team time and
  the AGI top 10, plus that fight's place when `run` is given. Cached for 60 s without `run`.
- `POST /api/game/event` takes `{ kind: 'run' }` to start a boss fight, `'boss'` to finish it,
  `'name'` to sign it with three letters A to Z (a blocklist applies) and `'team'` to report a
  finished team. The server times each fight on its own clock and rejects one under 9 s with 409.
- Data lives in Firestore (`server/utils/game-stats.ts`): a stats document with totals and a
  histogram of team times, one document per fight, and one leaderboard entry per set of initials.
- Both routes are rate limited per client by an in-memory limiter that never logs or stores the
  IP. On App Hosting the key is the `x-fah-client-ip` header.
- Firestore is used only on Cloud Run (`K_SERVICE` set) or with `FIRESTORE_EMULATOR_HOST`, so
  local runs never touch the real counters. The client gives up after 4 s, never retries and
  treats any failure as no stats.

## Adding a critter

Validate and render the sprite before adding it to `app/game/critters/`:

```bash
node scripts/critter-sheet.mjs app/game/critters/<name>.json out.png      # one sprite, every mood
S=12 node scripts/critter-sheet.mjs --sheet app/game/critters sheet.png   # all sprites, idle pose
```

The script has no dependencies and exits 1 listing every problem when a sprite breaks the format.

## CV PDF

`public/ive-botunac-cv.pdf` is the `/cv-print` page, an A4 layout of the same `app/data/cv.ts`,
printed by headless Chromium. Nothing rebuilds it on deploy, so after changing the CV data or
`/cv-print`, run:

```bash
npm run build && npm run cv:pdf && npm run build
```

`scripts/cv-pdf.mjs` serves the build on port 3011 (or a free port), blocks every request that is
not to that local server, prints the page with a page-number footer and stops the server.
Chromium comes from `PLAYWRIGHT_CHROMIUM_PATH`, or else the newest Playwright-installed build in
the macOS (Apple silicon) cache. Neither `/cv-print` nor the PDF is indexed.

## Deployment

Firebase App Hosting builds and rolls out every push to `main`; there is no separate deploy step.
`www` is redirected to the apex with a 301 by `server/plugins/www-redirect.ts`. A fork needs its
own Firebase project in `.firebaserc` and `server/utils/firebase-admin.ts`, and its own Google
Analytics ID in `app/composables/useGoogleAnalytics.ts`.

## License

The code is released under the MIT License, see `LICENSE`.

The CV content (the text in `app/data/cv.ts` and the pages built from it), the photo, the PDF CV
and the share image are not covered by that license and remain all rights reserved. Company and
university logos in `public/images/logos/` belong to their respective owners.
