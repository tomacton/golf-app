# Golf Improvement App

A personal Progressive Web App (PWA) to help the owner improve their golf game.

## Goal

A single app, installable on iPhone and Android via the browser, that combines:
1. **Swing video analysis** — record a swing, get visual + AI feedback (inspired by Sparrow Golf)
2. **Practice & drill tracking** — log range sessions, follow structured improvement plans
3. **On-course stats** — score, GIR, putts, club distances, with a path toward Strokes-Gained-style insights

v1 will start with **one** of the three (chosen after research) and be architected so the other two can be added without rewriting.

## Constraints

- **Built by:** Claude Code, with the owner as product owner (non-coder).
- **Cost target:** $0 to start; understand and document costs at each scale step.
- **No app stores.** PWA only — install via "Add to Home Screen" on the phone browser.
- **Local-first.** Data lives on the phone (IndexedDB) by default; cloud sync is a later option.

## Repo layout

```
/home/acton/golf
├── PROJECT.md              ← this file — the anchor doc for any future Claude session
├── docs/
│   ├── tech-stack-research.md         ← PWA framework, hosting, AI, storage decisions
│   ├── sparrow-golf-research.md       ← What Sparrow does, what we borrow
│   ├── golf-improvement-research.md   ← Evidence-based features that actually help golfers improve
│   └── mvp-plan.md                    ← v1 scope, milestones, "ship it" definition (TBD)
└── (app source to be added once stack is chosen)
```

## For future Claude sessions

If you are picking this project up cold, read in this order:
1. This file (`PROJECT.md`)
2. `docs/mvp-plan.md` — what we're building right now
3. `docs/tech-stack-research.md` — why the stack was chosen
4. The other docs for deeper context as needed

The user is a **non-coder**: drive the work, pick sensible defaults, explain decisions briefly, and show working software over architecture diagrams.

## Status

| Date       | Milestone                                                              |
|------------|------------------------------------------------------------------------|
| 2026-05-22 | Project kickoff. Research phase complete. MVP plan locked in.          |
| 2026-05-22 | v1 scope: swing video analysis (record → auto-trim → pose overlay → 3 faults → save). See `docs/mvp-plan.md`. |
| 2026-05-22 | Phase 0 scaffold complete locally. Repo pushed to https://github.com/tomacton/golf-app. Cloudflare Pages connection pending user setup. |
| _next_     | Phase 1 — Camera capture (record + playback).                          |
