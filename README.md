# Ive Botunac

The personal CV site of Ive Botunac, PhD, at https://ivebotunac.com. It is a one-page CV (about,
experience, education, publications, certifications, skills) with an ambient pixel-art game running
over it: a small AI robot that idles beside the text, chases flying "AI trend" tags, can be hit,
thrown and petted, recruits a team of sub-agents hidden in the CV, and fights an AGI boss.

## What is in the repo

- `/` is the CV, prerendered, and the only page meant for search. `/privacy-policy` is linked from
  the footer and kept out of search. `app/error.vue` covers 404 and 500.
- Content lives in `app/data/cv.ts`, typed by `app/types/cv.ts`. Role durations are computed from
  `start` and `end`, never stored.
- `app/composables/useCvSeo.ts` writes the home page's meta tags, canonical URL, share image and
  `ProfilePage` schema; `app/app.vue` holds the site-wide `Person` and `WebSite` nodes.
- The game is a client-only island, `app/components/game/AmbientGame.client.vue`, with its logic in
  `app/game/`. The server routes for its counters are in `server/api/game/`.

## Stack

Nuxt 4 and Vue 3, plain single-file components with scoped CSS on the tokens in
`app/assets/css/tokens.css`, no UI framework. Modules: `@nuxtjs/sitemap`, `@nuxtjs/robots`,
`nuxt-schema-org`, `@nuxt/image`, `@nuxt/fonts` (Space Mono and IBM Plex Mono, self-hosted),
`nuxt-vitalizer` and `@nuxt/eslint`. It runs on Firebase App Hosting, with `firebase-admin` for the
game counters in Firestore and `playwright-core` (dev only) for printing the PDF CV.

## Running it locally

Node 22 only, pinned in `.nvmrc` and `engines`. A lockfile written under another Node major can
fail `npm ci` on the build server, so install dependencies under 22 as well.

```bash
npm ci
npm run dev                                   # http://localhost:3000
npm run build && npm run typecheck && npm run lint
PORT=3000 node .output/server/index.mjs       # run the production build
```

The site reads no secrets, so there is no `.env` to fill in. Locally the game counters are off:
the `/api/game/*` routes answer 503 and the game simply plays without a leaderboard (see
[Counters](#counters-and-analytics)).

`/images/**` is served as immutable for a year, so a replaced image needs a new file name.

## The ambient game

### Core rules

- Purely ambient. The game layers are fixed with `pointer-events: none` and input is read from
  window listeners. Only a press that lands on the robot, a teammate or a trend is swallowed, so the
  page underneath scrolls and clicks normally everywhere else. With a mouse, a click on a link,
  button or row toggle goes to the page even under the robot. On touch the hit radius alone decides,
  and the mouse events a browser sends after a tap are ignored for 800 ms. The game is hidden under
  `prefers-reduced-motion` and in print.
- Fixed timestep: `frame()` runs 60 ticks a second whatever the display's refresh rate, so all
  tuning is in ticks and a 120Hz screen plays at the same speed.
- Crisp at any size: the robot is drawn into a 220px canvas and scaled with `ctx.scale`, never a
  CSS transform. `BASE` (1.56) folds into the display scale, whose floor on small screens is 0.9.
  Size, speech bubble gap and hit radii all derive from `size()` (random growth plus inflation),
  capped at `MAX_SIZE` (2.6) so the art fits the canvas.
- Talk is mostly reactive: one line per CV section the first time it scrolls into view, a random
  quip only every 20 to 35 s. It falls asleep after 30 s without input (15 s at night, local time).

### Playing with the robot

- Trends are chased from behind and caught only after about 4.5 s of flight. A tap or fast swipe
  destroys one; pressing and dragging carries it, and the robot follows and lasers it, catching it
  only after it is let go. Throwing a trend hard starts a game of fetch: the robot picks it up and
  drops it back beside the cursor.
- It attacks the moving cursor with bullets, a beam, melee and, in a critter form, a thrown data
  orb. Anger rises with each stolen trend and each hit; while angry it targets the player, no trends
  spawn and attacks come faster.
- A press, tap or fast swipe knocks it down, and hits while it is airborne juggle it and count a
  combo. Every hit gets hit-stop, a white flash, squash and stretch, a shake of the robot only (never
  the page) and a short vibration where supported. Each hit also inflates it; after about 12 quick
  hits it pops into debris, the screen flashes orange and it respawns angry.
- Pressing and moving grabs it, releasing throws it with the pointer's speed, and it bounces off the
  viewport edges. A slow cursor over it pets it, which drains anger and inflation.
- It teaches itself one skill at a time (`app/game/guide.ts`): "click me" after a few seconds, then
  juggling, the inflation warning, grabbing, petting, throwing teammates and dragging trends, each
  hint shown only until the skill is used and at most three times a visit.
- It remembers the visitor in `localStorage` under `ib-robot-v1` (skills learned, best combo, pops,
  visits, forms seen, team progress) and nowhere else, so a returning visitor is greeted instead of
  taught. If storage throws, the game just has no memory.

### Critters

The robot morphs into a critter form and back. There are 12 original AI-themed critters, each a
24x24 JSON sprite in `app/game/critters/`:

- RETRIEVER, a retrieval-augmented puppy
- SCRAPER, a data-scraping crab
- THROTTLE, an overheating GPU
- OVERFIT, a jelly blob that copies the robot
- NEURLET, a baby neuron that can evolve into DEEPNET
- DEEPNET, a deep network
- HALLUCINO, a hallucinating cloud
- TIMEOUT, the ghost of a lost request
- PROMPTLING, a living speech bubble
- BUGBYTE, a software bug
- DESCENT, a gradient descent snail
- TOKENPEDE, a tokenizer caterpillar

`app/game/critters.ts` draws them with an automatic outline and mood eyes; their own colours are the
one intended break from the site palette. Each file is named after the critter, and its `key` is the
same name, while `label` is what the page shows. A file also carries a gait, a particle, a quirk and
its own morph, pet, hit and idle lines. The only critter to critter step is NEURLET evolving into
DEEPNET. In a critter form the robot fires the critter's particle instead of pellets, and its beam
takes the particle's colour (`attackStyle` in `critters.ts`). `trait.weight`, `heavy` or `light`,
changes how it takes a knock: a heavy one takes 60% of a fling and lands with a thud, a light one
takes 110% and drifts down.

To add a critter, validate and render its sprite first, then add the file:

```bash
node scripts/critter-sheet.mjs app/game/critters/<name>.json out.png      # one sprite, every mood
S=12 node scripts/critter-sheet.mjs --sheet app/game/critters sheet.png   # all of them, idle pose
```

The script has no dependencies and exits 1 listing every problem when a sprite breaks the format.

The first time a critter form appears it is added to the collection with a "NEW n/12" popup.
`FormsGrid.vue` shows all 12 in the HUD panel and on the team card, in colour once seen and as a
silhouette until then.

### Assemble the team

- Six sub-agents with original 16x16 sprites (`app/game/agents.ts`): Planner in Experience,
  Researcher in Publications, Analyst in Education, Reviewer in Certifications, Coder in Skills, and
  the Deployer, who only turns up when the robot pops.
- `app/game/quest.ts` picks one hidden `<details>` row per section on each page view and listens for
  `toggle` events in the capture phase, so the CV markup is untouched. Opening the right row pops its
  agent out for up to a minute; a click or tap recruits it, otherwise it ducks back. Opened from the
  keyboard, the row recruits at once.
- Recruits trail the robot in a loose V and each has a behaviour (`app/game/team.ts`): the Researcher
  beams at trends, the Coder fires volleys at a moving mouse, the Reviewer drops code-review notes, the
  Analyst draws a bar chart, the Planner draws a path ahead of the robot and the Deployer launches a
  rocket on every pop. Teammates can be picked up and thrown too.
- The HUD (`QuestHud.vue`) shows `TEAM n/6` and which sections still hide an agent, with a
  screen-reader live region for every update. At 6/6 the robot flies a lap with confetti and the team
  card opens.
- The team card (`TeamCard.vue`) is a native `<dialog>` with the team time, the AGI leaderboard, a
  field to sign a fast fight with three letters, follow buttons, the PDF CV, "Fight AGI" and "Restart
  game". The restart clears the team, times and records on this device but keeps the learned tricks.

### The AGI boss

- "Fight AGI" drops a glitchy core with 300 hp in from the top (`app/game/boss.ts`). Clicks and taps
  do 2 hp, every 8th hit in a row is a 6 hp crit, the team fans out under it and fires, and the robot
  lasers it from the side.
- Its attacks are slow, telegraphed orbs. It dashes or teleports every few seconds and fires a
  barrage of five to eight bombs every 8 to 12 s, partly at the CV's text. Below half health all of
  it comes about twice as often. It leaves after 40 s without a hit (15 s on touch).
- Where an orb lands it burns the CV letters around it (`app/game/scorch.ts`): each letter is split
  into its own span, flares, shatters into pixels, burns for a few seconds and leaves a soot mark.
  Links, buttons, headings and the game UI never burn. Letters heal after about 25 s, and a win, a
  retreat, print or a restart repairs the rest. Only the visitor's DOM changes, never the served HTML.

### Counters and analytics

- `GET /api/game/stats[?run=id]` returns the team total, the best time and the AGI top 10, plus the
  given fight's place when `run` is passed. It is cached for 60 s without `run` and rate limited.
- `POST /api/game/event` starts a timed fight (`{ kind: 'run' }`), finishes it (`'boss'`), signs it
  (`'name'`, three letters A to Z minus a blocklist) or reports a finished team (`'team'`). The
  server's own clock times a fight, and one under 9 s is rejected with 409.
- Data lives in Firestore through `firebase-admin` and Application Default Credentials
  (`server/utils/firebase-admin.ts`): a stats document with team totals and a histogram of team
  times, one document per fight, and one leaderboard row per set of initials with its best time.
- Writes are limited per client IP by an in-memory limiter that never logs the IP. On App Hosting
  the key is the `x-fah-client-ip` header, never the client-controlled left of `X-Forwarded-For`.
- Firestore is reached only on Cloud Run (`K_SERVICE` set) or with `FIRESTORE_EMULATOR_HOST`, so
  local play never touches the real counters. The client (`app/game/stats-client.ts`) waits 4 s,
  never retries and treats any failure as no stats.
- Game events go to Google Analytics through `track()` in `app/utils/track.ts`, a no-op until gtag
  has loaded: hits, pops, agents found, forms seen, team completion, boss start and win, restarts,
  board signatures and card button clicks.

## CV PDF

`public/ive-botunac-cv.pdf`, linked from the team card, is the `/cv-print` page printed by headless
Chromium: a two-page A4 layout of the same `app/data/cv.ts`. Both stay out of search, `/cv-print`
by its meta tag and the sitemap exclude, the PDF by an `X-Robots-Tag: noindex` header. Nothing
rebuilds the PDF on deploy, so a change to the CV data or `/cv-print` is followed by:

```bash
npm run build && npm run cv:pdf && npm run build
```

`scripts/cv-pdf.mjs` serves `.output/` on port 3011 (or a free one), prints `/cv-print` with its
`@page` size, margins and a page-number footer, then stops the server. Requests to anything but
the local server are blocked. Chromium comes from `PLAYWRIGHT_CHROMIUM_PATH`, or else the newest
Playwright-installed headless shell or Chromium in the macOS cache.

## Deployment

Firebase App Hosting builds and rolls out every push to `main`; there is no separate deploy step.
`www` is answered with a 301 to the apex by `server/plugins/www-redirect.ts`. The IndexNow key is
the text file in `public/` named after it.

## License

The code is released under the MIT License, see `LICENSE`.

The CV content (the text in `app/data/cv.ts` and the pages built from it), the photo, the PDF CV
and the share image are not covered by that license and remain all rights reserved. Company and
university logos in `public/images/logos/` belong to their respective owners.
