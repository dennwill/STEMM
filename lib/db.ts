import { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'stemm.db';

// Single source of truth for the seeded local rows below. Activity slugs match
// the keys in lib/points.ts ACTIVITY_POINTS; the numeric ids match the seed
// insert order in migrateDbIfNeeded so activity screens can persist sessions
// without violating the challenge_sessions foreign keys.
export const LOCAL_TEAM_ID = 1;
export const LOCAL_ACTIVITY_IDS = {
  parachute: 1,
  sound: 2,
  fan: 3,
  earthquake: 4,
  performance: 5,
  reaction: 6,
  breathing: 7,
} as const;

const SCHEMA_VERSION = 2;

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  if (currentVersion >= SCHEMA_VERSION) return;

  if (currentVersion < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS teams (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        discriminant_id  TEXT UNIQUE NOT NULL,
        team_name        TEXT NOT NULL,
        grade_level      TEXT NOT NULL,
        created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS team_members (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id    INTEGER NOT NULL,
        first_name TEXT NOT NULL,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS activities (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        category       TEXT NOT NULL,
        challenge_name TEXT NOT NULL,
        description    TEXT
      );

      CREATE TABLE IF NOT EXISTS challenge_sessions (
        id                    INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id               INTEGER NOT NULL,
        activity_id           INTEGER NOT NULL,
        prediction_text       TEXT,
        discussion_reflection TEXT,
        completed_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id)    REFERENCES teams(id)      ON DELETE CASCADE,
        FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS challenge_data_points (
        id                 INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id         INTEGER NOT NULL,
        attempt_number     INTEGER,
        action_or_design   TEXT,
        prediction_value   TEXT,
        outcome_value      TEXT,
        prediction_correct BOOLEAN,
        media_file_path    TEXT,
        FOREIGN KEY (session_id) REFERENCES challenge_sessions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS leaderboard_scores (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id      INTEGER NOT NULL,
        score        INTEGER DEFAULT 0,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      );
    `);
  }

  if (currentVersion < 2) {
    // Seed a default local team and the built-in activities so that activity
    // screens (which reference team_id 1 / activity_id 1..7) can persist
    // sessions without violating the foreign-key constraints above. Runs for
    // existing installs too, since v1 created the tables empty. IDs are
    // explicit so they stay stable regardless of insertion order, and
    // INSERT OR IGNORE keeps it idempotent; activity_id 1 must remain
    // "Parachute Drop Challenge" to match app/parachute.tsx.
    await db.execAsync(`
      INSERT OR IGNORE INTO teams (id, discriminant_id, team_name, grade_level)
      VALUES (1, 'LOCAL', 'Local Team', 'N/A');

      INSERT OR IGNORE INTO activities (id, category, challenge_name, description) VALUES
        (1, 'Engineering', 'Parachute Drop Challenge', NULL),
        (2, 'Engineering', 'Sound Pollution Hunter', NULL),
        (3, 'Engineering', 'Hand Fan Challenge', NULL),
        (4, 'Engineering', 'Earthquake-Resistant Structure', NULL),
        (5, 'Health', 'Human Performance Lab', NULL),
        (6, 'Health', 'Reaction Board Challenge', NULL),
        (7, 'Health', 'Breathing Pace Trainer', NULL);
    `);
  }

  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}
