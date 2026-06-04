import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { friendlyError } from "@/lib/errors";
import { auth, firestore } from "@/lib/firebase";
import { Palette, useTheme, useThemedStyles } from "@/lib/theme";

type Team = { team_name: string; grade_level: string };
type Member = { uid: string; first_name: string; last_name: string; isMe: boolean };

export default function TeamScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const { palette: c } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const hasLoaded = useRef(false);

  // Reload whenever the tab regains focus so edits made on the edit screen
  // show up on return. The first load shows the spinner; later focus refreshes
  // are silent to avoid flashing the loading state on every tab switch.
  useFocusEffect(
    useCallback(() => {
      if (!user) {
        router.replace("/(auth)/login" as any);
        return;
      }
      loadTeam(hasLoaded.current);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.uid]),
  );

  async function loadTeam(silent = false) {
    if (!user) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const userSnap = await getDoc(doc(firestore, "users", user.uid));
      if (!userSnap.exists()) {
        setError("Your user profile is missing. Please join or create a team.");
        setTeamId(null);
        setTeam(null);
        setMembers([]);
        return;
      }

      const userData = userSnap.data() as { team_id?: string };
      const tid = userData.team_id ?? null;
      setTeamId(tid);

      if (!tid) {
        setTeam(null);
        setMembers([]);
        return;
      }

      // Parallel fetch: team doc and members query are independent reads
      const [teamSnap, membersSnap] = await Promise.all([
        getDoc(doc(firestore, "teams", tid)),
        getDocs(
          query(
            collection(firestore, "users"),
            where("team_id", "==", tid),
          ),
        ),
      ]);

      if (!teamSnap.exists()) {
        setError("Your team no longer exists.");
        setTeam(null);
        setMembers([]);
        return;
      }
      setTeam(teamSnap.data() as Team);

      const list: Member[] = membersSnap.docs.map((d) => {
        const data = d.data() as { first_name: string; last_name: string };
        return {
          uid: d.id,
          first_name: data.first_name,
          last_name: data.last_name,
          isMe: d.id === user.uid,
        };
      });
      setMembers(list);
    } catch (e: any) {
      setError(friendlyError(e, "Failed to load your team. Please try again."));
    } finally {
      hasLoaded.current = true;
      setLoading(false);
    }
  }

  async function logout() {
    await signOut(auth);
    router.replace("/(auth)/login" as any);
  }

  function confirmLeaveTeam() {
    if (!team) return;
    Alert.alert(
      "Leave team?",
      `You'll be removed from ${team.team_name}. You can join again later with the team code.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Leave", style: "destructive", onPress: leaveTeam },
      ],
    );
  }

  async function leaveTeam() {
    const u = auth.currentUser;
    if (!u) return;
    setError(null);
    try {
      await updateDoc(doc(firestore, "users", u.uid), { team_id: null });
      setTeamId(null);
      setTeam(null);
      setMembers([]);
    } catch (e: any) {
      setError(friendlyError(e, "Failed to leave team. Please try again."));
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <Text style={[styles.headerLogo, { color: c.primary }]}>STEMM</Text>
          <ActivityIndicator color={c.primary} size="large" />
          <Text style={styles.loadingText}>Loading..</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerLogo}>STEMM</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Team</Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {team && teamId ? (
          <>
            <View style={styles.avatar}>
              <MaterialCommunityIcons name="face-man" size={64} color={c.inputText} />
            </View>

            <View style={styles.nameRow}>
              <Text style={styles.teamName}>{team.team_name}</Text>
              <Pressable
                hitSlop={10}
                onPress={() => router.push({ pathname: "/edit-team", params: { teamId } } as any)}
              >
                <MaterialCommunityIcons name="pencil-outline" size={20} color={c.primary} />
              </Pressable>
            </View>
            <Text style={styles.idText}>ID: {teamId}</Text>
            {!!team.grade_level && <Text style={styles.gradeLevel}>{team.grade_level}</Text>}

            <Text style={styles.sectionLabel}>Members ({members.length})</Text>
            <View style={styles.menu}>
              {members.map((m) => (
                <View key={m.uid} style={styles.memberRow}>
                  <Text style={styles.memberName}>
                    {m.first_name} {m.last_name}
                  </Text>
                  {m.isMe && <Text style={styles.youBadge}>You</Text>}
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardHeading}>Get on a team to continue</Text>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => router.push("/(auth)/create-team" as any)}
            >
              <Text style={styles.primaryBtnText}>Create a new team</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => router.push("/(auth)/join-team" as any)}
            >
              <Text style={styles.secondaryBtnText}>Join an existing team</Text>
            </Pressable>
          </View>
        )}

        <View style={[styles.menu, styles.menuSpaced]}>
          <MenuRow label="Settings" onPress={() => router.push("/settings" as any)} />
          <MenuRow
            label="Terms and Conditions"
            onPress={() => router.push("/terms" as any)}
          />
          <MenuRow label="Privacy Policy" onPress={() => router.push("/privacy" as any)} />
          {team && teamId && (
            <MenuRow label="Leave Team" danger onPress={confirmLeaveTeam} />
          )}
          <MenuRow label="Log Out" danger last onPress={logout} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuRow({
  label,
  onPress,
  danger,
  last,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuRow,
        last && styles.menuRowLast,
        pressed && styles.menuRowPressed,
      ]}
      onPress={onPress}
    >
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
    </Pressable>
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
  },
  headerLogo: { color: c.white, fontSize: 34, fontWeight: "900", letterSpacing: -1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 },
  pageTitle: {
    color: c.primary,
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 20,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 16,
  },
  loadingText: { color: c.primary, fontSize: 16 },
  errorBox: {
    backgroundColor: c.errorBg,
    borderColor: c.errorBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: c.error, fontSize: 14 },
  avatar: {
    alignSelf: "center",
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: c.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.input,
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.12)",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  teamName: { color: c.primary, fontSize: 22, fontWeight: "800" },
  idText: { color: c.inputText, fontSize: 16, textAlign: "center", marginTop: 4 },
  gradeLevel: { color: c.muted, fontSize: 14, textAlign: "center", marginTop: 2 },
  sectionLabel: {
    color: c.muted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 28,
    marginBottom: 4,
  },
  menu: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.input,
  },
  menuSpaced: { marginTop: 28 },
  menuRow: {
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.input,
  },
  menuRowLast: { borderBottomWidth: 0 },
  menuRowPressed: { opacity: 0.5 },
  menuLabel: { color: c.inputText, fontSize: 16, fontWeight: "600" },
  menuLabelDanger: { color: c.error, fontWeight: "700" },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.input,
  },
  memberName: { color: c.inputText, fontSize: 16 },
  youBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: c.primary,
    backgroundColor: c.white,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden",
  },
  card: {
    backgroundColor: c.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.input,
    padding: 16,
    gap: 8,
  },
  cardHeading: {
    color: c.primary,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  primaryBtn: {
    backgroundColor: c.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnText: { color: c.white, fontSize: 16, fontWeight: "700" },
  secondaryBtn: {
    backgroundColor: c.input,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  secondaryBtnText: { color: c.primary, fontSize: 16, fontWeight: "700" },
  });
