import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  createActivity,
  createChallengeSession,
  createDataPoint,
  createLeaderboardScore,
  createTeam,
  createTeamMember,
  deleteActivity,
  deleteChallengeSession,
  deleteDataPoint,
  deleteLeaderboardScore,
  deleteTeam,
  deleteTeamMember,
  getAllActivities,
  getAllTeams,
  getDataPointsBySession,
  getLeaderboard,
  getMembersByTeam,
  getSessionsByTeam,
  updateActivity,
  updateChallengeSession,
  updateDataPoint,
  updateLeaderboardScore,
  updateTeam,
  updateTeamMember,
  upsertLeaderboardScore,
} from "@/lib/crud";

type LogEntry = { label: string; ok: boolean; detail: string };

export default function TestScreen() {
  const db = useSQLiteContext();
  const [log, setLog] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);

  function push(label: string, ok: boolean, detail: string) {
    setLog((prev) => [...prev, { label, ok, detail }]);
  }

  async function runAll() {
    setLog([]);
    setRunning(true);
    try {
      // ------ Teams ---------------------------------
      const teamId = await createTeam(db, {
        discriminant_id: `test-${Date.now()}`,
        team_name: "Alpha",
        grade_level: "5th",
      });
      push("createTeam", teamId > 0, `id=${teamId}`);

      const teams = await getAllTeams(db);
      const found = teams.find((t) => t.id === teamId);
      push("getAllTeams", !!found, `count=${teams.length}, name=${found?.team_name}`);

      await updateTeam(db, teamId, { team_name: "Alpha Updated" });
      const teamsAfter = await getAllTeams(db);
      const updated = teamsAfter.find((t) => t.id === teamId);
      push("updateTeam", updated?.team_name === "Alpha Updated", `name=${updated?.team_name}`);

      // ------- Team Members ---------------------------------
      const memberId = await createTeamMember(db, { team_id: teamId, first_name: "Jordan" });
      push("createTeamMember", memberId > 0, `id=${memberId}`);

      const members = await getMembersByTeam(db, teamId);
      push("getMembersByTeam", members.length > 0, `count=${members.length}, name=${members[0]?.first_name}`);

      await updateTeamMember(db, memberId, { first_name: "Jordan Updated" });
      const membersAfter = await getMembersByTeam(db, teamId);
      push("updateTeamMember", membersAfter[0]?.first_name === "Jordan Updated", `name=${membersAfter[0]?.first_name}`);

      await deleteTeamMember(db, memberId);
      const membersDeleted = await getMembersByTeam(db, teamId);
      push("deleteTeamMember", membersDeleted.length === 0, `count=${membersDeleted.length}`);

      // ------- Activities ------------------------------------
      const activityId = await createActivity(db, {
        category: "Science",
        challenge_name: "Bridge Build",
        description: "Build the strongest bridge.",
      });
      push("createActivity", activityId > 0, `id=${activityId}`);

      const activities = await getAllActivities(db);
      const foundActivity = activities.find((a) => a.id === activityId);
      push("getAllActivities", !!foundActivity, `count=${activities.length}`);

      await updateActivity(db, activityId, { challenge_name: "Bridge Build v2" });
      const activitiesAfter = await getAllActivities(db);
      const updatedActivity = activitiesAfter.find((a) => a.id === activityId);
      push(
        "updateActivity",
        updatedActivity?.challenge_name === "Bridge Build v2",
        `name=${updatedActivity?.challenge_name}`,
      );

      // --------- Challenge Sessions -------------------------------------
      const sessionId = await createChallengeSession(db, {
        team_id: teamId,
        activity_id: activityId,
        prediction_text: "We predict success.",
        discussion_reflection: null,
      });
      push("createChallengeSession", sessionId > 0, `id=${sessionId}`);

      const sessions = await getSessionsByTeam(db, teamId);
      push("getSessionsByTeam", sessions.length > 0, `count=${sessions.length}`);

      await updateChallengeSession(db, sessionId, { discussion_reflection: "It worked!" });
      const sessionsAfter = await getSessionsByTeam(db, teamId);
      push(
        "updateChallengeSession",
        sessionsAfter[0]?.discussion_reflection === "It worked!",
        `reflection=${sessionsAfter[0]?.discussion_reflection}`,
      );

      // ----- Data Points -----------------------------------
      const dpId = await createDataPoint(db, {
        session_id: sessionId,
        attempt_number: 1,
        action_or_design: "Design A",
        prediction_value: "10kg",
        outcome_value: "12kg",
        prediction_correct: true,
        media_file_path: null,
      });
      push("createDataPoint", dpId > 0, `id=${dpId}`);

      const points = await getDataPointsBySession(db, sessionId);
      push("getDataPointsBySession", points.length > 0, `count=${points.length}`);

      await updateDataPoint(db, dpId, { outcome_value: "14kg" });
      const pointsAfter = await getDataPointsBySession(db, sessionId);
      push("updateDataPoint", pointsAfter[0]?.outcome_value === "14kg", `outcome=${pointsAfter[0]?.outcome_value}`);

      await deleteDataPoint(db, dpId);
      const pointsDeleted = await getDataPointsBySession(db, sessionId);
      push("deleteDataPoint", pointsDeleted.length === 0, `count=${pointsDeleted.length}`);

      // ------ Leaderboard -------------------------------------
      const scoreId = await createLeaderboardScore(db, { team_id: teamId, score: 100 });
      push("createLeaderboardScore", scoreId > 0, `id=${scoreId}`);

      const board = await getLeaderboard(db);
      push("getLeaderboard", board.length > 0, `count=${board.length}, top=${board[0]?.score}`);

      await updateLeaderboardScore(db, scoreId, 200);
      const boardAfter = await getLeaderboard(db);
      const updatedScore = boardAfter.find((s) => s.id === scoreId);
      push("updateLeaderboardScore", updatedScore?.score === 200, `score=${updatedScore?.score}`);

      await upsertLeaderboardScore(db, teamId, 300);
      const boardUpsert = await getLeaderboard(db);
      const upserted = boardUpsert.find((s) => s.id === scoreId);
      push("upsertLeaderboardScore", upserted?.score === 300, `score=${upserted?.score}`);

      await deleteLeaderboardScore(db, scoreId);
      const boardDeleted = await getLeaderboard(db);
      const stillThere = boardDeleted.find((s) => s.id === scoreId);
      push("deleteLeaderboardScore", !stillThere, `removed=${!stillThere}`);

      // ---- Cleanup ------------------------------------
      await deleteChallengeSession(db, sessionId);
      await deleteActivity(db, activityId);
      await deleteTeam(db, teamId);
      push("cleanup (cascade delete)", true, "sessions, activities, team removed");
    } catch (e: any) {
      push("UNEXPECTED ERROR", false, e?.message ?? String(e));
    } finally {
      setRunning(false);
    }
  }

  const passed = log.filter((e) => e.ok).length;
  const failed = log.filter((e) => !e.ok).length;

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.heading}>
        CRUD Tests
      </ThemedText>

      <Pressable style={[styles.button, running && styles.buttonDisabled]} onPress={runAll} disabled={running}>
        <Text style={styles.buttonText}>{running ? "Running…" : "Run All Tests"}</Text>
      </Pressable>

      {log.length > 0 && (
        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            {passed} passed · {failed} failed
          </Text>
        </View>
      )}

      <ScrollView style={styles.log} contentContainerStyle={styles.logContent}>
        {log.map((entry, i) => (
          <View key={i} style={styles.row}>
            <Text style={entry.ok ? styles.pass : styles.fail}>{entry.ok ? "✓" : "✗"}</Text>
            <View style={styles.rowText}>
              <Text style={styles.label}>{entry.label}</Text>
              <Text style={styles.detail}>{entry.detail}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 16 },
  heading: { marginBottom: 16 },
  button: {
    backgroundColor: "#0a7ea4",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  summary: {
    backgroundColor: "#f0f0f0",
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  summaryText: { textAlign: "center", fontWeight: "600", fontSize: 14 },
  log: { flex: 1 },
  logContent: { paddingBottom: 40 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
    gap: 10,
  },
  rowText: { flex: 1 },
  label: { fontWeight: "600", fontSize: 14 },
  detail: { fontSize: 12, color: "#666", marginTop: 1 },
  pass: { fontSize: 16, color: "#22c55e", fontWeight: "bold" },
  fail: { fontSize: 16, color: "#ef4444", fontWeight: "bold" },
});
