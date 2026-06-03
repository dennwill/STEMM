import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS } from "@/components/auth-shell";
import { friendlyError } from "@/lib/errors";
import { auth, firestore } from "@/lib/firebase";

const GRADE_LEVELS = [
  "Kindergarten",
  "1st Grade",
  "2nd Grade",
  "3rd Grade",
  "4th Grade",
  "5th Grade",
  "6th Grade",
  "7th Grade",
  "8th Grade",
  "9th Grade",
  "10th Grade",
  "11th Grade",
  "12th Grade",
];

// A small palette so each team gets a stable, distinct avatar.
const AVATARS: (keyof typeof MaterialCommunityIcons.glyphMap)[] = [
  "face-man",
  "face-woman",
  "face-man-outline",
  "emoticon-happy-outline",
  "face-woman-outline",
  "emoticon-outline",
];

type Team = { id: string; team_name: string; grade_level: string; score: number };

function avatarFor(id: string): keyof typeof MaterialCommunityIcons.glyphMap {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATARS[hash % AVATARS.length];
}

function Avatar({ id, size, ring }: { id: string; size: number; ring?: boolean }) {
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        ring && styles.avatarRing,
      ]}
    >
      <MaterialCommunityIcons name={avatarFor(id)} size={size * 0.62} color={COLORS.inputText} />
    </View>
  );
}

function YourTeamBadge() {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>YOUR TEAM</Text>
    </View>
  );
}

const MEDAL_COLORS: Record<number, string> = {
  1: "#F5B400", // gold
  2: "#A8B0BA", // silver
  3: "#CD7F32", // bronze
};

function PodiumSlot({
  team,
  rank,
  lead,
  mine,
}: {
  team: Team;
  rank: number;
  lead?: boolean;
  mine?: boolean;
}) {
  return (
    <View style={[styles.podiumSlot, lead && styles.podiumLead]}>
      <Avatar id={team.id} size={lead ? 92 : 76} ring={mine} />
      <MaterialCommunityIcons
        name="medal"
        size={lead ? 30 : 26}
        color={MEDAL_COLORS[rank]}
        style={styles.podiumMedal}
      />
      <Text style={styles.podiumName} numberOfLines={2}>
        {team.team_name}
      </Text>
      {mine && <YourTeamBadge />}
      <Text style={styles.podiumScore}>{team.score} pts</Text>
    </View>
  );
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const user = auth.currentUser;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [grade, setGrade] = useState<string | null>(null);
  const [showGradeList, setShowGradeList] = useState(false);

  const loadTeams = useCallback(async (opts?: { silent?: boolean }) => {
    // A manual refresh keeps the current list on screen and shows the lightweight
    // spinner; only the initial load uses the full-page ActivityIndicator.
    if (opts?.silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      // Parallel fetch: user profile and all teams loaded simultaneously
      const [userSnap, teamsSnap] = await Promise.all([
        user ? getDoc(doc(firestore, "users", user.uid)) : Promise.resolve(null),
        getDocs(collection(firestore, "teams")),
      ]);

      if (userSnap) {
        const userData = userSnap.data() as { team_id?: string } | undefined;
        setMyTeamId(userData?.team_id ?? null);
      }

      const list: Team[] = teamsSnap.docs.map((d) => {
        const data = d.data() as { team_name?: string; grade_level?: string; score?: number };
        return {
          id: d.id,
          team_name: data.team_name ?? "Unnamed Team",
          grade_level: data.grade_level ?? "",
          score: typeof data.score === "number" ? data.score : 0,
        };
      });
      setTeams(list);
    } catch (e: any) {
      setError(friendlyError(e, "Failed to load the leaderboard. Please try again."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  const handleRefresh = useCallback(() => loadTeams({ silent: true }), [loadTeams]);

  useEffect(() => {
    if (!user) {
      router.replace("/(auth)/login" as any);
      return;
    }
    loadTeams();
  }, [loadTeams, router, user]);

  const ranked = teams
    .filter((t) => !grade || t.grade_level === grade)
    .sort((a, b) => b.score - a.score || a.team_name.localeCompare(b.team_name));

  const [first, second, third] = ranked;
  const rest = ranked.slice(3);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.logo}>STEMM</Text>
        <Pressable
          onPress={handleRefresh}
          disabled={refreshing}
          hitSlop={12}
          style={[styles.refreshBtn, refreshing && styles.refreshBtnDisabled]}
        >
          <MaterialCommunityIcons name="refresh" size={26} color={COLORS.white} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        <Text style={styles.pageTitle}>Leaderboard</Text>

        <Pressable onPress={() => setShowGradeList((v) => !v)} style={styles.dropdownTrigger}>
          <Text style={grade ? styles.dropdownValue : styles.dropdownPlaceholder}>
            {grade ?? "Grade Level"}
          </Text>
          <Text style={styles.dropdownCaret}>{showGradeList ? "▴" : "▾"}</Text>
        </Pressable>

        {showGradeList && (
          <View style={styles.dropdownList}>
            <Pressable
              onPress={() => {
                setGrade(null);
                setShowGradeList(false);
              }}
              style={[styles.dropdownItem, !grade && styles.dropdownItemSelected]}
            >
              <Text style={[styles.dropdownItemText, !grade && styles.dropdownItemTextSelected]}>
                All Grades
              </Text>
            </Pressable>
            {GRADE_LEVELS.map((g) => (
              <Pressable
                key={g}
                onPress={() => {
                  setGrade(g);
                  setShowGradeList(false);
                }}
                style={[styles.dropdownItem, grade === g && styles.dropdownItemSelected]}
              >
                <Text
                  style={[styles.dropdownItemText, grade === g && styles.dropdownItemTextSelected]}
                >
                  {g}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {loading ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator color={COLORS.primary} size="large" />
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : ranked.length === 0 ? (
          <View style={styles.stateWrap}>
            <Text style={styles.emptyText}>No teams to rank yet.</Text>
          </View>
        ) : (
          <>
            <View style={styles.podium}>
              <View style={styles.podiumColumn}>
                {second && <PodiumSlot team={second} rank={2} mine={second.id === myTeamId} />}
              </View>
              <View style={styles.podiumColumn}>
                {first && <PodiumSlot team={first} rank={1} lead mine={first.id === myTeamId} />}
              </View>
              <View style={styles.podiumColumn}>
                {third && <PodiumSlot team={third} rank={3} mine={third.id === myTeamId} />}
              </View>
            </View>

            <View style={styles.list}>
              {rest.map((t, i) => {
                const mine = t.id === myTeamId;
                return (
                  <View key={t.id} style={[styles.listRow, mine && styles.listRowMine]}>
                    <View style={styles.listRank}>
                      <Text style={styles.listRankText}>{i + 4}</Text>
                    </View>
                    <View style={styles.listInfo}>
                      <View style={styles.listNameRow}>
                        <Text style={styles.listName}>{t.team_name}</Text>
                        {mine && <YourTeamBadge />}
                      </View>
                      <Text style={styles.listScore}>{t.score} pts</Text>
                    </View>
                    <Avatar id={t.id} size={40} ring={mine} />
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: { color: COLORS.white, fontSize: 34, fontWeight: "900", letterSpacing: -1 },
  refreshBtn: { padding: 4 },
  refreshBtnDisabled: { opacity: 0.5 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
  pageTitle: {
    color: COLORS.primary,
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 20,
  },
  dropdownTrigger: {
    backgroundColor: COLORS.input,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownValue: { color: COLORS.inputText, fontSize: 16 },
  dropdownPlaceholder: { color: COLORS.muted, fontSize: 16 },
  dropdownCaret: { color: COLORS.muted, fontSize: 16 },
  dropdownList: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.input,
    overflow: "hidden",
    marginTop: 8,
  },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12 },
  dropdownItemSelected: { backgroundColor: COLORS.bg },
  dropdownItemText: { color: COLORS.inputText, fontSize: 16 },
  dropdownItemTextSelected: { color: COLORS.primary, fontWeight: "600" },
  stateWrap: { paddingTop: 64, alignItems: "center" },
  emptyText: { color: COLORS.muted, fontSize: 15 },
  errorBox: {
    backgroundColor: COLORS.errorBg,
    borderColor: COLORS.errorBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginTop: 24,
  },
  errorText: { color: COLORS.error, fontSize: 14 },
  podium: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    marginTop: 28,
    marginBottom: 24,
  },
  podiumColumn: { flex: 1, alignItems: "center" },
  podiumSlot: { alignItems: "center", gap: 6, paddingTop: 24 },
  podiumLead: { paddingTop: 0 },
  podiumMedal: { marginTop: 4 },
  podiumName: {
    color: COLORS.inputText,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  podiumScore: { color: COLORS.primary, fontSize: 13, fontWeight: "800", marginTop: 2 },
  avatar: {
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarRing: { borderWidth: 3, borderColor: COLORS.primary },
  badge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  list: { gap: 14 },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  listRowMine: { borderWidth: 2, borderColor: COLORS.primary },
  listRank: { width: 22, alignItems: "center" },
  listRankText: { color: COLORS.muted, fontSize: 15, fontWeight: "800" },
  listInfo: { flex: 1 },
  listNameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  listName: { color: COLORS.inputText, fontSize: 16, fontWeight: "700" },
  listScore: { color: COLORS.primary, fontSize: 13, fontWeight: "700", marginTop: 2 },
});
