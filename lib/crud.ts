import { SQLiteDatabase } from "expo-sqlite";

// ---- Types ---------------------------------

export type Team = {
  id: number;
  discriminant_id: string;
  team_name: string;
  grade_level: string;
  created_at: string;
};

export type TeamMember = {
  id: number;
  team_id: number;
  first_name: string;
};

export type Activity = {
  id: number;
  category: string;
  challenge_name: string;
  description: string | null;
};

export type ChallengeSession = {
  id: number;
  team_id: number;
  activity_id: number;
  prediction_text: string | null;
  discussion_reflection: string | null;
  rating: number | null;
  gps_lat: number | null;
  gps_lng: number | null;
  completed_at: string;
};

export type ChallengeDataPoint = {
  id: number;
  session_id: number;
  attempt_number: number | null;
  action_or_design: string | null;
  prediction_value: string | null;
  outcome_value: string | null;
  prediction_correct: boolean | null;
  media_file_path: string | null;
};

export type LeaderboardScore = {
  id: number;
  team_id: number;
  score: number;
  last_updated: string;
};

// ------ Teams ---------------------------------

export async function createTeam(
  db: SQLiteDatabase,
  data: Pick<Team, "discriminant_id" | "team_name" | "grade_level">,
): Promise<number> {
  const result = await db.runAsync(
    "INSERT INTO teams (discriminant_id, team_name, grade_level) VALUES (?, ?, ?)",
    data.discriminant_id,
    data.team_name,
    data.grade_level,
  );
  return result.lastInsertRowId;
}

export function getTeam(db: SQLiteDatabase, id: number): Promise<Team | null> {
  return db.getFirstAsync<Team>("SELECT * FROM teams WHERE id = ?", id);
}

export function getTeamByDiscriminantId(db: SQLiteDatabase, discriminant_id: string): Promise<Team | null> {
  return db.getFirstAsync<Team>("SELECT * FROM teams WHERE discriminant_id = ?", discriminant_id);
}

export function getAllTeams(db: SQLiteDatabase): Promise<Team[]> {
  return db.getAllAsync<Team>("SELECT * FROM teams ORDER BY created_at DESC");
}

export async function updateTeam(
  db: SQLiteDatabase,
  id: number,
  data: Partial<Pick<Team, "team_name" | "grade_level">>,
): Promise<void> {
  const fields = Object.keys(data) as (keyof typeof data)[];
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => data[f] ?? null);
  await db.runAsync(`UPDATE teams SET ${setClause} WHERE id = ?`, ...values, id);
}

export async function deleteTeam(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync("DELETE FROM teams WHERE id = ?", id);
}

// ------ Team Members ---------------------------------

export async function createTeamMember(
  db: SQLiteDatabase,
  data: Pick<TeamMember, "team_id" | "first_name">,
): Promise<number> {
  const result = await db.runAsync(
    "INSERT INTO team_members (team_id, first_name) VALUES (?, ?)",
    data.team_id,
    data.first_name,
  );
  return result.lastInsertRowId;
}

export function getTeamMember(db: SQLiteDatabase, id: number): Promise<TeamMember | null> {
  return db.getFirstAsync<TeamMember>("SELECT * FROM team_members WHERE id = ?", id);
}

export function getMembersByTeam(db: SQLiteDatabase, team_id: number): Promise<TeamMember[]> {
  return db.getAllAsync<TeamMember>("SELECT * FROM team_members WHERE team_id = ? ORDER BY first_name", team_id);
}

export async function updateTeamMember(
  db: SQLiteDatabase,
  id: number,
  data: Pick<TeamMember, "first_name">,
): Promise<void> {
  await db.runAsync("UPDATE team_members SET first_name = ? WHERE id = ?", data.first_name, id);
}

export async function deleteTeamMember(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync("DELETE FROM team_members WHERE id = ?", id);
}

// ---- Activities -----------------------------------

export async function createActivity(
  db: SQLiteDatabase,
  data: Pick<Activity, "category" | "challenge_name" | "description">,
): Promise<number> {
  const result = await db.runAsync(
    "INSERT INTO activities (category, challenge_name, description) VALUES (?, ?, ?)",
    data.category,
    data.challenge_name,
    data.description ?? null,
  );
  return result.lastInsertRowId;
}

export function getActivity(db: SQLiteDatabase, id: number): Promise<Activity | null> {
  return db.getFirstAsync<Activity>("SELECT * FROM activities WHERE id = ?", id);
}

export function getAllActivities(db: SQLiteDatabase): Promise<Activity[]> {
  return db.getAllAsync<Activity>("SELECT * FROM activities ORDER BY category, challenge_name");
}

export function getActivitiesByCategory(db: SQLiteDatabase, category: string): Promise<Activity[]> {
  return db.getAllAsync<Activity>("SELECT * FROM activities WHERE category = ? ORDER BY challenge_name", category);
}

export async function updateActivity(
  db: SQLiteDatabase,
  id: number,
  data: Partial<Pick<Activity, "category" | "challenge_name" | "description">>,
): Promise<void> {
  const fields = Object.keys(data) as (keyof typeof data)[];
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => data[f] ?? null);
  await db.runAsync(`UPDATE activities SET ${setClause} WHERE id = ?`, ...values, id);
}

export async function deleteActivity(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync("DELETE FROM activities WHERE id = ?", id);
}

// -------- Challenge Sessions ------------------------------------

export async function createChallengeSession(
  db: SQLiteDatabase,
  data: Pick<
    ChallengeSession,
    "team_id" | "activity_id" | "prediction_text" | "discussion_reflection"
  > &
    Partial<Pick<ChallengeSession, "rating" | "gps_lat" | "gps_lng">>,
): Promise<number> {
  const result = await db.runAsync(
    "INSERT INTO challenge_sessions (team_id, activity_id, prediction_text, discussion_reflection, rating, gps_lat, gps_lng) VALUES (?, ?, ?, ?, ?, ?, ?)",
    data.team_id,
    data.activity_id,
    data.prediction_text ?? null,
    data.discussion_reflection ?? null,
    data.rating ?? null,
    data.gps_lat ?? null,
    data.gps_lng ?? null,
  );
  return result.lastInsertRowId;
}

export function getChallengeSession(db: SQLiteDatabase, id: number): Promise<ChallengeSession | null> {
  return db.getFirstAsync<ChallengeSession>("SELECT * FROM challenge_sessions WHERE id = ?", id);
}

export function getSessionsByTeam(db: SQLiteDatabase, team_id: number): Promise<ChallengeSession[]> {
  return db.getAllAsync<ChallengeSession>(
    "SELECT * FROM challenge_sessions WHERE team_id = ? ORDER BY completed_at DESC",
    team_id,
  );
}

export function getSessionsByActivity(db: SQLiteDatabase, activity_id: number): Promise<ChallengeSession[]> {
  return db.getAllAsync<ChallengeSession>(
    "SELECT * FROM challenge_sessions WHERE activity_id = ? ORDER BY completed_at DESC",
    activity_id,
  );
}

export async function updateChallengeSession(
  db: SQLiteDatabase,
  id: number,
  data: Partial<Pick<ChallengeSession, "prediction_text" | "discussion_reflection">>,
): Promise<void> {
  const fields = Object.keys(data) as (keyof typeof data)[];
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => data[f] ?? null);
  await db.runAsync(`UPDATE challenge_sessions SET ${setClause} WHERE id = ?`, ...values, id);
}

export async function deleteChallengeSession(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync("DELETE FROM challenge_sessions WHERE id = ?", id);
}

// --------- Challenge Data Points ----------------------------------

export async function createDataPoint(
  db: SQLiteDatabase,
  data: Pick<
    ChallengeDataPoint,
    | "session_id"
    | "attempt_number"
    | "action_or_design"
    | "prediction_value"
    | "outcome_value"
    | "prediction_correct"
    | "media_file_path"
  >,
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO challenge_data_points
      (session_id, attempt_number, action_or_design, prediction_value, outcome_value, prediction_correct, media_file_path)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    data.session_id,
    data.attempt_number ?? null,
    data.action_or_design ?? null,
    data.prediction_value ?? null,
    data.outcome_value ?? null,
    data.prediction_correct ?? null,
    data.media_file_path ?? null,
  );
  return result.lastInsertRowId;
}

export function getDataPoint(db: SQLiteDatabase, id: number): Promise<ChallengeDataPoint | null> {
  return db.getFirstAsync<ChallengeDataPoint>("SELECT * FROM challenge_data_points WHERE id = ?", id);
}

export function getDataPointsBySession(db: SQLiteDatabase, session_id: number): Promise<ChallengeDataPoint[]> {
  return db.getAllAsync<ChallengeDataPoint>(
    "SELECT * FROM challenge_data_points WHERE session_id = ? ORDER BY attempt_number",
    session_id,
  );
}

export async function updateDataPoint(
  db: SQLiteDatabase,
  id: number,
  data: Partial<
    Pick<
      ChallengeDataPoint,
      | "attempt_number"
      | "action_or_design"
      | "prediction_value"
      | "outcome_value"
      | "prediction_correct"
      | "media_file_path"
    >
  >,
): Promise<void> {
  const fields = Object.keys(data) as (keyof typeof data)[];
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => data[f] ?? null);
  await db.runAsync(`UPDATE challenge_data_points SET ${setClause} WHERE id = ?`, ...values, id);
}

export async function deleteDataPoint(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync("DELETE FROM challenge_data_points WHERE id = ?", id);
}

// -------- Leaderboard Scores ---------------------------------

export async function createLeaderboardScore(
  db: SQLiteDatabase,
  data: Pick<LeaderboardScore, "team_id" | "score">,
): Promise<number> {
  const result = await db.runAsync(
    "INSERT INTO leaderboard_scores (team_id, score) VALUES (?, ?)",
    data.team_id,
    data.score,
  );
  return result.lastInsertRowId;
}

export function getLeaderboardScore(db: SQLiteDatabase, id: number): Promise<LeaderboardScore | null> {
  return db.getFirstAsync<LeaderboardScore>("SELECT * FROM leaderboard_scores WHERE id = ?", id);
}

export function getScoreByTeam(db: SQLiteDatabase, team_id: number): Promise<LeaderboardScore | null> {
  return db.getFirstAsync<LeaderboardScore>("SELECT * FROM leaderboard_scores WHERE team_id = ?", team_id);
}

export function getLeaderboard(db: SQLiteDatabase): Promise<LeaderboardScore[]> {
  return db.getAllAsync<LeaderboardScore>("SELECT * FROM leaderboard_scores ORDER BY score DESC");
}

export async function upsertLeaderboardScore(db: SQLiteDatabase, team_id: number, score: number): Promise<void> {
  const existing = await getScoreByTeam(db, team_id);
  if (existing) {
    await updateLeaderboardScore(db, existing.id, score);
  } else {
    await createLeaderboardScore(db, { team_id, score });
  }
}

export async function updateLeaderboardScore(db: SQLiteDatabase, id: number, score: number): Promise<void> {
  await db.runAsync(
    "UPDATE leaderboard_scores SET score = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?",
    score,
    id,
  );
}

export async function deleteLeaderboardScore(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync("DELETE FROM leaderboard_scores WHERE id = ?", id);
}
