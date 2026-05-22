# Golf Improvement Research

Evidence-based notes to inform the feature set of a personal golf improvement app. Audience: a 15–25 handicap recreational golfer. Sources are cited inline where specific; many findings are synthesized from widely-published material by Mark Broadie, Shot Scope, Arccos, Scott Fawcett (DECADE), GolfTec, and PGA-affiliated instructors.

> Note: WebSearch/WebFetch were unavailable when this was compiled, so figures below are drawn from the well-known published versions of these sources (Broadie 2014, Shot Scope's public handicap-comparison reports, Arccos blog posts, DECADE public materials, and standard motor-learning literature). Treat numeric claims as directional, not exact — and verify against the latest published data before shipping any UI that claims precision.

---

## 1. What Actually Moves the Needle for Amateur Golfers

The dominant data-driven finding, and the one that should anchor the app, is from Mark Broadie's *Every Shot Counts* (2014) and subsequent updates: **the long game (driving + approach shots) explains roughly two-thirds of the scoring difference between golfers**, and **approach shots alone are the single biggest scoring lever for almost every skill level**.

Broadie's headline breakdown of shot categories (PGA Tour vs. amateurs, by % of strokes-gained difference):

| Category | Approx. share of scoring difference |
|---|---|
| Approach shots (100–200 yds) | ~40% |
| Driving (tee shots on par 4/5) | ~25–28% |
| Short game (within ~100 yds, off the green) | ~17% |
| Putting | ~15% |

For a 15–25 handicap specifically, Shot Scope and Arccos aggregate data tell a consistent story:

- **Distance off the tee matters more than fairways hit.** A 15-hcp at 220 in light rough scores better than one at 180 in the fairway; the light-rough penalty is <0.3 strokes, the 40-yard gap is large.
- **Approach proximity is the single strongest scoring predictor**, especially 100–175 yds. Mid-handicaps average ~50–60 ft proximity from 150 yds vs. tour pros at ~25–30 ft.
- **Three-putt rate** (not putts-per-round) is the putting stat that correlates with handicap. Mid-handicaps three-putt 3–4x/round; single-digits <1x.
- **Penalty strokes are massively under-appreciated.** Mid-handicaps average 2–4 per round (Shot Scope); deleting these is often faster than skill improvement.
- **Short game matters less than amateurs think**, but the 50–100 yd wedge gap is real (~1–2 strokes/round vs. better players).

**Actionable headline:** spend practice time roughly proportional to scoring impact. Most amateurs invert this — they hit drivers and putt, and neglect 100–175 yd irons and wedges inside 100.

---

## 2. Strokes Gained Framework

### Concept

Strokes Gained (SG) compares a single shot's outcome to an expected baseline — the average number of strokes a benchmark golfer needs to hole out from the shot's starting position vs. its ending position.

```
SG(shot) = E[strokes from start position] - E[strokes from end position] - 1
```

The "-1" accounts for the stroke you just used. A positive value means the shot beat the baseline; negative means it lost ground.

Broadie published baseline tables for the PGA Tour (e.g., from the fairway at 150 yds the tour expects ~2.91 strokes to hole out). The app doesn't need ShotLink — Broadie himself published amateur baselines, and Shot Scope/Arccos provide handicap-bucketed equivalents that are good enough.

### Standard categories

- **SG: Off-the-Tee (OTT)** — tee shots on par 4/5
- **SG: Approach (APP)** — shots starting >100 yds from the green that aren't tee shots
- **SG: Around-the-Green (ARG)** — within ~30 yds, not on green
- **SG: Putting (P)** — on the green

### Minimum data for useful SG

Per shot: **start lie** (tee/fairway/rough/sand/green/recovery), **start distance** (GPS ±5 yds is fine), **end lie** (or holed), **end distance**. Club is optional. Phone GPS + tap-to-record is sufficient — Arccos uses sensors, Shot Scope uses tags, but manual tap works if it's <3 taps per shot.

For the **expected-strokes baseline**, ship a static lookup table indexed by (lie, distance bucket). Broadie published one in *Every Shot Counts*. Use an **amateur baseline** (15-hcp average), not tour — SG vs. peers is more motivating than SG vs. Scottie Scheffler.

Useful simplification: **proximity percentiles by distance bucket** as a proxy for SG: APP. Easier to understand, almost as informative.

---

## 3. Practice Methodology

### Block vs. random/interleaved

Motor-learning research (Shea & Morgan 1979; reviewed for golf in Brady 2008) is unambiguous: **blocked practice produces better in-session performance, but random/interleaved practice produces dramatically better retention and on-course transfer**. Hitting 20 7-irons in a row feels great and transfers poorly; rotating clubs and targets every 1–3 shots feels worse and transfers far better.

### Deliberate practice principles (Ericsson)

Specific goal per block, immediate feedback, just outside comfort zone, full attention, reflect/adjust between reps.

### Structured 60-minute range session

- 5 min dynamic warm-up (no balls)
- 10 min blocked warm-up — wedge, mid-iron, driver, ~5 balls each
- 20 min **skill block** — one drill with a measurable outcome (window, ladder, gate)
- 20 min **simulated round** — 9 imaginary holes, target + full routine + club change every shot, "score" each result
- 5 min cool-down on a favorite shot

### Common amateur range mistakes

Beating balls with one club at one flag; no targets; no pre-shot routine; juggling multiple swing thoughts; skipping the short-game area; only practicing what's already good.

---

## 4. Drills Library

Compiled from PGA-affiliated instructors (Adam Young, Andrew Rice), Me and My Golf, GolfTec, Pelz, and Stockton/Kenyon putting material.

**Driving**
1. **9-Shot Drill (Tiger).** Hit 9 combos: low/mid/high × draw/straight/fade. Builds face control.
2. **Tee-Gate.** Two tees just wider than driver head in front of ball. Fixes toe/heel misses.
3. **Step-Through Driver.** Step toward target on downswing. Fixes hanging back / slice.
4. **Speed Stick Protocol (MacKenzie).** Weighted overspeed + underspeed swings 3x/week. +5–8 mph in 6 weeks for most amateurs.

**Approach irons (100–200 yds — highest leverage)**
5. **Ladder Drill.** One wedge, hit to 50/60/70/80/90/100 yds. Builds wedge distance control.
6. **Window Drill.** Imaginary 15-ft window at target; score hit/miss. Builds honest dispersion awareness.
7. **Worst-Ball.** Two balls, play the worse one. Exposes real dispersion under tension.
8. **Strike-First Towel.** Towel 6 inches behind ball. Forces ball-first contact — fixes the fat-shot epidemic at this level.
9. **One-Club Range Session.** 7-iron only to 10 different targets/distances. Builds shaping and trajectory control.

**Wedges (inside 100)**
10. **Clock System (Pelz).** Backswing to 7:30 / 9:00 / 10:30 — three reproducible distances per wedge.
11. **Up-and-Down Game.** 10 balls from 30 yds; score up-and-down %. Track over time.
12. **Landing-Spot Towel.** Towel at landing spot (not finish). Trains release-and-roll.

**Short game / chipping**
13. **Coin Drill.** Coin at landing spot; hit it. Calibrates landing-spot vision.
14. **One-Handed Chips (lead hand).** Builds release, kills the scoopy flip.
15. **Bump-and-Run Ladder.** Same shot, clubs 8-iron through LW; learn rollout per club.

**Putting**
16. **Gate Drill.** Two tees just wider than putter head, 6 in front of ball. Square face at impact.
17. **3-6-9 Drill.** Three balls each at 3/6/9 ft; make all 9 to pass. Biggest putting fix for amateurs.
18. **Clock Drill.** 6 balls at 3 ft around the hole; make all in a row, reset on miss. Pressure builder.
19. **Lag Drill.** From 30+ ft, succeed = inside 3-ft circle. Kills three-putts.
20. **Eyes-Closed 6-Footer.** Hit, then guess where it went. Builds tempo/feel; diagnoses stroke vs. face issues.
21. **Coin-on-Putter (Stockton).** Balance coin on face during stroke. Reveals path/face issues.

**Mental / routine**
22. **Pre-Shot Routine Rep.** Same routine on every range ball. The routine *is* the drill.
23. **Commit Drill.** Say "committed" before each shot; step off if not. Stops uncommitted swings.
24. **3-Breath Reset.** After a bad shot, three breaths before the next. Trains shot independence.

**On-course / management**
25. **Three-Decision Drill.** Articulate target / club / shape *before* setup, every shot. Stops autopilot.
26. **No-Hero Round.** 18 holes aiming only at the fat side of every green. Proves DECADE's point — score almost always drops.

---

## 5. Stat Tracking — What Matters vs. What's Vanity

### High-signal stats (track these)

- **SG by category (OTT / APP / ARG / P)** — the gold standard
- **Proximity to hole, bucketed by distance** (50–100, 100–125, 125–150, 150–175, 175+) — strongest leading indicator for scoring
- **Three-putt count per round**
- **Penalty strokes per round** (OB, lost, water) — biggest hidden score destroyer
- **"Big number" frequency** — doubles or worse per round
- **Driving distance + dispersion** (not just fairway %)
- **Up-and-down %** from <30 yds
- **Sand save %** (if you play sandy courses; otherwise low sample size)

### Lower-signal / vanity stats

- **FIR in isolation** — misleading without distance (200-yd fairway-finder ≠ better than 240-yd light-rougher).
- **Putts per round** — distorted by GIR (28 putts after 4 GIR is just chipping close).
- **GIR in isolation** — useful, but proximity is strictly more informative.
- **Average score by par** — interesting, not actionable.

### Heuristic for the app

Per round, surface a one-line attribution: *"+3.1 vs. your average came from approaches 125–175 yds (avg proximity 78 ft vs. your usual 52 ft)."* More actionable than any dashboard.

---

## 6. Mental Game & Course Management

### DECADE (Scott Fawcett) — core principles

1. **Aim at the widest part of the green** most of the time. Pin-hunting is negative-EV for anyone with >10 yds dispersion.
2. **Dispersion is a cone**, not a line. Amateur misses run ~±7% of carry distance (a 150-yd shot has ~21-yd-wide dispersion).
3. **Aim so the *edge* of your cone just clears trouble**, not the center. Single biggest penalty-stroke reducer.
4. **Tee shots: club down only when the cone overlaps OB/hazard.** Otherwise hit driver — distance dominates.
5. **Inside 150 yds: green-center is almost always correct.** Pin rarely moves the optimal target more than a few yards.

### Pre-shot routine essentials

Stand behind ball → pick specific target → visualize once → 1–2 practice swings (same every time) → step in → one look → trigger → go. **20–30 seconds total.** Consistency > content.

### Worth surfacing in an app

- **Target-selection helper** using personal dispersion cone over the hole map (DECADE-style)
- **Round debriefs** flagging where course management cost strokes ("you aimed at a sucker pin 4x, lost ~2 strokes")
- **Mental reset prompts** after big numbers to maintain shot independence
- **Pre-shot routine library** with adherence tracking

---

## 7. Common Swing Faults (Connects to Swing Analysis Feature)

These five faults cover the vast majority of 15–25 handicap mishits. Each has a clear signature on slow-mo video that pose-estimation models (MediaPipe-grade) can detect.

1. **Early Extension** — hips push toward ball in downswing; belt buckle moves ballward, spine stands up. Causes pushes, blocks, thin shots. *Signal:* hip-to-ball distance decreases between transition and impact.
2. **Over-the-Top / Out-to-In Path** — the slicer's signature. Shaft above trail shoulder on the downswing; club approaches from outside the target line. Causes slice, pull. *Signal:* shaft-plane angle deviates from takeaway plane.
3. **Reverse Spine Tilt at Top** — upper body tilts toward target at top of backswing; lead shoulder higher than trail. Causes fat/thin alternation, back pain. *Signal:* spine angle vs. ground at top.
4. **Chicken Wing / Lead Arm Collapse** — lead elbow folds outward through impact instead of rotating. Causes distance loss, weak fades, scoopy contact. *Signal:* lead elbow angle at/after impact.
5. **Casting / Early Release** — wrist hinge lost before impact; shaft parallel to ground while hands still high. Causes fat shots, distance loss. *Signal:* wrist-cock angle through downswing frames.

Bonus: **head movement.** Most amateurs assume they keep their head still — most don't. Trivial to measure (head centroid through swing) and high-value visual feedback.

---

## 8. Habit / Motivation — What Works in Existing Apps

### What works

- **Automatic / low-friction stat capture.** Manual-entry friction is the single biggest churn driver in golf-tracking apps; if logging takes too long, retention collapses after ~5 rounds.
- **Round-end debrief** with one or two actionable insights — the "story of the round" beats any dashboard.
- **Visible handicap / SG trend** — slow but real movement keeps people in.
- **Skill-bucket personal bests** (longest drive in fairway, closest from 150, lowest three-putt round) — frequent small wins.
- **Practice plans matched to observed weaknesses** (Arccos Caddie, Shot Scope Goals).

### What's gimmicky

- Generic badges ("played 5 rounds").
- Global leaderboards with strangers (friends-only works).
- Vague "AI coach" verbal feedback — users see through it in 2–3 sessions. Specific measurable visual feedback retains.
- Round summaries with no insight ("you shot 89, average 91").
- Social-feed-as-engagement (18Birdies) — drives MAUs, doesn't drive improvement.

### Engagement loop that actually drives improvement

Play round → low-friction capture → 30-second debrief with ONE finding → ONE recommended drill targeting it → log practice → show that category's trend on next round. Roughly the Arccos Caddie / Shot Scope V3 loop — the right backbone.

---

## Implications for App Features (Prioritized)

Ranked by ratio of (impact on user's actual scoring) to (effort to build).

### Tier 1 — must-have

1. **Low-friction round logging.** Tap-to-record shot location via GPS. Lie + distance only required; club optional. <3 taps per shot. Without this, nothing else matters.
2. **Strokes Gained** vs. an amateur (15-hcp) baseline, four categories, static lookup table.
3. **Round debrief** naming ONE finding in plain English ("lost 2.4 strokes today on approaches 125–175 — your worst vs. baseline").
4. **Proximity-by-distance-bucket** dashboard + trend. Most informative chart for an improving amateur.
5. **Three-putt count and penalty-stroke count** surfaced prominently — the two biggest hidden score destroyers.

### Tier 2 — high-impact

6. **DECADE-style target-selection helper.** Hole map + personal dispersion cone (from logged shots) + suggested aim. Highest-leverage in-round feature.
7. **Personalized drill recommendation.** Map weakest SG category → 2–3 drills. Re-evaluate every 5 rounds.
8. **Practice session templates** (deliberate-practice based): warm-up + skill block + simulated 9 holes, with timers and prompts.
9. **Pre-shot routine builder + on-range trainer** with adherence tracking.
10. **Personal dispersion per club**, computed from logged shots, displayed as ellipse on a target.

### Tier 3 — differentiating, higher-effort

11. **Swing video analysis** for the five common faults (face-on + DTL), pose-estimation overlays + measured angles.
12. **Simulated-round practice mode** with random clubs + scoring.
13. **Pressure-putting mode** (3-6-9, clock drill) with streak/pressure scoring.
14. **Course-specific strategy notes** for repeat courses — log stroke-costing holes, surface the fix before next round.

### Tier 4 — explicitly deprioritized

Generic badges; global leaderboards with strangers; vague "AI coach" verbal feedback; social feed; anything not tied to "did this lower score or reveal where strokes are lost."

---

## Key References

- Broadie, M. (2014). *Every Shot Counts.* Gotham Books. — Foundational SG framework, amateur baselines.
- Shot Scope. Public handicap-improvement reports — aggregate amateur data by handicap bucket.
- Arccos Golf. Caddie / aggregate-data posts — distance, proximity, scoring correlations.
- Fawcett, S. *DECADE Golf* (decade.golf) — dispersion cones, target selection.
- Pelz, D. *Putting Bible* / *Short Game Bible* — clock system, three-putt research.
- Ericsson, K. A. *Deliberate practice* literature.
- Schmidt & Lee, *Motor Control and Learning*; Brady (2008), *Contextual Interference Effect and Sport Skills* — block vs. random practice in sport.
- GolfTec *SwingTRU Motion Study* — amateur swing-fault frequencies.
- Me and My Golf (Ward & Proudman) — drill content.
