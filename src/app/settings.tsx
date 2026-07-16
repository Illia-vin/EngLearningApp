import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>      
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Налаштування
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Тут будуть налаштування додатку.
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
  content: {
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  title: {
    marginBottom: Spacing.two,
  },
});
