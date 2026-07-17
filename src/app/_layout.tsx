import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppTabs from '@/components/app-tabs';
import { Colors } from '@/constants/theme';
import { LanguageProvider } from '@/i18n';

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
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <SafeAreaView
            edges={['top']}
            style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <AppTabs />
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
