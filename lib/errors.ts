const FRIENDLY_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Invalid email or password.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/weak-password": "Password is too weak. Use at least 6 characters.",
  "auth/user-not-found": "No account found with that email.",
  "auth/wrong-password": "Invalid email or password.",
  "auth/too-many-requests": "Too many attempts. Please try again in a few minutes.",
  "auth/network-request-failed": "Network error. Please check your connection.",
  "auth/missing-password": "Please enter a password.",
  "auth/missing-email": "Please enter an email.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/operation-not-allowed": "Email/password sign-in is not enabled.",
  "auth/requires-recent-login": "Please sign in again to continue.",
  "permission-denied": "You don't have permission to do that.",
  unavailable: "Network error. Please try again.",
  "deadline-exceeded": "Request timed out. Please try again.",
  "not-found": "We couldn't find that.",
  "already-exists": "That already exists.",
};

export function friendlyError(
  e: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  const code = (e as any)?.code;
  if (typeof code === "string" && FRIENDLY_MESSAGES[code]) {
    return FRIENDLY_MESSAGES[code];
  }
  return fallback;
}
