import { useRouter } from "expo-router";
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
import { useEffect, useState } from "react";
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

import { COLORS } from "@/components/auth-shell";
import { friendlyError } from "@/lib/errors";
import { auth, firestore } from "@/lib/firebase";

type Team = { team_name: string; grade_level: string };
type Member = { uid: string; first_name: string; last_name: string; isMe: boolean };

export default function DashboardScreen() {
  const router = useRouter();
  const user = auth.currentUser;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (!user) {
      router.replace("/(auth)/login" as any);
      return;
    }
    loadTeam();
  }, [user?.uid]);

  async function loadTeam() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const userSnap = await getDoc(doc(firestore, "users", user.uid));
      if (!userSnap.exists()) {
        setError("Your user profile is missing. Please join or create a team.");
        return;
      }

      const userData = userSnap.data() as { team_id?: string };
      const tid = userData.team_id ?? null;
      setTeamId(tid);

      if (!tid) {
        setError("You're not on a team yet.");
        return;
      }

      const teamSnap = await getDoc(doc(firestore, "teams", tid));
      if (!teamSnap.exists()) {
        setError("Your team no longer exists.");
        return;
      }
      setTeam(teamSnap.data() as Team);

      const membersQuery = query(
        collection(firestore, "users"),
        where("team_id", "==", tid),
      );
      const membersSnap = await getDocs(membersQuery);
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
          <Text style={styles.logo}>STEMM</Text>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>Loading..</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoWrap}>
          <Text style={styles.logo}>STEMM</Text>
        </View>

        {user?.email && <Text style={styles.email}>Signed in as {user.email}</Text>}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!team && (
          <View style={styles.card}>
            <Text style={styles.cardHeading}>Get on a team to continue</Text>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => router.replace("/(auth)/create-team" as any)}
            >
              <Text style={styles.primaryBtnText}>Create a new team</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => router.replace("/(auth)/join-team" as any)}
            >
              <Text style={styles.secondaryBtnText}>Join an existing team</Text>
            </Pressable>
          </View>
        )}

        {team && teamId && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Team</Text>
            <Text style={styles.teamName}>{team.team_name}</Text>
            <Text style={styles.gradeLevel}>{team.grade_level}</Text>

            <Text style={styles.cardLabel}>Team ID</Text>
            <View style={styles.idBox}>
              <Text style={styles.idText}>{teamId}</Text>
            </View>

            <Text style={styles.cardLabel}>Members ({members.length})</Text>
            {members.map((m) => (
              <View key={m.uid} style={styles.memberRow}>
                <Text style={styles.memberName}>
                  {m.first_name} {m.last_name}
                </Text>
                {m.isMe && <Text style={styles.youBadge}>You</Text>}
              </View>
            ))}

            <Pressable style={styles.leaveBtn} onPress={confirmLeaveTeam}>
              <Text style={styles.leaveBtnText}>Leave team</Text>
            </Pressable>
          </View>
        )}

        <Pressable style={styles.signOutBtn} onPress={logout}>
          <Text style={styles.signOutBtnText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, gap: 16 },
  logoWrap: { alignItems: "center", marginBottom: 4 },
  logo: { color: COLORS.primary, fontSize: 48, fontWeight: "900", letterSpacing: -1 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 16 },
  loadingText: { color: COLORS.primary, fontSize: 16 },
  email: { color: COLORS.muted, fontSize: 13, textAlign: "center" },
  errorBox: {
    backgroundColor: COLORS.errorBg,
    borderColor: COLORS.errorBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  errorText: { color: COLORS.error, fontSize: 14 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.input,
    padding: 16,
    gap: 8,
  },
  cardHeading: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  cardLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 8,
  },
  teamName: { color: COLORS.primary, fontSize: 22, fontWeight: "700" },
  gradeLevel: { color: COLORS.muted, fontSize: 14 },
  idBox: {
    backgroundColor: COLORS.input,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  idText: { color: COLORS.inputText, fontSize: 20, fontWeight: "700", letterSpacing: 4 },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.input,
  },
  memberName: { color: COLORS.inputText, fontSize: 16 },
  youBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden",
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnText: { color: COLORS.white, fontSize: 16, fontWeight: "700" },
  secondaryBtn: {
    backgroundColor: COLORS.input,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  secondaryBtnText: { color: COLORS.primary, fontSize: 16, fontWeight: "700" },
  leaveBtn: {
    backgroundColor: COLORS.errorBg,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  leaveBtnText: { color: COLORS.error, fontSize: 14, fontWeight: "600" },
  signOutBtn: {
    borderWidth: 1,
    borderColor: COLORS.input,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  signOutBtnText: { color: COLORS.primary, fontSize: 16, fontWeight: "600" },
});
