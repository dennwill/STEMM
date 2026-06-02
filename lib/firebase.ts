import { getAnalytics, isSupported, logEvent, Analytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);

// Firebase Analytics — third Firebase technology used in the app.
// Analytics is initialised conditionally because it is not supported in
// every environment (e.g. React Native without the native SDK, SSR, or
// some testing runtimes). The helper `getAnalyticsInstance()` resolves
// to the Analytics instance when available, or `null` otherwise.
let _analytics: Analytics | null = null;

export async function getAnalyticsInstance(): Promise<Analytics | null> {
  if (_analytics) return _analytics;
  try {
    const supported = await isSupported();
    if (supported) {
      _analytics = getAnalytics(app);
    }
  } catch {
    // Analytics not available in this environment
  }
  return _analytics;
}

export async function trackEvent(eventName: string, params?: Record<string, string | number>): Promise<void> {
  const analytics = await getAnalyticsInstance();
  if (analytics) {
    logEvent(analytics, eventName, params);
  }
}
