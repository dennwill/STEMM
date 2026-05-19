import { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'stemm.db';

const SCHEMA_VERSION = 1;

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  if (currentVersion >= SCHEMA_VERSION) return;

  if (currentVersion === 0) {
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

  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}
