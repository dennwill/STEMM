/**
 * Central motion tokens so animations feel consistent across the app.
 * Personality: springy & lively — spring-based with a subtle bounce.
 */

import type { WithSpringConfig } from "react-native-reanimated";

export const SPRINGS = {
  /** Snappy spring for press-down scale feedback. */
  press: { damping: 15, stiffness: 400, mass: 0.5 } as WithSpringConfig,
  /** Livelier spring with a touch of bounce for entrances / active states. */
  bouncy: { damping: 12, stiffness: 180, mass: 0.8 } as WithSpringConfig,
};

/** Timing durations (ms) for fades and crossfades. */
export const DURATIONS = {
  fast: 150,
  base: 220,
  slow: 350,
};

/** How far a pressable scales down on press. */
export const PRESS_SCALE = 0.96;
