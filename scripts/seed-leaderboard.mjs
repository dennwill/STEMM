// Seeds the `teams` collection with dummy data so the Leaderboard has rankings.
//
// Usage (Node 20.6+, reads Firebase config from .env):
//   node --env-file=.env scripts/seed-leaderboard.mjs <email> <password>
//   node --env-file=.env scripts/seed-leaderboard.mjs <email> <password> --clear
//
// Or set SEED_EMAIL / SEED_PASSWORD instead of passing them as args.
// Use an account you've registered in the app — the script signs in so its
// writes pass the same Firestore security rules the app uses.

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!config.apiKey || !config.projectId) {
  console.error(
    "Missing Firebase env vars. Run with:\n  node --env-file=.env scripts/seed-leaderboard.mjs <email> <password>",
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const clear = args.includes("--clear");
const positional = args.filter((a) => !a.startsWith("--"));
const email = process.env.SEED_EMAIL ?? positional[0];
const password = process.env.SEED_PASSWORD ?? positional[1];

if (!email || !password) {
  console.error(
    "Provide credentials (an account registered in the app):\n" +
      "  node --env-file=.env scripts/seed-leaderboard.mjs you@example.com yourpassword\n" +
      "  (or set SEED_EMAIL / SEED_PASSWORD)",
  );
  process.exit(1);
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const makeId = (n = 6) =>
  Array.from({ length: n }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");

// 5th Grade has 5 teams, 6th Grade has 4 teams.
const TEAMS = [
  { team_name: "Team Archimedes", grade_level: "5th Grade" },
  { team_name: "Team Aristotle", grade_level: "5th Grade" },
  { team_name: "Team Galileo", grade_level: "5th Grade" },
  { team_name: "Team Newton", grade_level: "5th Grade" },
  { team_name: "Team Curie", grade_level: "5th Grade" },
  { team_name: "Team Zeus", grade_level: "6th Grade" },
  { team_name: "Team Poseidon", grade_level: "6th Grade" },
  { team_name: "Team Hades", grade_level: "6th Grade" },
  { team_name: "Team Tesla", grade_level: "6th Grade" },
];

const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  console.log(`Signed in as ${user.email}`);

  if (clear) {
    const snap = await getDocs(query(collection(db, "teams"), where("seed", "==", true)));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    console.log(`Removed ${snap.size} seeded team(s).`);
    return;
  }

  await Promise.all(
    TEAMS.map(({ team_name, grade_level }) =>
      setDoc(doc(db, "teams", makeId()), {
        team_name,
        grade_level,
        score: Math.floor(Math.random() * 1000),
        seed: true,
        created_by_uid: user.uid,
        created_at: serverTimestamp(),
      }),
    ),
  );
  console.log(`Seeded ${TEAMS.length} dummy teams. Open the Leaderboard to see them.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Seeding failed:", e?.message ?? e);
    process.exit(1);
  });
