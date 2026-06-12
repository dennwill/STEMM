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

function makeRunData() {
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const label = (base: string) => `${base} ${suffix}`;

  return {
    suffix,
    team: {
      discriminant_id: `crud-${suffix}`,
      team_name: label("Team"),
      grade_level: `${(suffix.length % 12) + 1}th`,
      updated_name: label("Team Updated"),
    },
    member: {
      first_name: label("Member"),
      updated_name: label("Member Updated"),
    },
    activity: {
      category: label("Science"),
      challenge_name: label("Challenge"),
      description: label("Dynamic CRUD challenge description"),
      updated_name: label("Challenge v2"),
    },
    session: {
      prediction_text: label("Prediction"),
      discussion_reflection: label("Reflection"),
    },
    dataPoint: {
      action_or_design: label("Design"),
      prediction_value: `${suffix.length * 2} units`,
      outcome_value: `${suffix.length * 3} units`,
      updated_outcome: `${suffix.length * 4} units`,
    },
    leaderboard: {
      initial_score: 100 + suffix.length,
      updated_score: 200 + suffix.length,
      upserted_score: 300 + suffix.length,
    },
  };
}

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
      const data = makeRunData();
      push("dynamic input seed", true, data.suffix);

      // ------ Teams ---------------------------------
      const teamId = await createTeam(db, {
        discriminant_id: data.team.discriminant_id,
        team_name: data.team.team_name,
        grade_level: data.team.grade_level,
      });
      push("createTeam", teamId > 0, `id=${teamId}`);

      const teams = await getAllTeams(db);
      const found = teams.find((t) => t.id === teamId);
      push(
        "getAllTeams",
        found?.team_name === data.team.team_name && found?.grade_level === data.team.grade_level,
        `count=${teams.length}, name=${found?.team_name}, grade=${found?.grade_level}`,
      );

      await updateTeam(db, teamId, { team_name: data.team.updated_name });
      const teamsAfter = await getAllTeams(db);
      const updated = teamsAfter.find((t) => t.id === teamId);
      push("updateTeam", updated?.team_name === data.team.updated_name, `name=${updated?.team_name}`);

      // ------- Team Members ---------------------------------
      const memberId = await createTeamMember(db, { team_id: teamId, first_name: data.member.first_name });
      push("createTeamMember", memberId > 0, `id=${memberId}`);

      const members = await getMembersByTeam(db, teamId);
      push(
        "getMembersByTeam",
        members.some((m) => m.id === memberId && m.first_name === data.member.first_name),
        `count=${members.length}, name=${members.find((m) => m.id === memberId)?.first_name}`,
      );

      await updateTeamMember(db, memberId, { first_name: data.member.updated_name });
      const membersAfter = await getMembersByTeam(db, teamId);
      const updatedMember = membersAfter.find((m) => m.id === memberId);
      push("updateTeamMember", updatedMember?.first_name === data.member.updated_name, `name=${updatedMember?.first_name}`);

      await deleteTeamMember(db, memberId);
      const membersDeleted = await getMembersByTeam(db, teamId);
      push("deleteTeamMember", !membersDeleted.some((m) => m.id === memberId), `remaining=${membersDeleted.length}`);

      // ------- Activities ------------------------------------
      const activityId = await createActivity(db, {
        category: data.activity.category,
        challenge_name: data.activity.challenge_name,
        description: data.activity.description,
      });
      push("createActivity", activityId > 0, `id=${activityId}`);

      const activities = await getAllActivities(db);
      const foundActivity = activities.find((a) => a.id === activityId);
      push(
        "getAllActivities",
        foundActivity?.challenge_name === data.activity.challenge_name,
        `count=${activities.length}, name=${foundActivity?.challenge_name}`,
      );

      await updateActivity(db, activityId, { challenge_name: data.activity.updated_name });
      const activitiesAfter = await getAllActivities(db);
      const updatedActivity = activitiesAfter.find((a) => a.id === activityId);
      push(
        "updateActivity",
        updatedActivity?.challenge_name === data.activity.updated_name,
        `name=${updatedActivity?.challenge_name}`,
      );

      // --------- Challenge Sessions -------------------------------------
      const sessionId = await createChallengeSession(db, {
        team_id: teamId,
        activity_id: activityId,
        prediction_text: data.session.prediction_text,
        discussion_reflection: null,
      });
      push("createChallengeSession", sessionId > 0, `id=${sessionId}`);

      const sessions = await getSessionsByTeam(db, teamId);
      push(
        "getSessionsByTeam",
        sessions.some((s) => s.id === sessionId && s.prediction_text === data.session.prediction_text),
        `count=${sessions.length}`,
      );

      await updateChallengeSession(db, sessionId, { discussion_reflection: data.session.discussion_reflection });
      const sessionsAfter = await getSessionsByTeam(db, teamId);
      const updatedSession = sessionsAfter.find((s) => s.id === sessionId);
      push(
        "updateChallengeSession",
        updatedSession?.discussion_reflection === data.session.discussion_reflection,
        `reflection=${updatedSession?.discussion_reflection}`,
      );

      // ----- Data Points -----------------------------------
      const dpId = await createDataPoint(db, {
        session_id: sessionId,
        attempt_number: 1,
        action_or_design: data.dataPoint.action_or_design,
        prediction_value: data.dataPoint.prediction_value,
        outcome_value: data.dataPoint.outcome_value,
        prediction_correct: true,
        media_file_path: null,
      });
      push("createDataPoint", dpId > 0, `id=${dpId}`);

      const points = await getDataPointsBySession(db, sessionId);
      push(
        "getDataPointsBySession",
        points.some((p) => p.id === dpId && p.outcome_value === data.dataPoint.outcome_value),
        `count=${points.length}`,
      );

      await updateDataPoint(db, dpId, { outcome_value: data.dataPoint.updated_outcome });
      const pointsAfter = await getDataPointsBySession(db, sessionId);
      const updatedPoint = pointsAfter.find((p) => p.id === dpId);
      push("updateDataPoint", updatedPoint?.outcome_value === data.dataPoint.updated_outcome, `outcome=${updatedPoint?.outcome_value}`);

      await deleteDataPoint(db, dpId);
      const pointsDeleted = await getDataPointsBySession(db, sessionId);
      push("deleteDataPoint", !pointsDeleted.some((p) => p.id === dpId), `remaining=${pointsDeleted.length}`);

      // ------ Leaderboard -------------------------------------
      const scoreId = await createLeaderboardScore(db, { team_id: teamId, score: data.leaderboard.initial_score });
      push("createLeaderboardScore", scoreId > 0, `id=${scoreId}`);

      const board = await getLeaderboard(db);
      push(
        "getLeaderboard",
        board.some((s) => s.id === scoreId && s.score === data.leaderboard.initial_score),
        `count=${board.length}, inserted=${data.leaderboard.initial_score}`,
      );

      await updateLeaderboardScore(db, scoreId, data.leaderboard.updated_score);
      const boardAfter = await getLeaderboard(db);
      const updatedScore = boardAfter.find((s) => s.id === scoreId);
      push("updateLeaderboardScore", updatedScore?.score === data.leaderboard.updated_score, `score=${updatedScore?.score}`);

      await upsertLeaderboardScore(db, teamId, data.leaderboard.upserted_score);
      const boardUpsert = await getLeaderboard(db);
      const upserted = boardUpsert.find((s) => s.id === scoreId);
      push("upsertLeaderboardScore", upserted?.score === data.leaderboard.upserted_score, `score=${upserted?.score}`);

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
