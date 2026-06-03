import { doc, increment, runTransaction, serverTimestamp } from "firebase/firestore";

import { auth, firestore } from "@/lib/firebase";

export const ACTIVITY_POINTS: Record<string, number> = {
  parachute: 100,
  sound: 100,
  fan: 100,
  earthquake: 100,
  performance: 100,
  reaction: 100,
  breathing: 100,
};

export type AwardPointsResult = {
  awarded: boolean;
  points: number;
  teamId?: string;
  reason?: "no-user" | "no-team" | "already-awarded" | "award-failed";
};

export function getActivityPoints(activityId: string) {
  return ACTIVITY_POINTS[activityId] ?? 100;
}

export async function awardActivityCompletionPoints(
  activityId: string,
  activityTitle = activityId,
): Promise<AwardPointsResult> {
  const user = auth.currentUser;
  if (!user) return { awarded: false, points: 0, reason: "no-user" };

  const points = getActivityPoints(activityId);
  const userRef = doc(firestore, "users", user.uid);

  try {
    return await runTransaction(firestore, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      const userData = userSnap.data() as { team_id?: string | null } | undefined;
      const teamId = userData?.team_id;

      if (!teamId) {
        return { awarded: false, points, reason: "no-team" };
      }

      const awardRef = doc(firestore, "point_awards", `${teamId}_${activityId}`);
      const awardSnap = await transaction.get(awardRef);
      if (awardSnap.exists()) {
        return { awarded: false, points, teamId, reason: "already-awarded" };
      }

      const teamRef = doc(firestore, "teams", teamId);
      transaction.set(awardRef, {
        team_id: teamId,
        user_uid: user.uid,
      activity_id: activityId,
      activity_title: activityTitle,
      points,
      validation_version: 1,
      awarded_at: serverTimestamp(),
      });
      transaction.update(teamRef, {
        score: increment(points),
        last_score_update: serverTimestamp(),
      });

      return { awarded: true, points, teamId };
    });
  } catch (error) {
    console.warn("Failed to award activity points:", error);
    return { awarded: false, points, reason: "award-failed" };
  }
}

export function formatAwardPointsMessage(result: AwardPointsResult) {
  if (result.awarded) {
    return `Your team earned ${result.points} pts.`;
  }
  if (result.reason === "already-awarded") {
    return `This activity was already counted for your team. No extra points added.`;
  }
  if (result.reason === "no-team") {
    return "Join or create a team to earn leaderboard points.";
  }
  if (result.reason === "no-user") {
    return "Sign in to earn leaderboard points.";
  }
  if (result.reason === "award-failed") {
    return "Leaderboard points could not be synced right now.";
  }
  return "No leaderboard points were added.";
}
