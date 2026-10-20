import { useEffect } from 'react';
import { Stack, DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { disableExecuTorchTelemetry } from '@/services/telemetry';
import { recoverInterruptedRecordings } from '@/services/storage/database';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    // 1. Opt-out of anonymous telemetry on startup
    disableExecuTorchTelemetry();

    // 2. Recover any recordings interrupted by app kill or device shutdown
    recoverInterruptedRecordings().catch((err) => {
      console.warn('[App] Failed to run crash recovery:', err);
    });

    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: isDark ? '#121316' : '#f8f8fb' },
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen
          name="record"
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="transcript/[id]"
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="notes/[id]"
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="persona-modal"
          options={{
            presentation: 'modal',
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
