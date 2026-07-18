import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import {
  BackHandler,
  Platform,
  StyleSheet,
  ToastAndroid,
  useColorScheme,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { LanguageProvider, useLanguage } from '@/i18n';

const EXIT_CONFIRMATION_WINDOW_MS = 2000;

function AndroidDoubleBackExit() {
  const { t } = useLanguage();
  const router = useRouter();
  const lastBackPressAt = React.useRef(0);

  React.useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (router.canGoBack()) {
        return false;
      }

      const now = Date.now();

      if (now - lastBackPressAt.current <= EXIT_CONFIRMATION_WINDOW_MS) {
        BackHandler.exitApp();
        return true;
      }

      lastBackPressAt.current = now;
      ToastAndroid.show(t('common.pressBackAgainToExit'), ToastAndroid.SHORT);
      return true;
    });

    return () => subscription.remove();
  }, [router, t]);

  return null;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const baseTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: colors.accent,
      background: colors.background,
      card: colors.backgroundElement,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={navigationTheme}>
        <LanguageProvider>
          <AndroidDoubleBackExit />
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <SafeAreaView
            edges={['top']}
            style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="study/[mode]" />
              <Stack.Screen name="dictionary/[dictionaryKey]" />
              <Stack.Screen name="word/[word]" />
            </Stack>
          </SafeAreaView>
        </LanguageProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
});
