import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AppThemeProvider, useTheme } from '@/lib/theme';
import { registerBackgroundSync } from '@/lib/background-tasks';
import { DATABASE_NAME, migrateDbIfNeeded } from '@/lib/db';
import { registerForPushNotifications } from '@/lib/notifications';

export const unstable_settings = {
  anchor: '(auth)',
};

export default function RootLayout() {
  useEffect(() => {
    // Parallel initialization: register background sync and notification permissions concurrently
    Promise.all([
      registerBackgroundSync(),
      registerForPushNotifications(),
    ]).catch((err) => console.warn('Parallel init error:', err));
  }, []);

  return (
    <AppThemeProvider>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
        <RootLayoutNav />
      </SQLiteProvider>
    </AppThemeProvider>
  );
}

function RootLayoutNav() {
  const { isDark, palette } = useTheme();

  // Match the navigator background to the app background so screen swaps
  // never flash the navigator's default white card.
  const base = isDark ? DarkTheme : DefaultTheme;
  const theme = { ...base, colors: { ...base.colors, background: palette.bg } };

  return (
    <ThemeProvider value={theme}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            animationDuration: 200,
            contentStyle: { backgroundColor: palette.bg },
          }}
        >
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(main)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="edit-team" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="parachute" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="sound" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="fan" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="earthquake" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="performance" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="reaction" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="breathing" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="terms" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="privacy" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style={isDark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
