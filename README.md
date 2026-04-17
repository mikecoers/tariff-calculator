# Kid Pitch Coach

Offline-first baseball management PWA for Kid Pitch (AA) coaches. Built for field-side
use: large tap targets, minimal text entry, automatic rule compliance.

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS
- IndexedDB (via Dexie)
- Workbox service worker (vite-plugin-pwa)
- React Router
- Papaparse (CSV) and jsPDF (printable summary)
- Vitest for rule-engine tests

## Getting started

```bash
npm install
npm run dev      # dev server
npm run build    # production build
npm test         # rule-engine tests
```

Open the dev server in a mobile viewport for the best experience. The app is installable
as a PWA on iOS/Android/desktop once served over HTTPS.

## Team setup

On first launch, enter a team name. Naming the team "Phillies" auto-loads the built-in
12-player roster (Cooper Coers, Aiden Doughty, Arlington Pribble, Asher Zielinski,
Benjamin Davis, Braxton Gifford, Griffin Connor, Jake Rogers, Jaxon Logan, Owen Bailey,
Spencer Ryan, Weston Monson).

You can also seed the Phillies from **Settings → Demo data**.

## Scope of tracking

- **Our team (e.g. Phillies)**: full roster, defense rotation, batting order, pitcher
  eligibility, pitch counts, per-player stats.
- **Opponent**: score, balls/strikes, outs, and a rolling batter number only. The app
  does not track the opponent's roster or pitcher.

## Key features

- Pre-game setup in under 5 minutes with an availability toggle so absent players never
  appear in the lineup or rotation engine.
- In-game screen optimized for one-handed use: ball/strike/foul as primary taps,
  resolve-at-bat grid, +Out and +Run shortcuts, undo-last.
- Rule engine enforces playing-time minimums (4 defensive innings / 2 in first four),
  pitch-count rest tiers, season-phase gates (walks/steals/manager pitching), inning
  run caps, and catcher-to-pitcher restrictions.
- Defensive rotation recommender that prioritizes players behind on playing time and
  skips anyone absent or ineligible.
- Season stats with CSV export and per-game PDF compliance summary.

## Data model

All state lives in IndexedDB; there is no backend. See `src/db/schema.ts` for stores
and `src/types/index.ts` for entities. Sync queue is stubbed for a future cloud backup.

## Folder layout

```
src/
  app/            Router, providers, service worker registration
  components/     Shared UI (AppShell, Header, Modal, PrimaryButton, etc.)
  db/             Dexie schema + repositories
  features/
    home/ roster/ games/ lineups/ pitching/ rules/ scoring/ stats/ settings/ sync/
  lib/            id/time helpers
  types/          Domain types
```

## Rule modules

Pure functions only — no React, no side effects. Located in `src/features/rules/`:

- `pitchingRules.ts` — pitch-count tiers, rest, eligibility
- `playingTimeRules.ts` — per-player audit and proactive risk detection
- `inningRules.ts` — run caps, half/inning transitions, game-over
- `catcherRules.ts` — catcher-to-pitcher same-inning restriction
- `seasonPhaseRules.ts` — phase gates (walks/steals/manager pitching)
- `complianceEngine.ts` — combined game-level alert computation
- `../lineups/lineupRecommendationEngine.ts` — weighted defensive placement

## Tests

Run `npm test`. Rule-engine tests live under `src/features/rules/__tests__/`.
