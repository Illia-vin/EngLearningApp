import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppTabs from '@/components/app-tabs';
import { Colors } from '@/constants/theme';
import { LanguageProvider } from '@/i18n';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <LanguageProvider>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <SafeAreaView
          edges={['top']}
          style={[styles.safeArea, { backgroundColor: colors.background }]}>
          <AppTabs />
        </SafeAreaView>
      </LanguageProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
