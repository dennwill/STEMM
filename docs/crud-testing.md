# CRUD Testing Guide

This guide covers how to test the local SQLite CRUD layer defined in `lib/crud.ts`.

---

## Prerequisites

- Node.js and npm installed
- Expo Go installed on a physical device or an emulator/simulator running
- App started with `npx expo start`

---

## Method: In-App Test Screen

The app temporarily contains a built-in test screen (for testing reasons obviously) (`app/(tabs)/test.tsx`) that runs every CRUD operation against the real SQLite database and reports pass/fail inline.

### Steps

1. Start the dev server:
   ```bash
   npx expo start
   ```
2. Open the app in Expo Go.
3. Tap the **Tests** tab in the bottom tab bar.
4. Press **Run All Tests**.

Each row shows a green ✓ or red ✗ with the actual value returned from the database so you can verify the data, not just the absence of an error.

### What the test run covers

The test executes in order and cleans up after itself — no manual database reset is needed between runs.

| Step | Operation                | What is checked                                |
| ---- | ------------------------ | ---------------------------------------------- |
| 1    | `createTeam`             | Returns a positive integer ID                  |
| 2    | `getAllTeams`            | Newly created team appears in the list         |
| 3    | `updateTeam`             | `team_name` reflects the new value             |
| 4    | `createTeamMember`       | Returns a positive integer ID                  |
| 5    | `getMembersByTeam`       | Member appears under the correct team          |
| 6    | `updateTeamMember`       | `first_name` reflects the new value            |
| 7    | `deleteTeamMember`       | Member no longer appears under the team        |
| 8    | `createActivity`         | Returns a positive integer ID                  |
| 9    | `getAllActivities`       | Newly created activity appears in the list     |
| 10   | `updateActivity`         | `challenge_name` reflects the new value        |
| 11   | `createChallengeSession` | Returns a positive integer ID                  |
| 12   | `getSessionsByTeam`      | Session appears under the correct team         |
| 13   | `updateChallengeSession` | `discussion_reflection` reflects the new value |
| 14   | `createDataPoint`        | Returns a positive integer ID                  |
| 15   | `getDataPointsBySession` | Data point appears under the correct session   |
| 16   | `updateDataPoint`        | `outcome_value` reflects the new value         |
| 17   | `deleteDataPoint`        | Data point no longer appears under the session |
| 18   | `createLeaderboardScore` | Returns a positive integer ID                  |
| 19   | `getLeaderboard`         | Score appears in the leaderboard               |
| 20   | `updateLeaderboardScore` | Score reflects the new value                   |
| 21   | `upsertLeaderboardScore` | Existing score is updated, not duplicated      |
| 22   | `deleteLeaderboardScore` | Score no longer appears in the leaderboard     |
| 23   | Cascade delete cleanup   | Deleting a team removes its sessions and score |

### Interpreting results

- **All green** — every operation round-tripped correctly through SQLite.
- **A red row** — the detail text shows what value was actually returned. Compare it against the expected value in the table above to diagnose the issue.
- **`UNEXPECTED ERROR` row** — an exception was thrown. The detail text contains the error message. Check the Metro console for the full stack trace.

---

## Function Reference

All functions accept a `SQLiteDatabase` instance as the first argument, obtained via `useSQLiteContext()` inside any component wrapped by `SQLiteProvider`.

### Teams

| Function                  | Signature                                           | Returns                                                 |
| ------------------------- | --------------------------------------------------- | ------------------------------------------------------- |
| `createTeam`              | `(db, { discriminant_id, team_name, grade_level })` | `Promise<number>` — inserted row ID                     |
| `getTeam`                 | `(db, id)`                                          | `Promise<Team \| null>`                                 |
| `getTeamByDiscriminantId` | `(db, discriminant_id)`                             | `Promise<Team \| null>`                                 |
| `getAllTeams`             | `(db)`                                              | `Promise<Team[]>` — ordered newest first                |
| `updateTeam`              | `(db, id, { team_name?, grade_level? })`            | `Promise<void>`                                         |
| `deleteTeam`              | `(db, id)`                                          | `Promise<void>` — cascades to members, sessions, scores |

### Team Members

| Function           | Signature                       | Returns                                         |
| ------------------ | ------------------------------- | ----------------------------------------------- |
| `createTeamMember` | `(db, { team_id, first_name })` | `Promise<number>`                               |
| `getTeamMember`    | `(db, id)`                      | `Promise<TeamMember \| null>`                   |
| `getMembersByTeam` | `(db, team_id)`                 | `Promise<TeamMember[]>` — ordered by first name |
| `updateTeamMember` | `(db, id, { first_name })`      | `Promise<void>`                                 |
| `deleteTeamMember` | `(db, id)`                      | `Promise<void>`                                 |

### Activities

| Function                  | Signature                                                | Returns                                               |
| ------------------------- | -------------------------------------------------------- | ----------------------------------------------------- |
| `createActivity`          | `(db, { category, challenge_name, description })`        | `Promise<number>`                                     |
| `getActivity`             | `(db, id)`                                               | `Promise<Activity \| null>`                           |
| `getAllActivities`        | `(db)`                                                   | `Promise<Activity[]>` — ordered by category then name |
| `getActivitiesByCategory` | `(db, category)`                                         | `Promise<Activity[]>`                                 |
| `updateActivity`          | `(db, id, { category?, challenge_name?, description? })` | `Promise<void>`                                       |
| `deleteActivity`          | `(db, id)`                                               | `Promise<void>` — cascades to sessions                |

### Challenge Sessions

| Function                 | Signature                                                                | Returns                                              |
| ------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------------- |
| `createChallengeSession` | `(db, { team_id, activity_id, prediction_text, discussion_reflection })` | `Promise<number>`                                    |
| `getChallengeSession`    | `(db, id)`                                                               | `Promise<ChallengeSession \| null>`                  |
| `getSessionsByTeam`      | `(db, team_id)`                                                          | `Promise<ChallengeSession[]>` — ordered newest first |
| `getSessionsByActivity`  | `(db, activity_id)`                                                      | `Promise<ChallengeSession[]>` — ordered newest first |
| `updateChallengeSession` | `(db, id, { prediction_text?, discussion_reflection? })`                 | `Promise<void>`                                      |
| `deleteChallengeSession` | `(db, id)`                                                               | `Promise<void>` — cascades to data points            |

### Challenge Data Points

| Function                 | Signature                                                                                                                      | Returns                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| `createDataPoint`        | `(db, { session_id, attempt_number, action_or_design, prediction_value, outcome_value, prediction_correct, media_file_path })` | `Promise<number>`                                           |
| `getDataPoint`           | `(db, id)`                                                                                                                     | `Promise<ChallengeDataPoint \| null>`                       |
| `getDataPointsBySession` | `(db, session_id)`                                                                                                             | `Promise<ChallengeDataPoint[]>` — ordered by attempt number |
| `updateDataPoint`        | `(db, id, { attempt_number?, action_or_design?, prediction_value?, outcome_value?, prediction_correct?, media_file_path? })`   | `Promise<void>`                                             |
| `deleteDataPoint`        | `(db, id)`                                                                                                                     | `Promise<void>`                                             |

### Leaderboard Scores

| Function                 | Signature                  | Returns                                                     |
| ------------------------ | -------------------------- | ----------------------------------------------------------- |
| `createLeaderboardScore` | `(db, { team_id, score })` | `Promise<number>`                                           |
| `getLeaderboardScore`    | `(db, id)`                 | `Promise<LeaderboardScore \| null>`                         |
| `getScoreByTeam`         | `(db, team_id)`            | `Promise<LeaderboardScore \| null>`                         |
| `getLeaderboard`         | `(db)`                     | `Promise<LeaderboardScore[]>` — ordered highest score first |
| `upsertLeaderboardScore` | `(db, team_id, score)`     | `Promise<void>` — updates if exists, inserts if not         |
| `updateLeaderboardScore` | `(db, id, score)`          | `Promise<void>` — also refreshes `last_updated`             |
| `deleteLeaderboardScore` | `(db, id)`                 | `Promise<void>`                                             |

---

## Notes for Developers

**Cascade deletes** — `foreign_keys = ON` is set at migration time. Deleting a `team` automatically removes its `team_members`, `challenge_sessions`, and `leaderboard_scores`. Deleting a `challenge_session` removes its `challenge_data_points`. Do not manually clean up child rows first.

**`discriminant_id`** — must be unique across all teams (enforced by a `UNIQUE` constraint). Use a stable, human-readable identifier such as a school code + team number (e.g. `"PS101-A"`). Duplicate values will throw a SQLite constraint error.

**Nullable fields** — all optional fields accept `null` explicitly. Pass `null` rather than `undefined` when intentionally clearing a value.

**`upsertLeaderboardScore` vs `updateLeaderboardScore`** — use `upsertLeaderboardScore(db, team_id, score)` when you do not know whether a score row exists yet. Use `updateLeaderboardScore(db, id, score)` only when you already have the row `id`.

**Test screen in production** — `app/(tabs)/test.tsx` is development scaffolding. Remove or gate it behind `__DEV__` before shipping to end users.
