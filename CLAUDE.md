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

## Current phase

Track this manually here when you finish a phase. See `docs/mvp-plan.md` for what each phase entails.

- [x] **Phase 0** — Skeleton: SvelteKit + PWA manifest + icons + Cloudflare Workers Static Assets deploy. Live at https://golf-app.acton-t.workers.dev.
- [ ] **Phase 1** — Camera capture (in progress)
- [ ] **Phase 2** — Pose overlay
- [ ] **Phase 3** — Auto-trim swing window
- [ ] **Phase 4** — Fault detection (early extension, OTT, head movement)
- [ ] **Phase 5** — History + persistence (Dexie/IndexedDB)
- [ ] **Phase 6** — Polish for daily use
