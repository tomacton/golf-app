# Tech Stack Research: Golf PWA

*Last updated: 2026-05-22. Free-tier numbers change — verify the linked pricing pages before relying on them for budgeting.*

## Recommendation for this project

Build with **SvelteKit 2 (Svelte 5) in static-adapter mode**, deploy on **Cloudflare Pages**, store everything **local-first in IndexedDB via Dexie 4**, and add **Supabase** only when cross-device sync is actually needed. Use **MediaPipe Tasks Vision (PoseLandmarker, Lite model)** for on-device swing analysis — it runs in WebAssembly/WebGPU in the browser with no server cost. For LLM-powered swing feedback, route through a single **Cloudflare Worker** that holds the Anthropic API key and calls **Claude Haiku 4.5** (cheap and fast). This stack stays at literal $0/month until you outgrow generous free tiers, has the fewest moving parts for Claude Code to maintain, avoids Next.js's server-rendering complexity, and avoids Vercel's bandwidth meter (Cloudflare Pages has no bandwidth cap on the free tier). Total expected cost at hobbyist scale: **$0/month for hosting + storage + ~$0.10–$2/month for LLM calls if used moderately**, plus ~$10–15/year for a custom domain if you want one.

---

## 1. Framework choice

Three realistic contenders for a non-coder + Claude-Code workflow. The non-negotiables are: minimal config, file-based routing, ships static HTML/JS by default, and a small "concept surface" so Claude doesn't have to load 40 pages of docs into context to make a change.

### SvelteKit 2 (Svelte 5) — **recommended**
- **What it is:** A meta-framework over Svelte. Use `@sveltejs/adapter-static` to produce a pure SPA/PWA with no server runtime.
- **Why it wins here:**
  - Components are single `.svelte` files: HTML, CSS, JS in one place. Very readable for a non-coder skimming a PR.
  - Reactivity is a language feature (`$state`, `$derived` in Svelte 5 runes), not a hook-rules puzzle. Fewer foot-guns for an LLM to step on.
  - Tiny output bundles (often <50KB gzipped for a small app), which matters on phones.
  - File-based routing in `src/routes/`. Easy to navigate.
- **Versions:** SvelteKit 2.x, Svelte 5.x, Vite 5/6. Start with `npm create svelte@latest`.
- **Trade-off:** Smaller ecosystem than React. Fewer prebuilt component libraries. For a custom golf app this barely matters; for an admin dashboard it would.
- Docs: <https://kit.svelte.dev/docs>

### Astro 4/5 with Svelte or vanilla islands
- **What it is:** Ships zero JS by default; hydrates interactive components only where you mark them.
- **Why consider it:** Even simpler mental model than SvelteKit if most of the app is content. Excellent for landing pages.
- **Why not for this project:** The golf app is *all* interactive (camera, charts, GPS). Astro's "islands" advantage disappears when every route is an island. Adds an extra layer (Astro + Svelte) for no win.

### Next.js 15 (React) — **not recommended here**
- **Strengths:** Biggest ecosystem. Most third-party tutorials. Claude Code has seen the most Next.js code in training, which can be a real advantage.
- **Why it loses for this use case:**
  - Server Components vs. Client Components is a constant landmine. A non-coder reading a diff cannot easily tell which is which, and Claude routinely mixes them up across sessions.
  - The App Router has many overlapping concepts (layouts, parallel routes, intercepting routes, route handlers, server actions). Lots of surface area to break.
  - Optimal Next.js deploy is Vercel, which has a 100 GB/month bandwidth cap on Hobby — fine until a video goes viral.
  - PWA support requires a community plugin (`@ducanh2912/next-pwa` or `serwist`) — works fine but is extra config.

### Honorable mention: Vite + vanilla JS / lit-html
- **Strengths:** Absolute minimum dependencies. Zero framework knowledge needed.
- **Why not:** You will reinvent routing and state management within a month. Claude can do it, but the resulting code becomes idiosyncratic and harder to onboard a future session into. SvelteKit gives you the same simplicity *with* guardrails.

**Decision:** SvelteKit static-mode. Falls back to "just files" if anything goes sideways, and Claude Code is fluent in it.

---

## 2. PWA basics — what's actually required

To be installable to an iPhone/Android home screen you need exactly three things:

1. **HTTPS** — any modern host gives this free (Cloudflare Pages, Vercel, Netlify, GitHub Pages all do).
2. **A web app manifest** (`/manifest.webmanifest` or `manifest.json`) with at minimum:
   - `name`, `short_name`
   - `start_url`, `scope`
   - `display: "standalone"`
   - `icons`: must include at least a 192x192 and a 512x512 PNG. **iOS additionally needs an `apple-touch-icon` link tag (180x180) in your HTML `<head>`** — it ignores some manifest icons.
   - `theme_color`, `background_color`
3. **A service worker** registered at the site root. For installability the spec only requires a fetch handler exists; it can be minimal.

That is the **entire requirement**. Everything else (offline caching, push notifications, background sync) is optional.

**Boilerplate vs. real work:**
- Manifest + icons + SW skeleton = **boilerplate**, ~30 minutes. Use `@vite-pwa/sveltekit` (current major: 0.6.x) and it handles the manifest, SW registration, and `workbox` caching strategies. <https://vite-pwa-org.netlify.app/frameworks/sveltekit.html>
- **Real work** = deciding what to cache offline, handling app updates without confusing users, and storage management (see Gotchas below).

iOS specifics worth knowing:
- iOS Safari supports PWA install ("Add to Home Screen") but does *not* show an install prompt — the user must do it manually from the share sheet. Plan UI accordingly.
- As of iOS 17.4+, installed PWAs run in their own WebKit instance with their own storage. Pre-17.4 they shared Safari storage. Either way: **storage is not guaranteed permanent** (see §9).
- iOS PWAs cannot receive push notifications unless installed to home screen (16.4+).

---

## 3. Camera/video for swing recording

### What works
- `navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })` — works on iOS Safari 14+ and Chrome Android. <https://developer.mozilla.org/docs/Web/API/MediaDevices/getUserMedia>
- `MediaRecorder` for capturing clips — supported on both, but **codecs differ**:
  - Android Chrome: `video/webm;codecs=vp9` or `vp8`
  - iOS Safari: `video/mp4;codecs=avc1` only — **no WebM**. Check `MediaRecorder.isTypeSupported()` and branch.
- For frame-by-frame analysis (the actual swing-analysis use case), you usually want a `<video>` element and grab frames with `requestVideoFrameCallback()` rather than recording. Supported on both browsers as of 2023.

### Gotchas a non-coder hits
- **The camera only starts after a user gesture.** A tap on a button — not on page load. Claude tends to write code that calls `getUserMedia` in `onMount`; iOS will silently reject it.
- **HTTPS required.** Camera APIs only work on `https://` (or `http://localhost`). This is also why GitHub Pages/Cloudflare Pages "just work" — they're HTTPS by default.
- **iOS Safari requires `playsinline` on the `<video>` tag**, otherwise it tries to fullscreen the playback and breaks frame extraction.
- **Frame rate caps.** iOS will throttle to ~30 fps in the background tab. For swing analysis (typically 60–240 fps phone capture), you usually want to record at the device's native rate using `getUserMedia` constraints (`frameRate: { ideal: 60 }`) and acknowledge that 240 fps slow-mo is **not** accessible from the browser — only the native iOS Camera app gets that. This is the single biggest limitation versus a native app.
- **Front vs. rear camera selection** on iOS sometimes ignores `facingMode` and picks whichever was last used. Provide an explicit "switch camera" button.
- **Memory.** A 10-second 1080p clip is ~20–40 MB in the browser. Don't hold many at once.

---

## 4. On-device pose detection

Three serious options. All run client-side, no per-call cost.

### MediaPipe Tasks Vision — PoseLandmarker — **recommended**
- Google's current pose API, replacing the older MediaPipe Pose Solutions API (deprecated 2023).
- Package: `@mediapipe/tasks-vision` (current 0.10.x).
- Models: **Lite (~3 MB), Full (~6 MB), Heavy (~26 MB)** — outputs 33 3D landmarks + segmentation mask.
- Runs via WASM + WebGL or **WebGPU** where available (Chrome Android, Safari 17.4+ on iOS partial).
- Real-world performance: 30–60 fps on a mid-range Android, 20–40 fps on iPhone 12+. Lite is the right starting point.
- Docs: <https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker>

### TensorFlow.js + MoveNet
- Package: `@tensorflow-models/pose-detection` with the MoveNet model.
- MoveNet Lightning is genuinely fast (~50 fps on phones). Thunder is more accurate but slower.
- Trade-off: 17 keypoints only (no hands/face), 2D only. Adequate for swing-tempo and basic posture metrics. **Not** adequate if you want club-face proxies via wrist orientation.
- Heavier runtime (`@tensorflow/tfjs` is ~1 MB before models load).

### Others worth knowing
- **MoveNet MultiPose** — multi-person; unnecessary for one golfer.
- **MediaPipe Holistic** — pose + hands + face. Heavy, likely overkill.
- **YOLOv8-pose via ONNX Runtime Web** — accurate but the WASM/WebGPU bundle is large and the licensing (AGPL for YOLOv8) is awkward for any commercial future.

**Decision:** MediaPipe PoseLandmarker (Lite) → upgrade to Full only if accuracy is insufficient. 33 landmarks plus segmentation gives Claude enough data to compute swing-plane angles, hip rotation, and tempo without bolting on another model.

---

## 5. Storage

### Start: pure local-first with IndexedDB
- Wrap IndexedDB with **Dexie 4** (`dexie` npm package, current 4.x). It hides the rough IndexedDB API behind a tiny, promise-based query layer. <https://dexie.org/>
- Store practice sessions, drills, stats, *and* recorded video Blobs locally. A typical iPhone has gigabytes free; a hobbyist will not hit limits for years of swing videos.
- Cost: **$0**, forever, no account required.

### When sync becomes necessary
Three credible free options, ranked for this use case:

1. **Supabase** (free tier as of 2026: 500 MB Postgres, 1 GB file storage, 5 GB egress, 50 K monthly auth users; projects pause after 1 week of inactivity on free tier — auto-resume on first request). Postgres + Row-Level Security + JS SDK + magic-link auth in one package. <https://supabase.com/pricing>
2. **Cloudflare D1 + R2 + Workers + Access** — pay-as-you-go but free tier is generous: D1 free includes 5 GB storage and 5M reads/day; R2 has 10 GB storage and zero egress fees (huge for video). More assembly required than Supabase.
3. **Firebase (Spark plan)** — Firestore 1 GB storage, 50K reads/day, 20K writes/day, 10 GB hosting bandwidth/month, 5 GB Cloud Storage. The 50K reads/day limit bites quickly if you fetch lists frequently. Vendor lock-in is real.
4. **PocketBase** — single Go binary, SQLite, brilliant for self-hosting on a $5/mo VPS. **Not $0** unless you have spare hardware, and asks the user to manage a server. Skip unless self-hosting is desired.

**Decision:** Build local-first with Dexie from day one. Add Supabase only when sync is a real user request — the migration is straightforward because each Dexie table maps to one Postgres table.

---

## 6. Hosting

Snapshot of relevant free-tier limits (verify before relying on them — these change):

| Provider | Bandwidth/mo | Builds | Sites | Notes |
|---|---|---|---|---|
| **Cloudflare Pages** | Unlimited | 500/mo | Unlimited | No bandwidth cap is the killer feature. 25 MiB file size limit per asset. |
| **Vercel Hobby** | 100 GB "Fast Data Transfer" | 6,000 build min/mo, 100 deploys/day | 200 projects | 100 MB upload limit via CLI. Non-commercial use only — read the ToS. |
| **Netlify Free** | 100 GB/mo | 300 build min/mo | Unlimited | Bandwidth cap; build minutes are tighter than Vercel. |
| **GitHub Pages** | "Soft" 100 GB/mo | n/a (Actions) | 1 site/repo | Static only, no functions. Custom domain works but no edge functions = need a separate worker. |

Sources: Vercel limits page <https://vercel.com/docs/limits> (fetched 2026-05-22); Cloudflare Pages limits <https://developers.cloudflare.com/pages/platform/limits/>.

**Custom domain cost:** ~$10–15/year for a `.com` from Cloudflare Registrar (at-cost pricing, no markup) or Porkbun. All four hosts above attach a custom domain on the free tier with one-click HTTPS.

**Decision:** **Cloudflare Pages**. The unmetered bandwidth matters specifically because: (a) golf swing videos are heavy if you ever serve them from origin, and (b) the same account gives you Workers (for the LLM proxy in §7), R2 (for video sync in §5), and D1 (for SQL sync) under one roof. Vercel is a strong second choice if Claude Code has noticeably better Next.js muscle memory than SvelteKit for your sessions — but you chose SvelteKit, so this advantage evaporates.

---

## 7. LLM-powered swing feedback — cheapest pattern

You **cannot** call the Anthropic API directly from the browser without leaking your API key. Anyone viewing the page source extracts the key in 10 seconds.

### The minimal proxy
- One **Cloudflare Worker** at e.g. `api.yourgolfapp.com/feedback`. ~40 lines of code. Receives the prompt + a small auth token (so randoms can't drain your account), forwards to Anthropic, streams the response back.
- Cost: Workers free tier = **100,000 requests/day**. Free.
- Add a per-IP rate limit (also built-in via Cloudflare's `RATE_LIMITING` binding) so a malicious user can't run up the bill.

### Model and pricing (snapshot 2026-05; verify at <https://www.anthropic.com/pricing>)
- **Claude Haiku 4.5** — fastest, cheapest. Around **$1 / 1M input tokens, $5 / 1M output tokens** (approximate — check current pricing). For a ~500-token prompt + 300-token response, that's roughly **$0.002 per swing feedback call**. 1,000 swing analyses/month = ~$2.
- **Claude Sonnet 4.7** — much better reasoning. ~$3/$15 per million. ~$0.006 per call. Use sparingly, e.g. for a weekly summary.

### Two cost-saving tricks
1. **Run pose detection client-side first**, then send only the *extracted metrics* (swing tempo ratio, shoulder turn degrees, hip sway px, etc.) to the LLM — not the raw video. Tokens stay tiny.
2. **Use prompt caching** (Anthropic supports it via the `cache_control` field). Cache the system prompt and golf-instruction context; only the user's swing metrics change per call. Cuts input cost dramatically.

Alternative free model: **Google Gemini API** has a free tier (rate-limited) on `gemini-2.0-flash` — viable for prototyping but Anthropic's reasoning is noticeably better for coaching-style output.

---

## 8. Project structure

A layout that scales from 1 file to 100 without renaming, and that Claude can navigate by following file names alone:

```
golf/
├── README.md                          # 1-paragraph what + how to run
├── CLAUDE.md                          # context for future Claude sessions
├── docs/
│   ├── tech-stack-research.md         # this file
│   └── decisions/                     # one short .md per architectural choice
├── src/
│   ├── app.html                       # SvelteKit shell
│   ├── app.css                        # global styles (Tailwind base if used)
│   ├── lib/
│   │   ├── components/                # reusable .svelte components
│   │   ├── db/
│   │   │   ├── schema.ts              # Dexie tables
│   │   │   └── queries.ts             # all reads/writes go through here
│   │   ├── pose/
│   │   │   ├── detector.ts            # MediaPipe wrapper
│   │   │   └── metrics.ts             # tempo, plane angle, etc.
│   │   ├── camera/
│   │   │   └── capture.ts             # getUserMedia + MediaRecorder logic
│   │   ├── gps/
│   │   │   └── tracker.ts             # course tracking
│   │   └── api/
│   │       └── feedback.ts            # client for the Worker proxy
│   └── routes/
│       ├── +layout.svelte             # nav, install prompt
│       ├── +page.svelte               # home/dashboard
│       ├── record/+page.svelte        # swing capture
│       ├── practice/+page.svelte      # log drills
│       ├── round/+page.svelte         # on-course stats
│       └── history/+page.svelte       # review past sessions
├── static/
│   ├── manifest.webmanifest
│   ├── icons/                         # 192, 512, 180 (apple-touch)
│   └── models/                        # MediaPipe .task files (or use CDN)
├── worker/                            # Cloudflare Worker (LLM proxy)
│   ├── src/index.ts
│   └── wrangler.toml
├── svelte.config.js
├── vite.config.ts
└── package.json
```

**Why this layout works for Claude Code:**
- Every "subject" (camera, pose, db, gps, api) is one folder. When the user says "the GPS thing is broken," Claude opens one folder.
- `lib/db/queries.ts` as the single chokepoint for data access means schema changes touch one file.
- `CLAUDE.md` at root is read on every session start; keep it short (under 200 lines) and link to deeper docs.

---

## 9. Gotchas and sharp edges

These are the things that *will* burn time. Calling them out so Claude can defend against them:

1. **iOS PWA storage eviction.** Safari/WebKit will purge IndexedDB and Cache Storage from sites the user hasn't visited in **7 days** if storage pressure is high. Mitigations:
   - Call `navigator.storage.persist()` after the user does something committing (saves a session) — iOS doesn't honor this as strongly as Chrome, but it doesn't hurt.
   - Encourage installing to home screen; storage for installed PWAs is treated more durably.
   - **Always have a sync option** for anything the user would be upset to lose. This is the strongest argument for adding Supabase early once the app graduates from "toy."

2. **Service worker update UX.** Without explicit handling, users see stale versions for a session. Use `@vite-pwa/sveltekit`'s `registerSW({ onNeedRefresh })` to show a "New version available" toast and `skipWaiting()` on click.

3. **Camera permission denial is permanent until the user changes Settings.** No "ask again" prompt on iOS. Detect `NotAllowedError` and show a clear instructional page with screenshots of the iOS Settings path.

4. **MediaPipe model download size.** Even Lite (~3 MB) plus the WASM runtime (~1 MB) is a >4 MB first-load tax. Defer it: don't load on home page, only on `/record`. Cache aggressively via the service worker.

5. **HMR + service worker = stale code in dev.** Disable the SW in dev mode (`vite-pwa` config: `devOptions: { enabled: false }`). Re-enable it for `preview` builds.

6. **CORS on the LLM proxy.** Restrict the Worker's CORS to your domain only, or someone uses your endpoint for free. Add a simple shared-secret header that the SvelteKit build injects from an env var.

7. **Deploy pipelines.** Connect the GitHub repo to Cloudflare Pages with the framework preset "SvelteKit." Build command: `npm run build`. Output: `.svelte-kit/cloudflare` (if using `adapter-cloudflare`) or `build/` (if `adapter-static`). For pure static, use `adapter-static` — simpler.

8. **iOS Safari quietly drops `localStorage` and IndexedDB in private tabs.** Detect and warn.

9. **GPS in the background.** The Geolocation API does **not** run with the screen off in a browser. For on-course shot tracking, the round must be in the foreground, or you accept gaps. This is the second non-trivial limitation versus a native app (the first being slow-mo capture).

10. **Claude Code session-to-session drift.** Without `CLAUDE.md`, each new session re-derives conventions and often re-introduces patterns you've already rejected. Keep `CLAUDE.md` and `docs/decisions/` updated whenever an architectural choice is made.

11. **Don't add Tailwind/shadcn/auth/ORMs/test frameworks until they hurt to not have.** Every dep is a thing Claude must understand and the non-coder must trust. Plain CSS + Dexie + fetch + SvelteKit covers 90% of this app.

---

## Cost summary at three scales

| Scale | Hosting | Storage | LLM | Domain | Total |
|---|---|---|---|---|---|
| **Personal use (you only)** | $0 (CF Pages) | $0 (IndexedDB) | $0–$2/mo (Haiku) | $0 or $12/yr | **$0–$3/mo** |
| **~100 active users** | $0 (still under CF limits) | $0 (Supabase free) | $5–$20/mo (Haiku, prompt cache) | $12/yr | **$5–$22/mo** |
| **~10,000 active users** | $0–$20 (CF) | $25/mo (Supabase Pro) | $50–$200/mo | $12/yr | **$75–$250/mo** |

The big variable at scale is LLM usage. If every active user requests 5 feedback calls/day at Haiku rates, 10,000 users is ~$300/mo. Mitigate by caching common feedback patterns and reserving LLM calls for explicit user-initiated "analyze my swing."

---

## Quick start checklist for the first Claude session

1. `npm create svelte@latest golf` → Skeleton project, TypeScript yes, ESLint no, Prettier yes.
2. `npm i -D @sveltejs/adapter-static @vite-pwa/sveltekit` and switch `svelte.config.js` to `adapter-static`.
3. `npm i dexie @mediapipe/tasks-vision`
4. Drop a minimal `manifest.webmanifest` and a 192/512/180 icon set in `static/`.
5. Push to GitHub, connect Cloudflare Pages, deploy.
6. Add `CLAUDE.md` and a one-line `docs/decisions/0001-svelte-kit.md`.
7. Build the `/record` route first (camera + MediaPipe), because it's the hardest and the rest is forms.

Total time to "installable on a phone, shows live pose landmarks over my swing": **one afternoon** with Claude Code.
