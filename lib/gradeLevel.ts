import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";

import { auth, firestore } from "@/lib/firebase";

// Activities split their depth by school level, per the spec's "Student Focus":
// Primary measures time + final speed; High School unlocks the full force /
// g-force chain.
export type SchoolLevel = "primary" | "high";

/**
 * Map a stored grade string (from the `GRADE_LEVELS` list — "Kindergarten",
 * "1st Grade" … "12th Grade") to a school level. Grades 1–6 (and Kindergarten)
 * are primary; 7–12 are high school. Returns `null` for anything unrecognised
 * ("N/A", empty, missing) so the caller can fall back to a manual choice.
 */
export function gradeToLevel(grade?: string | null): SchoolLevel | null {
  if (!grade) return null;
  if (/kindergarten/i.test(grade)) return "primary";
  const match = grade.match(/\d+/);
  if (!match) return null;
  const n = parseInt(match[0], 10);
  if (!Number.isFinite(n) || n < 1 || n > 12) return null;
  return n <= 6 ? "primary" : "high";
}

type SchoolLevelState = {
  level: SchoolLevel;
  setLevel: (l: SchoolLevel) => void;
  /** True once the level was detected from the signed-in user's team grade. */
  autoDetected: boolean;
  /** The raw grade string the level was detected from (e.g. "3rd Grade"). */
  gradeLabel: string | null;
};

/**
 * Resolve the student's school level. If they're signed in and on a team, the
 * level is detected from that team's grade (`users/{uid}.team_id` →
 * `teams/{tid}.grade_level`) and `autoDetected` is true. Otherwise the caller
 * should let the student pick via `setLevel` (the toggle stays visible).
 */
export function useSchoolLevel(): SchoolLevelState {
  const [level, setLevel] = useState<SchoolLevel>("high");
  const [autoDetected, setAutoDetected] = useState(false);
  const [gradeLabel, setGradeLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const user = auth.currentUser;
      if (!user) return; // not signed in → manual choice
      try {
        const userSnap = await getDoc(doc(firestore, "users", user.uid));
        const tid = userSnap.exists() ? (userSnap.data() as { team_id?: string }).team_id : null;
        if (!tid) return; // no team → manual choice

        const teamSnap = await getDoc(doc(firestore, "teams", tid));
        const grade = teamSnap.exists()
          ? (teamSnap.data() as { grade_level?: string }).grade_level
          : null;
        const detected = gradeToLevel(grade);
        if (!cancelled && detected) {
          setLevel(detected);
          setAutoDetected(true);
          setGradeLabel(grade ?? null);
        }
      } catch {
        // Network / permission issues just leave the manual toggle in place.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { level, setLevel, autoDetected, gradeLabel };
}
