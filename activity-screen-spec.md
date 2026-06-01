# Activity Screen Spec — Replicating the Parachute Drop Flow

This document describes **exactly** how the Parachute Drop Challenge screen is built
so the same structure, look, and flow can be reused for the **Health and Medical
Sciences** activities (Human Performance Lab, Reaction Board Challenge, Breathing
Pace Trainer).

The goal: every activity should feel identical to the user — same wizard chrome,
same card styling, same navigation — only the *content* of each step changes.

Reference implementation: [app/parachute.tsx](../app/parachute.tsx) (single file, ~740 lines).

---

## 1. The mental model

An activity is a **5-step wizard** rendered in one screen file. The user moves
forward/back through fixed steps; all data is held in the top-level component so
nothing is lost when switching steps.

For the parachute, the five steps (the `TABS` array) are:

| # | Step           | Purpose                                                              |
|---|----------------|----------------------------------------------------------------------|
| 1 | Instructions   | Static read-only content: overview, equipment, numbered steps, diagram |
| 2 | Prediction     | User picks an option (chips) + writes a free-text reason             |
| 3 | Recorder       | Sub-tabbed timer; user times each "trial" and can upload a video     |
| 4 | Write-Up       | One card per trial with questions; the time auto-fills from Recorder |
| 5 | Discussion     | Static explanation: a table + formula + paragraph of the science     |

**For a new activity, keep the 5-step skeleton and the same component names.**
Only swap the domain content. If a particular activity genuinely needs a different
step (e.g. Reaction Board may not need video upload), keep the step *slot* and the
styling and just change what's inside it. Do not redesign the chrome.

---

## 2. File & routing setup (do this first for each new screen)

Each activity is **one route file** at `app/<id>.tsx`, e.g. `app/reaction.tsx`.
The activity `id` values already exist in the dashboard — reuse them:

- Health activities (from [app/(main)/dashboard.tsx](<../app/(main)/dashboard.tsx>)):
  - `performance` → Human Performance Lab
  - `reaction` → Reaction Board Challenge
  - `breathing` → Breathing Pace Trainer

### Step A — create the screen file
Copy `app/parachute.tsx` to `app/<id>.tsx` as the starting point, then rename the
default export (e.g. `ReactionScreen`) and replace the content per section 4.

### Step B — register the route
Add a `Stack.Screen` line in [app/_layout.tsx](../app/_layout.tsx), matching the
existing parachute entry exactly (same slide animation):

```tsx
<Stack.Screen name="reaction" options={{ animation: 'slide_from_right' }} />
```

### Step C — wire up the dashboard tile
In [app/(main)/dashboard.tsx](<../app/(main)/dashboard.tsx>), the `openActivity`
function currently only routes `parachute`. Extend it so each built activity
navigates to its route:

```tsx
const ROUTES: Record<string, string> = {
  parachute: "/parachute",
  performance: "/performance",
  reaction: "/reaction",
  breathing: "/breathing",
};

const openActivity = (activity: Activity) => {
  const route = ROUTES[activity.id];
  if (route) router.push(route as any);
};
```

(Activities without a built screen simply won't be in the map and stay inert,
matching today's behaviour.)

---

## 3. Non-negotiable shared conventions

These keep every activity visually consistent. Do **not** deviate.

- **Colors come from the shared palette.** Import `COLORS` from
  `@/components/auth-shell` ([components/auth-shell.tsx](../components/auth-shell.tsx)).
  Primary brand color is `COLORS.primary` (`#074C5C`), background `COLORS.bg`.
- **Screen-local lavender accents** live in a local `ACCENT` object at the top of
  the file (copy it verbatim from parachute.tsx):
  ```ts
  const ACCENT = {
    tabActive: "#DCDDF2",
    tableHeader: "#C9CCEC",
    softHeader: "#EFEDF8",
    border: "#E2E2EC",
  };
  ```
- **Layout shell:** `SafeAreaView edges={["top"]}` → `KeyboardAvoidingView`
  (`behavior="padding"` on iOS only) → header → step header → `ScrollView` → footer.
  Copy this wrapper structure exactly.
- **Cards:** white background, `borderRadius: 16`, `padding: 20`, soft shadow via
  the `boxShadow` style already in the stylesheet.
- **Text inputs:** always `multiline` + `textAlignVertical="top"`, bordered with
  `ACCENT.border`, placeholder color `COLORS.muted`.
- **Icons:** `@expo/vector-icons` (`FontAwesome5`, `Ionicons`,
  `MaterialCommunityIcons`). Match the icon library already chosen per activity in
  the dashboard's `HEALTH` array.
- **Reuse the entire `StyleSheet`** from parachute.tsx as-is. Almost no new styles
  are needed; new activities reuse `card`, `blockTitle`, `body`, `promptTitle`,
  `textArea`, `subTab*`, `field*`, `forceTable`, etc.

---

## 4. Step-by-step build guide

The top-level component owns all state so steps don't lose data on navigation.
Copy this structure and adjust the typed state to the activity's data.

```tsx
export default function ReactionScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // All activity state lives HERE, not inside the step components.
  const [prediction, setPrediction] = useState<PredictionValue>({ choice: "", reason: "" });
  const [reflection, setReflection] = useState("");
  const [times, setTimes] = useState<Record<TrialId, number>>(/* … */);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const current = TABS[step];
  const isFirst = step === 0;
  const isLast = step === TABS.length - 1;

  const goNext = () => { if (isLast) { router.back(); return; } setStep(s => Math.min(s + 1, TABS.length - 1)); };
  const goBack = () => setStep(s => Math.max(s - 1, 0));
  // …render header + progress + ScrollView switching on `current` + footer
}
```

### The header + progress bar (identical for all activities)
- A back chevron (`‹`) that calls `router.back()`.
- The activity title (`styles.title`) — change the text per activity.
- A segmented progress track: one segment per step, filled up to the current step.
- "Step X of N" + the current step name.

Copy lines 99–119 of parachute.tsx verbatim; only the title text changes.

### The footer (identical for all activities)
- `Back` button hidden on the first step (replaced by a spacer).
- `Next` button that reads **"Finish"** on the last step and calls `router.back()`.

Copy lines 143–154 verbatim.

### Step 1 — Instructions (`<Instructions />`)
Static content only. Sections rendered with `blockTitle` headings:
**Overview** (paragraph), **Equipment** (bulleted via `<Bullet>`), **Instructions**
(numbered via `<Numbered>`), **Diagram** (bulleted). Swap all copy for the new
activity. Reuse the `Bullet` / `Numbered` helper components at the bottom of the file.

### Step 2 — Prediction (`<Prediction value onChange />`)
- A prompt sentence (`promptTitle`).
- A row of selectable **chips** (`choiceChip`) the user toggles — these are the
  options being predicted between. For parachute they're the non-baseline designs.
- A `predictLead` lead-in sentence + a `textArea` for the reason.
- State shape: `type PredictionValue = { choice: string; reason: string }`.

For a new activity, change the prompt text and the list of chip options. Keep the
toggle behaviour (tapping the active chip clears it).

### Step 3 — Recorder (`<Recorder times setTimes />`)
This is the most interactive step. Structure:
- A pill **sub-tab bar** (`subTabBar`) with one tab per *trial*.
- An `instructionBox` showing the current trial's title + instruction.
- An "Upload video" row (currently shows an `Alert` placeholder — keep as-is).
- A large **timer** (`formatTime` → `SS.HHs`) with a Start/Stop button that flips
  between `outlineBtn` and `primaryBtn`.
- A `switchHint` confirming the time was saved and pointing to the next trial.

Timer mechanics (copy verbatim): `setInterval` at 30 ms updating `elapsed`,
`startRef` anchored to `Date.now() - elapsed` so pausing/resuming is correct, and
the cleanup `useEffect` that clears the interval on unmount. On Stop, the elapsed
time is written into the shared `times` map keyed by trial id.

**Trials** are defined once in a top-level `TRIALS` array and shared by Recorder
*and* Write-Up so they line up 1:1. Each trial: `{ id, short, title, note, instruction }`.
Change these to match the activity (e.g. Reaction Board might have trials like
"Dominant hand", "Non-dominant hand", "After exercise").

If an activity doesn't time anything, this step can instead capture numeric
measurements with the same sub-tab + card layout — but prefer keeping the timer if
the activity involves any duration/reaction measurement.

### Step 4 — Write-Up (`<WriteUp … />`)
- One `actionCard` per trial (mapped over the same `TRIALS`).
- Inside each card, a fixed set of questions (`WRITEUP_QUESTIONS`), each a labelled
  `TextInput`.
- One question has `auto: true` — it **pre-fills from the Recorder time** (via
  `formatTime(times[trial.id])`) until the user types over it, then shows a
  "Measured in the Recorder — edit if needed." hint.
- A final reflection `card` with a `textArea`.

Answer state is a flat `Record<string, string>` keyed `` `${trial.id}-${index}` ``.
Change the question labels per activity; keep the auto-fill wiring for the measured
value.

### Step 5 — Discussion (`<Discussion />`)
Static science explanation:
- A `sectionHeading` ("So why does this happen?").
- A bordered **table** (`forceTable`) of two columns built from a top-level data
  array (for parachute: forces vs. formulas).
- A highlighted formula line + an explanatory paragraph.

Swap the heading, table rows, formula, and paragraph for the activity's science.

---

## 5. Per-activity content checklist

For each new Health & Medical Sciences screen, fill in:

- [ ] `TABS` — keep the 5 standard step names unless there's a strong reason.
- [ ] `TRIALS` — the things being measured/tested (id, short, title, note, instruction).
- [ ] Header title text.
- [ ] Instructions copy: Overview / Equipment / Instructions / Diagram.
- [ ] Prediction: prompt sentence + chip options + lead-in.
- [ ] Recorder: what's being timed/measured + per-trial instruction text.
- [ ] Write-Up: the per-trial questions (mark the measured one `auto: true`) + final
      reflection prompt.
- [ ] Discussion: heading + table rows + formula + explanation paragraph.
- [ ] Route registered in `app/_layout.tsx`.
- [ ] Tile wired in dashboard `openActivity`.

---

## 6. State & data-flow rules (why it's built this way)

- **All state is hoisted to the screen component.** Steps are pure presentational
  children that receive `value` + setter props. This is deliberate: switching steps
  unmounts the previous step's UI, so if state lived inside steps it would be lost.
- **`TRIALS` is the single source of truth** shared by Recorder and Write-Up so the
  two steps always agree on the list and order.
- **The measured time flows one way:** Recorder writes `times[trialId]`; Write-Up
  reads it as a default and lets the user override into `answers`.
- Nothing is persisted to a backend yet — state is in-memory for the session. (The
  app does have SQLite via `SQLiteProvider` in `_layout.tsx` and helpers in
  `lib/crud.ts` / `lib/db.ts` if persistence is added later, but the parachute
  screen does **not** use them. Match that — keep it in-memory unless told otherwise.)

---

## 7. Quick reference — imports used by the screen

```tsx
import { FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import {
  Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "@/components/auth-shell";
```

---

## 8. TL;DR for the agent

1. Copy `app/parachute.tsx` → `app/<id>.tsx`, rename the export.
2. Keep the wrapper, header, progress bar, footer, and **entire StyleSheet** as-is.
3. Replace only: `TABS` (keep 5), `TRIALS`, `WRITEUP_QUESTIONS`, the static text in
   `Instructions`/`Discussion`, the Prediction prompt/chips, and the header title.
4. Register the route in `app/_layout.tsx` and wire the tile in the dashboard.
5. Result should be visually indistinguishable from the parachute screen apart from
   the domain content.
