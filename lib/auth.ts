import { sendEmailVerification } from "firebase/auth";

import { auth } from "@/lib/firebase";

/**
 * Reloads the current user from Firebase and returns the fresh `emailVerified`
 * flag. The SDK caches this flag, so a user who just clicked the verification
 * link won't reflect as verified until a reload. Returns `false` when signed out.
 */
export async function refreshEmailVerified(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  try {
    await user.reload();
  } catch {
    // Network/transient failure — fall back to the cached flag below.
  }
  return auth.currentUser?.emailVerified ?? false;
}

/** Resends the verification email to the current user. Throws on failure. */
export async function resendVerificationEmail(): Promise<void> {
  const user = auth.currentUser;
  if (user) await sendEmailVerification(user);
}
