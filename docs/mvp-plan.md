# MVP Plan — Golf Improvement PWA

*Synthesizes `tech-stack-research.md`, `sparrow-golf-research.md`, and `golf-improvement-research.md` into a concrete v1 build plan.*

## The decision: what to build first

We start with **swing video analysis**. Reasoning:

1. It's the feature the owner *named* (Sparrow-inspired).
2. It's the technically hardest piece — building it first proves the stack works on a real phone. The other two features (practice tracking, on-course stats) are mostly forms + charts and can be added incrementally without rewriting.
3. It gives the most visceral "look at the thing I built" moment, which sustains motivation on a non-coder side project.
4. The golf-improvement research confirms video swing analysis is a **Tier 3 feature** (high impact, higher effort) — and once it's built, the Tier 1 "logging + Strokes Gained" features have a natural home in the same app shell.

**Explicitly deferred to v2/v3:** round logging, GPS shot tracking, Strokes Gained, drill scheduler, course management helper.

## The locked-in stack (from `tech-stack-research.md`)

| Concern | Choice |
|---|---|
| Framework | SvelteKit 2 (Svelte 5), `adapter-static` |
| PWA tooling | `@vite-pwa/sveltekit` |
| Pose detection | MediaPipe Tasks Vision — PoseLandmarker (Lite, ~3 MB) |
| Local storage | Dexie 4 over IndexedDB |
| Hosting | Cloudflare Pages |
| LLM (later) | Cloudflare Worker proxy → Claude Haiku 4.5 |
| Cloud sync (later) | Supabase |

Expected cost for personal use: **$0/month**, plus optional ~$12/year for a custom domain.

## v1 scope — what "done" looks like

A PWA you can install on your iPhone from Safari, that lets you:

1. **Open `/record`** and grant camera permission.
2. **Tap "record swing"**, swing, tap "stop" (or auto-stop after 6 seconds).
3. **See a slow-motion playback** of the clip with the MediaPipe pose skeleton drawn over you.
4. **See the swing auto-trimmed** to just the swing window (address → finish).
5. **See verdicts for 3 swing faults** with green/red indicator and a one-sentence explanation:
   - Early extension
   - Over-the-top / out-to-in path
   - Head movement
6. **Save the swing** to local storage (IndexedDB).
7. **See a history page** with thumbnails of past swings and the fault verdicts on each.

That's it. Three faults, not five. No drills library yet. No AI written feedback yet. No pro side-by-side yet. The point of v1 is *the loop works end-to-end on a real phone.*

## Build phases

Each phase ends with something working on your phone. We don't move on until that's true.

### Phase 0 — Skeleton (1 session)
- Initialize SvelteKit project, set adapter-static, add PWA plugin.
- Manifest + icons (192, 512, 180 for iOS).
- Deploy to Cloudflare Pages.
- **Done when:** You install the empty app to your iPhone home screen and it opens.

### Phase 1 — Camera capture (1 session)
- `/record` route. Permission flow. Live `<video>` preview.
- "Record" / "Stop" buttons. Save the blob to memory (not yet IndexedDB).
- Playback slot below.
- **Done when:** You record a swing on your phone and play it back.

### Phase 2 — Pose overlay (1–2 sessions)
- Load MediaPipe PoseLandmarker.
- During playback, run pose detection per frame and draw the skeleton on a `<canvas>` over the video.
- **Done when:** You see your skeleton tracking your swing during playback.

### Phase 3 — Auto-trim to swing window (1 session)
- Compute per-frame "motion energy" from keypoint velocities.
- Find peak motion window → expand back to address (low-motion) → forward to finish.
- Trim playback to that window.
- **Done when:** Long clips auto-trim to the actual swing.

### Phase 4 — Fault detection (2 sessions)
- **Early extension:** distance from hip midpoint to ball-axis decreases between transition and impact. Verdict: ok / mild / strong.
- **Over-the-top:** angle of shaft (proxied by lead-wrist→lead-shoulder line) at downswing vs. takeaway. Verdict: ok / out-to-in.
- **Head movement:** horizontal travel of head centroid through swing, expressed in pixels then normalized by shoulder width. Verdict: ok / moderate / large.
- Display verdicts as green/red cards under the video.
- **Done when:** Three verdicts appear for each saved swing.

### Phase 5 — History + persistence (1 session)
- Dexie schema: `swings` table with `id`, `recordedAt`, `videoBlob`, `metrics` (object), `verdicts`.
- `/history` route: list of past swings with thumbnail, date, verdict summary.
- Click a swing → playback + analysis view.
- **Done when:** Closing and reopening the app shows your past swings.

### Phase 6 — Polish for daily use (1 session)
- Install prompt UX (iOS Share → Add to Home Screen instructions).
- "Switch camera" button.
- Helpful error messages for camera permission denial.
- Service-worker update toast.

**Total estimated effort: ~7–9 working sessions** of Claude Code time, paced to whatever rhythm the owner wants.

## What gets added next (locked-in roadmap)

The point of building the shell well is that these slot in without rewrites:

### v2 — Launch monitor CSV import + dispersion (highest leverage for *this* user)

The user practices mostly on an indoor simulator and has launch-monitor CSV exports available (TrackMan / GSPro / Foresight / SkyTrak depending on the bay). v2 turns those CSVs into useful insights.

- **CSV upload route** that detects the format by column headers. Support TrackMan Range, TrackMan Pro, GSPro, Foresight FSX, SkyTrak as the most common exports. Show a preview of parsed columns before saving.
- **Sessions list** — each upload = one session, tied to a date, club mix, and shot count.
- **Per-club distance & dispersion** — mean carry, standard deviation, dispersion ellipse plot (carry vs side). 5-iron-only sessions get this immediately; multi-club sessions get a club-picker.
- **Consistency trend** — stdev of carry and stdev of side per club, charted session-over-session. The "am I getting more consistent?" question.
- **Flyer / chunk detection** — flag shots >1.5 stdev from session mean; let the user mark them as "ignore" or "study."
- **Smash factor / strike quality** chart — proxy for centeredness of contact.
- **Spin & launch profile** if those columns are present in the CSV — flag balloon-launch or knuckleball patterns.
- If Pro-tier columns are present (club path, face angle, attack angle): show **club-path vs face-angle** scatter — the diagnostic that explains *why* shots went where they did.

### v3 — Shot logging (sim virtual rounds + real on-course) + Strokes Gained

- **Tap-to-log shot tracking** for a round in progress. Lie + start distance + end position.
- **Round mode** distinguishes between **virtual rounds played on the sim** (first-class) and **real on-course rounds** (uses `navigator.geolocation`). Same data shape.
- **Strokes Gained** vs amateur baseline (Broadie's amateur lookup table), broken into OTT / APP / ARG / Putting.
- **Proximity-by-distance-bucket** dashboard.
- **Three-putt + penalty-stroke counters** surfaced prominently.
- **Round debrief** — one sentence in plain English: "Lost 2.4 strokes today on approaches 125–175."

### v4 — Coaching layer

- **More fault detectors** (reverse spine, chicken wing, casting) on top of v1's three.
- **Drill library** mapped to detected weaknesses. Per `golf-improvement-research.md` § 4. Each fault → 2-3 drill videos.
- **AI-written feedback** — Cloudflare Worker → Claude Haiku 4.5. Takes the swing's metrics + the user's recent CSV trends + drill choices and writes 2–3 sentences of plain-English coaching. ~$0.002/call.
- **DECADE-style target helper** — hole map + personal dispersion cone (built from v2's per-club data) + suggested aim point.
- **Pro side-by-side** — load reference swing for the same view, align by detected impact frame.
- **Cloud sync via Supabase** if the iOS 7-day eviction issue starts to bite, or if the user wants the app on a second device.

## Risk register

The things most likely to slow us down, and the mitigation in advance:

| Risk | Mitigation |
|---|---|
| iOS Safari quirk eats a day | Test on the real phone after every phase, not just at the end |
| MediaPipe runs slow on older iPhone | Start with the Lite model; if needed, fall back to MoveNet Lightning |
| IndexedDB videos eat storage | Cap saved swings at 50 in v1; auto-delete oldest |
| Owner's iPhone Safari evicts PWA data after 7 days inactivity | Add Supabase sync earlier than originally planned if this becomes a real annoyance |
| Fault detection accuracy is worse than expected | Show *severity buckets*, not precise degrees — the credibility lesson from the Sparrow research |
| Camera permission dialog issues | Build a clear instructional fallback page early |

## How we'll measure "is this working for me?"

Every 2 weeks of use, ask:

1. Have I recorded a swing this week?
2. Was the auto-detected fault correct (based on my own judgment / a coach's feedback if available)?
3. Did the app load fast enough that I actually used it?
4. Has my SparrowScore equivalent (composite of fault severities) moved in the right direction?

If the answers trend yes-yes-yes-yes, we add a feature. If any trend no, we fix that before adding anything.

## Next concrete action

When the owner is ready to start building, the first Claude session begins with **Phase 0 — Skeleton**. The agent should:

1. Read this file, `PROJECT.md`, and `tech-stack-research.md` first.
2. Run `npm create svelte@latest .` (or appropriate scaffolding command in 2026) inside `/home/acton/golf`.
3. Walk the owner through one decision at a time (TypeScript yes/no, etc.) with a recommended default.
4. End the session by deploying to Cloudflare Pages and verifying install on the owner's phone.
