import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { PressableScale } from "@/components/pressable-scale";
import { DURATIONS, SPRINGS } from "@/constants/motion";
import { friendlyError } from "@/lib/errors";
import { auth, firestore } from "@/lib/firebase";
import { Palette, useTheme, useThemedStyles } from "@/lib/theme";

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
  const { palette: c } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        ring && styles.avatarRing,
      ]}
    >
      <MaterialCommunityIcons name={avatarFor(id)} size={size * 0.62} color={c.inputText} />
    </View>
  );
}

function YourTeamBadge() {
  const styles = useThemedStyles(makeStyles);
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
  const styles = useThemedStyles(makeStyles);
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

function DropdownCaret({ open }: { open: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const rotation = useSharedValue(0);
  useEffect(() => {
    rotation.value = withSpring(open ? 180 : 0, SPRINGS.bouncy);
  }, [open, rotation]);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  return (
    <Animated.Text style={[styles.dropdownCaret, style]}>▾</Animated.Text>
  );
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const { palette: c } = useTheme();
  const styles = useThemedStyles(makeStyles);

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
        <PressableScale
          onPress={handleRefresh}
          disabled={refreshing}
          hitSlop={12}
          style={[styles.refreshBtn, refreshing && styles.refreshBtnDisabled]}
        >
          <MaterialCommunityIcons name="refresh" size={26} color={c.white} />
        </PressableScale>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={c.primary}
            colors={[c.primary]}
          />
        }
      >
        <Text style={styles.pageTitle}>Leaderboard</Text>

        <PressableScale
          onPress={() => setShowGradeList((v) => !v)}
          haptic={false}
          style={styles.dropdownTrigger}
        >
          <Text style={grade ? styles.dropdownValue : styles.dropdownPlaceholder}>
            {grade ?? "Grade Level"}
          </Text>
          <DropdownCaret open={showGradeList} />
        </PressableScale>

        {showGradeList && (
          <Animated.View
            entering={FadeIn.duration(DURATIONS.fast)}
            exiting={FadeOut.duration(120)}
            style={styles.dropdownList}
          >
            <PressableScale
              haptic={false}
              onPress={() => {
                setGrade(null);
                setShowGradeList(false);
              }}
              style={[styles.dropdownItem, !grade && styles.dropdownItemSelected]}
            >
              <Text style={[styles.dropdownItemText, !grade && styles.dropdownItemTextSelected]}>
                All Grades
              </Text>
            </PressableScale>
            {GRADE_LEVELS.map((g) => (
              <PressableScale
                key={g}
                haptic={false}
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
              </PressableScale>
            ))}
          </Animated.View>
        )}

        {loading ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator color={c.primary} size="large" />
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
            <Animated.View
              entering={FadeInDown.duration(400).springify()}
              style={styles.podium}
            >
              <View style={styles.podiumColumn}>
                {second && <PodiumSlot team={second} rank={2} mine={second.id === myTeamId} />}
              </View>
              <View style={styles.podiumColumn}>
                {first && <PodiumSlot team={first} rank={1} lead mine={first.id === myTeamId} />}
              </View>
              <View style={styles.podiumColumn}>
                {third && <PodiumSlot team={third} rank={3} mine={third.id === myTeamId} />}
              </View>
            </Animated.View>

            <View style={styles.list}>
              {rest.map((t, i) => {
                const mine = t.id === myTeamId;
                return (
                  <Animated.View
                    key={t.id}
                    entering={FadeInDown.delay(i * 50).springify()}
                    layout={LinearTransition.springify()}
                    style={[styles.listRow, mine && styles.listRowMine]}
                  >
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
                  </Animated.View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  header: {
    backgroundColor: c.primary,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: { color: c.white, fontSize: 34, fontWeight: "900", letterSpacing: -1 },
  refreshBtn: { padding: 4 },
  refreshBtnDisabled: { opacity: 0.5 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
  pageTitle: {
    color: c.primary,
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 20,
  },
  dropdownTrigger: {
    backgroundColor: c.input,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownValue: { color: c.inputText, fontSize: 16 },
  dropdownPlaceholder: { color: c.muted, fontSize: 16 },
  dropdownCaret: { color: c.muted, fontSize: 16 },
  dropdownList: {
    backgroundColor: c.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.input,
    overflow: "hidden",
    marginTop: 8,
  },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12 },
  dropdownItemSelected: { backgroundColor: c.bg },
  dropdownItemText: { color: c.inputText, fontSize: 16 },
  dropdownItemTextSelected: { color: c.primary, fontWeight: "600" },
  stateWrap: { paddingTop: 64, alignItems: "center" },
  emptyText: { color: c.muted, fontSize: 15 },
  errorBox: {
    backgroundColor: c.errorBg,
    borderColor: c.errorBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginTop: 24,
  },
  errorText: { color: c.error, fontSize: 14 },
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
    color: c.inputText,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  podiumScore: { color: c.primary, fontSize: 13, fontWeight: "800", marginTop: 2 },
  avatar: {
    backgroundColor: c.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarRing: { borderWidth: 3, borderColor: c.primary },
  badge: {
    backgroundColor: c.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: {
    color: c.white,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  list: { gap: 14 },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.white,
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
  listRowMine: { borderWidth: 2, borderColor: c.primary },
  listRank: { width: 22, alignItems: "center" },
  listRankText: { color: c.muted, fontSize: 15, fontWeight: "800" },
  listInfo: { flex: 1 },
  listNameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  listName: { color: c.inputText, fontSize: 16, fontWeight: "700" },
  listScore: { color: c.primary, fontSize: 13, fontWeight: "700", marginTop: 2 },
  });
