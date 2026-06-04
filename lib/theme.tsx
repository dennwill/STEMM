import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { StyleSheet, useColorScheme } from "react-native";

// ---------------------------------------------------------------------------
// Palettes
// ---------------------------------------------------------------------------
// The app's screens use these semantic color keys. `white` is historically the
// "card / elevated surface" color (not a literal white), so in dark mode it
// maps to a dark surface. `onPrimary` is text/icons that sit on top of the
// `primary` color.

export const lightColors = {
  bg: "#EEF0F8",
  primary: "#074C5C",
  input: "#C8C8C8",
  inputText: "#3D3D3D",
  muted: "#5A5A5A",
  white: "#FFFFFF",
  error: "#B91C1C",
  errorBg: "#FEF2F2",
  errorBorder: "#FECACA",
  onPrimary: "#FFFFFF",
};

export const darkColors: Palette = {
  bg: "#0F1419",
  primary: "#4FD1C5",
  input: "#2A2F3A",
  inputText: "#E5E7EB",
  muted: "#9AA0AB",
  white: "#1A1F29",
  error: "#F87171",
  errorBg: "#2A1416",
  errorBorder: "#5B2326",
  onPrimary: "#0F1419",
};

export type Palette = typeof lightColors;

// ---------------------------------------------------------------------------
// Per-activity themes (used by the dashboard activity cards)
// ---------------------------------------------------------------------------

export type ActivityTheme = {
  bg: string;
  accent: string;
  iconBg: string;
  textColor: string;
};

export const lightActivityThemes: Record<string, ActivityTheme> = {
  parachute: { bg: "#F0F9FF", accent: "#0284C7", iconBg: "#E0F2FE", textColor: "#0369A1" }, // Sky
  sound: { bg: "#FAF5FF", accent: "#8B5CF6", iconBg: "#F3E8FF", textColor: "#6D28D9" }, // Purple
  fan: { bg: "#FFFBEB", accent: "#D97706", iconBg: "#FEF3C7", textColor: "#B45309" }, // Amber
  earthquake: { bg: "#FFF1F2", accent: "#E11D48", iconBg: "#FFE4E6", textColor: "#BE123C" }, // Rose
  performance: { bg: "#ECFDF5", accent: "#10B981", iconBg: "#D1FAE5", textColor: "#047857" }, // Emerald
  reaction: { bg: "#EEF2FF", accent: "#6366F1", iconBg: "#E0E7FF", textColor: "#4338CA" }, // Indigo
  breathing: { bg: "#F0FDFA", accent: "#14B8A6", iconBg: "#CCFBF1", textColor: "#0F766E" }, // Teal
};

// Dark variants keep each activity's hue identity but flip lightness:
// bg -> 900/950, accent -> 400, iconBg -> 900, textColor -> 300.
export const darkActivityThemes: Record<string, ActivityTheme> = {
  parachute: { bg: "#082F49", accent: "#38BDF8", iconBg: "#0C4A6E", textColor: "#7DD3FC" }, // Sky
  sound: { bg: "#3B0764", accent: "#A78BFA", iconBg: "#4C1D95", textColor: "#C4B5FD" }, // Purple
  fan: { bg: "#451A03", accent: "#FBBF24", iconBg: "#78350F", textColor: "#FCD34D" }, // Amber
  earthquake: { bg: "#4C0519", accent: "#FB7185", iconBg: "#881337", textColor: "#FDA4AF" }, // Rose
  performance: { bg: "#022C22", accent: "#34D399", iconBg: "#064E3B", textColor: "#6EE7B7" }, // Emerald
  reaction: { bg: "#1E1B4B", accent: "#818CF8", iconBg: "#312E81", textColor: "#A5B4FC" }, // Indigo
  breathing: { bg: "#042F2E", accent: "#2DD4BF", iconBg: "#134E4A", textColor: "#5EEAD4" }, // Teal
};

// ---------------------------------------------------------------------------
// Theme context
// ---------------------------------------------------------------------------

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "@stemm/theme-mode";

type ThemeContextValue = {
  mode: ThemeMode;
  palette: Palette;
  activityThemes: Record<string, ActivityTheme>;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [ready, setReady] = useState(false);

  // Load the persisted preference once on mount. Gate children until it
  // resolves so a previously-chosen dark mode doesn't flash light on launch.
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (active && isThemeMode(stored)) setModeState(stored);
      })
      .catch(() => {
        /* fall back to system default */
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      /* persistence is best-effort */
    });
  }, []);

  const effectiveMode = mode === "system" ? systemScheme ?? "light" : mode;
  const isDark = effectiveMode === "dark";
  const palette = isDark ? darkColors : lightColors;
  const activityThemes = isDark ? darkActivityThemes : lightActivityThemes;

  const toggle = useCallback(() => {
    setMode(isDark ? "light" : "dark");
  }, [isDark, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, palette, activityThemes, isDark, setMode, toggle }),
    [mode, palette, activityThemes, isDark, setMode, toggle]
  );

  if (!ready) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within an AppThemeProvider");
  return ctx;
}

export function usePalette(): Palette {
  return useTheme().palette;
}

/**
 * Builds theme-reactive styles. Pass a module-level factory `(c) => StyleSheet
 * .create({...})`; the result is memoized per palette and rebuilt when the
 * active theme changes.
 */
export function useThemedStyles<T>(factory: (c: Palette) => T): T {
  const { palette } = useTheme();
  return useMemo(() => factory(palette), [factory, palette]);
}

// ---------------------------------------------------------------------------
// Auth form field styles (was a static `fieldStyles` export in auth-shell)
// ---------------------------------------------------------------------------

const makeFieldStyles = (c: Palette) =>
  StyleSheet.create({
    label: {
      color: c.primary,
      fontSize: 15,
      marginBottom: 6,
    },
    input: {
      backgroundColor: c.input,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      color: c.inputText,
      fontSize: 16,
    },
    group: {
      marginBottom: 14,
    },
    errorText: {
      color: c.error,
      fontSize: 14,
      marginBottom: 8,
    },
  });

export function useFieldStyles() {
  return useThemedStyles(makeFieldStyles);
}

// ---------------------------------------------------------------------------
// Wizard accents (lavender chrome used by the activity step-wizards:
// sound / fan / parachute / earthquake / health-activities)
// ---------------------------------------------------------------------------

export type WizardAccent = {
  tabActive: string;
  tableHeader: string;
  softHeader: string;
  border: string;
};

export const lightWizardAccent: WizardAccent = {
  tabActive: "#DCDDF2",
  tableHeader: "#C9CCEC",
  softHeader: "#EFEDF8",
  border: "#E2E2EC",
};

export const darkWizardAccent: WizardAccent = {
  tabActive: "#2E3550",
  tableHeader: "#3A4060",
  softHeader: "#222A3D",
  border: "#333A4A",
};

/**
 * Theme-reactive styles for the activity step-wizards. Pass a factory
 * `(c, accent) => StyleSheet.create({...})`; it's memoized per theme.
 */
export function useWizardStyles<T>(factory: (c: Palette, accent: WizardAccent) => T): T {
  const { palette, isDark } = useTheme();
  const accent = isDark ? darkWizardAccent : lightWizardAccent;
  return useMemo(() => factory(palette, accent), [factory, palette, accent]);
}
