# ivebotunac.com

Source of [ivebotunac.com](https://ivebotunac.com), the CV of Ive Botunac, PhD, built with Nuxt 4,
Vue 3 and TypeScript and hosted on Firebase App Hosting.

The CV is one prerendered page. On top of it runs a small pixel-art game: an AI robot reacts to
the sections as they scroll by, chases "AI trend" tags, shape-shifts into 20 critters, recruits six
sub-agents hidden in the CV and, with a full team, fights an AGI boss that burns letters out of the
page. The game loads client-side only, never blocks scrolling, links or text selection, and is
hidden under `prefers-reduced-motion` and in print.

## Run it

Node 22, see `.nvmrc`.

```bash
npm ci
npm run dev                                   # http://localhost:3000
npm run lint && npm run typecheck && npm run build
```

No secrets are needed. Without Firestore the game plays without a leaderboard. To try the
counters, start the Firestore emulator (needs Java) and point the app at it:

```bash
npx firebase-tools emulators:start --only firestore
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run dev
```

## Where things are

```
app/data/cv.ts          all CV content
app/components/cv/      the CV sections
app/game/               the game: loop, input, robot, critters, team, boss
app/game/critters/      one JSON sprite per critter, picked up automatically
server/api/game/        stats and event endpoints behind the counters and the board
server/utils/           input checks, rate limits, Firestore access
shared/                 API types used by both client and server
scripts/                cv-pdf.mjs prints the PDF CV, critter-sheet.mjs checks a sprite
```

The game endpoints validate every event, time each fight on the server's clock and rate limit per
client without storing the IP. The board trusts that timing only, so it is a toy, not a verified
ranking.

The PDF CV is not rebuilt on deploy: after changing the CV, run `npm run build && npm run cv:pdf`
and commit `public/ive-botunac-cv.pdf`.

## License

The code is MIT, see `LICENSE`. The CV content (`app/data/cv.ts` and the pages built from it),
the photo, the PDF CV and the share image remain all rights reserved, and the logos in
`public/images/logos/` belong to their owners. A fork replaces those, along with the domain, the
Firebase project and the Analytics ID.
