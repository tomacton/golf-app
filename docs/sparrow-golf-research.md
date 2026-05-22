# Sparrow Golf — Product Research

*Compiled 2026-05-22 from Sparrow's website, App Store listing, and a third-party comparison review. Sources cited inline.*

## 1. Product overview

**Sparrow Golf** is an iOS-only AI swing-analysis app made by **Sparrow** (sparrowup.com), led by CEO Joe Chin and co-founder Todd Eaglin. The company positions itself as a generative-AI-for-physical-skills platform; golf is their first launched product, with soccer "coming soon." [sparrowup.com](https://www.sparrowup.com/), [sparrowup.com/golf](https://www.sparrowup.com/golf)

- **Platforms:** iPhone (App Store, ID 1526670395). No Android listed. [App Store](https://apps.apple.com/us/app/sparrow-golf/id1526670395)
- **Scale claims (their own):** 250k+ users, 1M+ swings analyzed, "87% of users improve."
- **Store metrics:** **4.6 / 5 stars, 3,500+ ratings.** [App Store reviews](https://apps.apple.com/us/app/id1526670395?see-all=reviews)
- **Pricing:** Free download with 7-day trial. Pro subscriptions **$14.99–$29.99/month** or **$71.99–$179.99/year** depending on tier. Family Sharing supported.
- **Target user:** Any-skill golfer who can't afford or doesn't want regular in-person lessons.

## 2. How the swing analysis works

This is the part we care about most. Synthesized from their site and the third-party comparison: [Course Review & Journal — SportsBox AI vs Sparrow Golf](https://coursereviewandjournal.com/2024/07/26/product-review-sportsbox-ai-golf-app-vs-sparrow-golf-app-2/).

### Capture flow

- **Automatic swing detection.** You prop the phone up, address the ball, swing — the app figures out when the swing happened and clips it. No tap-to-record.
- **Range mode** detects up to **5 consecutive swings** without re-arming.
- **Video upload** (added in a 2025 update): you can analyze a swing recorded in another app, removing the prop-it-up requirement when reviewing old footage.
- Camera angle is implicitly "face-on or down-the-line"; the app warns or rejects if framing is off (per user reviews).

### What's analyzed

- **"More than 30 points of analysis depending on your swing type"** (their copy — not enumerated publicly).
- Known metrics surfaced in reviews and product copy: shoulder rotation degrees, trail-leg loading, shaft lean at impact, swing tempo, and implied club-face/path inferences.
- **Visual presentation:** green (good) / red (bad) indicators on each measured point. Side-by-side comparison with a PGA pro performing the same motion.
- **"SparrowScore":** a single composite score for each swing — meant to be the "did I get better?" headline number that updates over time.
- **AI-driven, not human-reviewed.** Sparrow's CEO and CTO statements emphasize on-device pose estimation + generative-AI feedback; there's no coach-in-the-loop.

### Coaching / improvement

- **50+ drills**, "personalized to your swing." Each drill is a video (often the pro doing it) tied to a specific fault.
- Recent (Nov 2025) version added: **personalized coaching plans** with real-time exercises, pro fixes, custom lesson plans, and gamification (challenges, milestones).
- ML models in late-2025 update are reportedly **75% faster than the previous generation.**

### Progress tracking

- All past swings are stored; you scroll back and watch your old swings.
- **SparrowScore trend** over time is the primary progress visualization.

## 3. User sentiment — what people praise and complain about

From App Store reviews and the comparison review.

### Praise

- **"Worth $500 for what this did to my swing"** — a representative top review crediting the app with finding two setup issues the user had missed for six months.
- **Intuitive UI**, simple green/red visual feedback.
- **PGA pro side-by-side** is the most-cited "wow" feature.
- Drills feel **personalized** rather than a generic library.
- Auto-detect-the-swing capture is **lower friction** than "press record, swing, press stop."

### Complaints (these are the lessons for us)

- **Inconsistency** — same swing scoring "a 10 and a 5 on different occasions" due to misalignment with the pro-comparison frame. Reported by a 5-handicap reviewer; concerning because higher-handicap users won't notice and will trust wrong scores.
- **Measurement inaccuracies** flagged in the SportsBox comparison:
  - Shoulder rotation under-read (reading <90° when actual >100°)
  - Trail-leg loading frame mis-picked (analyzed frames *after* weight had already shifted)
  - Shaft-lean readings contradicted by the very pro-comparison footage shown alongside
- **Pre-swing waggle confuses frame capture** — the auto-detect picks up the waggle and clips wrong.
- **No zoom on framing** — if you set up at the wrong distance, you re-record.
- **Battery drain is heavy** — running camera + pose detection live cooks the phone.

### What that tells us

Sparrow's "automatic, instant, score-it-all" approach is the right hook *but* the score-anything-instantly framing creates a credibility problem: when one metric is wrong, the user loses trust in the whole stack. Lesson: **be conservative about what to claim a number for**, and lean on visual overlays + named faults rather than precise-looking degrees that may be wrong by 10°.

## 4. Comparable apps

Quick orientation for what's out there:

- **V1 Golf, Hudl Technique, OnForm** — manual-record + draw-lines apps, often used by human coaches sending feedback async. Older interaction model, no AI scoring.
- **SportsBox AI** — full 3D biomechanical model from a single phone camera. Far more detailed numbers (hip sway, sternum tilt, etc.) but requires careful framing, costs more, and looks more like coaching software. The comparison review preferred its accuracy but acknowledged Sparrow is friendlier for beginners.
- **Arccos / Shot Scope** — *not* swing-analysis; they track on-course shots via sensors/tags. Adjacent space.
- **18Birdies, Golf Pro AI** — broader-scope apps with light AI tips, scorecard, GPS. Not focused on swing analysis depth.
- **Zepp Golf** — discontinued in most markets; was sensor-based, not video.

Sparrow's niche: **video swing analysis with instant automated feedback, no coach, no sensors, no manual recording.** That niche is what we want to occupy in our v1.

## 5. What the PWA can plausibly deliver

This is the bridge to our tech-stack research. Reality check on each Sparrow feature for a MediaPipe-based PWA:

| Sparrow feature | PWA feasibility | Notes |
|---|---|---|
| Tap-to-record swing video | Easy | `getUserMedia` + `MediaRecorder` |
| **Auto-detect swing in clip** | Medium | Motion-energy heuristic on pose-keypoint frames is workable — pick the window of peak hip+shoulder motion. |
| **Live auto-detect during continuous recording** | Hard | Possible but RAM-heavy in a browser; defer to v2. |
| 33-point pose overlay | Easy | MediaPipe PoseLandmarker Lite, 30-60 fps on phone. |
| Specific angle measurements (shoulder turn, hip rotation, shaft lean) | Medium | Computable from landmarks, but accuracy is roughly what Sparrow has — meaning sometimes wrong by 5-10°. We should display ranges, not single decimals. |
| Side-by-side pro comparison | Medium | Need a small library of reference pro swings (licensing matters if commercial — fine for personal use). |
| Green/red visual feedback per fault | Easy | Once we detect a fault, color the overlay. |
| Single "SparrowScore"-style composite | Easy (but careful) | Computing it is easy; making it *trustworthy* is the hard part — Sparrow's biggest complaint. |
| Personalized drills library | Easy | Static video library + simple fault→drill mapping. |
| Progress over time | Easy | IndexedDB stores every swing + computed metrics; chart from there. |
| Generative-AI written feedback | Easy | Cloudflare Worker → Claude Haiku. Cheap. |

The conclusion: **80% of Sparrow's value is achievable in a PWA.** The 20% gap is the truly live "swing while filming and it detects in real time" loop. We can get most of that with a record-then-detect flow that auto-trims to the swing window.

## 6. Features to borrow for v1 — prioritized

In order of (user value × ease of build):

1. **Tap to start, swing, app finds the swing in the clip and trims it.** Don't make the user mark in/out points. Use pose-keypoint motion energy to identify the swing window. *This is the single biggest UX advantage Sparrow has over V1 Golf et al.*
2. **Pose overlay + named-fault detection on the trimmed swing.** Start with the five faults from `golf-improvement-research.md` (early extension, over-the-top, reverse spine, chicken wing, casting) + head-stability. Each fault gets a green/red verdict and a short text explanation.
3. **One-finding-per-swing debrief.** Don't dump 30 metrics. Pick the worst-scoring fault and surface that. Mirrors what works in Arccos round debriefs (per golf research).
4. **Drill library entry per fault.** 2–3 drills per fault, drawn from the 26-drill list in `golf-improvement-research.md`. Tap fault → tap drill → see how to do it.
5. **Side-by-side comparison with a "good" reference swing** for the same view (face-on or DTL). Even a single pro reference per view is enough to start; multiple ages/styles later.
6. **Swing library with progress chart.** Each swing saved with its fault verdicts and one composite score. Trend chart of "early-extension severity over 30 days."
7. **Plain-English AI feedback** (Cloudflare Worker → Haiku) that takes the *numeric metrics* and writes 2-3 sentences of human-sounding coaching. Token cost ~$0.002/call.

## 7. Features to skip (or defer to v3+)

- **Real-time during-swing detection** while filming. Big complexity, marginal UX win over auto-trim. Defer.
- **"Number-on-everything" SparrowScore-style precision.** Show *ranges* and *severity buckets* ("mild / moderate / severe early extension"), not bogus-precise decimals. Sparrow's biggest credibility problem.
- **Full 3D biomechanical model** (SportsBox-style). Out of scope for a PWA, and the value is debatable for amateurs.
- **Live audio coaching / voice commands.** Cool-sounding, low actual value, expensive to build well.
- **Subscription paywall + gamification.** This is a personal app; skip until/unless others want it.

## 8. The single most important lesson

**Trust beats coverage.** Sparrow tries to measure 30 things and visibly gets several wrong, which costs them credibility on the things they get right. We should ship with fewer measured items, each well-validated, and only add more once the foundation is trusted. Two well-detected faults beat ten dubious ones.

---

**Sources:**
- [Sparrow Golf — App Store listing](https://apps.apple.com/us/app/sparrow-golf/id1526670395)
- [Sparrow Golf — product page](https://www.sparrowup.com/golf)
- [Sparrow Up — company / tech page](https://www.sparrowup.com/)
- [Course Review & Journal — SportsBox AI vs Sparrow Golf comparison (2024-07-26)](https://coursereviewandjournal.com/2024/07/26/product-review-sportsbox-ai-golf-app-vs-sparrow-golf-app-2/)
- [App Store ratings & reviews page](https://apps.apple.com/us/app/id1526670395?see-all=reviews)
- GolfWRX forum thread on Sparrow (403, not fetched): <https://forums.golfwrx.com/topic/1865539-sparrow-golf-swing-analysis-app-with-artificial-intelligence/>
