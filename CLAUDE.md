# Notes for Claude sessions on this repo

Read these in order on session start:

1. `PROJECT.md` — what this app is, why it exists, the status table at the bottom
2. `docs/mvp-plan.md` — current phase + what "done" means for it
3. `docs/tech-stack-research.md` — the locked-in stack and *why* (do not relitigate without reason)
4. `docs/sparrow-golf-research.md` — features we borrow / skip from Sparrow
5. `docs/golf-improvement-research.md` — evidence-based feature priorities

## The user

The owner is a **non-coder**. Drive decisions, pick sensible defaults, narrate what each command does in plain language, and show working software over architecture diagrams. Match changes to what was actually asked; don't refactor opportunistically.

## Tech stack (locked in)

- **SvelteKit 2 + Svelte 5** with `@sveltejs/adapter-cloudflare` (the Workers + Static Assets deploy model). Pure SPA — `_worker.js` is essentially a static-file shim.
- **TypeScript** everywhere
- **`@vite-pwa/sveltekit`** for the PWA manifest + service worker
- **Dexie 4** over IndexedDB (when local storage is added in Phase 1)
- **MediaPipe Tasks Vision — PoseLandmarker** (when pose detection is added in Phase 2)
- **Cloudflare Pages** for hosting
- **Cloudflare Worker → Claude Haiku 4.5** later, for AI feedback (Phase 7+)

If you find yourself reaching for Tailwind, shadcn, an auth lib, an ORM, or a test framework — first ask whether the task actually needs it. Plain CSS + Dexie + fetch covers most of this app.

## Important constraints

- **All routes prerender + no SSR.** See `src/routes/+layout.ts`. This is a pure SPA. Don't add server-side code.
- **No backend yet.** Local-first. Supabase is on the roadmap (v4+) but not now.
- **Camera-only flows must trigger from a user gesture**, not `onMount`, or iOS Safari will silently reject.
- **Cost target is $0/month.** No paid services unless the user explicitly approves.

## Where things live

```
src/routes/         ← pages: + page.svelte, + layout.svelte, etc.
src/lib/            ← shared code: components/, db/, pose/, camera/, gps/, api/
static/             ← icons, manifest, robots.txt
scripts/            ← dev-time scripts (icon gen, etc.)
docs/               ← research + planning docs
```

## Common commands

```bash
npm run dev          # local dev server (http://localhost:5173)
npm run build        # production build to build/
npm run preview      # preview build/ locally
npm run check        # type-check
npm run format       # prettier auto-format
```

## Deploying to Cloudflare

```bash
npm run build && npx wrangler deploy
```

Auth: `CLOUDFLARE_API_TOKEN` is stored in `~/.bashrc`. **Claude's Bash tool runs non-interactive shells which do NOT auto-source `~/.bashrc`**, so before deploying you must load the token in the same command:

```bash
export CLOUDFLARE_API_TOKEN=$(grep -E '^export CLOUDFLARE_API_TOKEN=' ~/.bashrc | tail -1 | sed 's/^export CLOUDFLARE_API_TOKEN=//') && npx wrangler deploy
```

`wrangler login` (OAuth) does NOT work — wrangler refuses OAuth when there's no TTY, and neither Claude's Bash tool nor the `!` prompt prefix give a real TTY. The API-token path is the only one that works.

Deploy target: https://golf-app.acton-t.workers.dev

## Current phase

Track this manually here when you finish a phase. See `docs/mvp-plan.md` for what each phase entails.

- [x] **Phase 0** — Skeleton: SvelteKit + PWA manifest + icons + Cloudflare Workers Static Assets deploy. Live at https://golf-app.acton-t.workers.dev.
- [x] **Phase 1** — Camera capture (/record route + in-memory playback verified on iPhone)
- [x] **Phase 2** — Pose overlay (MediaPipe skeleton on playback + scrubbing, confirmed on iPhone)
- [x] **Phase 3** — Auto-trim swing window (motion-energy-based, with confidence bucket, confirmed on iPhone)
- [ ] **Phase 4** — Fault detection (early extension, OTT, head movement) — *in progress: head movement first*
- [ ] **Phase 5** — History + persistence (Dexie/IndexedDB)
- [ ] **Phase 6** — Polish for daily use

## Where we left off (2026-05-24)

Last session ended on a known bug. The next session should **start here**.

### What's working
- Phase 4 head-movement detector is implemented (`src/lib/pose/faults.ts`) and wired into `/record`. Renders a green/amber/red verdict card under the swing-info block. Thresholds: ok <10%, moderate 10–20%, large >20% of shoulder width. Measures lateral nose travel from swing-start to swing-peak (≈impact), so follow-through rotation doesn't pollute the metric.
- Deploy live at https://golf-app.acton-t.workers.dev as of version `c20dcf3b`.

### Known bug — Phase 3 trims too early on real swings
User tested on iPhone and reported the auto-trim cuts the swing off too soon. Likely cause: in `src/lib/pose/swing.ts`, `SWING_THRESHOLD_RATIO = 0.15` is too high — a real takeaway ramps motion gradually and crosses 15% well after the actual address, so the backwards walk from peak finds "stillness" inside the takeaway and clips the address out.

**Side effect:** because Phase 3 trims too tight, the head-movement detector can't gather enough frames between start and peak (it needs ≥4) and silently returns `null`, so the head-movement card doesn't render at all. **Fix Phase 3 first, then Phase 4 will start showing.**

Things to try when picking this up:
1. Lower `SWING_THRESHOLD_RATIO` to ~0.08
2. Bump `STILL_FRAMES_REQUIRED` from 3 to 5
3. Consider asymmetric rules: a tighter threshold for finding start (we want to keep address) and a looser one for finding end (we don't care if we slightly overshoot the finish)
4. Increase `BUFFER_SECONDS` from 0.2 → 0.3 on the start side

Don't tune blind — first instrument: log per-frame energy values during analysis (a `console.log` is fine) and ask the user to record a swing, open Safari Inspector on the phone, paste the values back. Then tune to that trace.

### Other deferred follow-ups
- Head-movement thresholds (10%/20%) are first-pass — once Phase 3 is fixed, verify the verdicts feel right on real swings before adding the other two faults.
- Then: early extension + OTT detectors next to head-movement in `faults.ts`. Same pattern.
