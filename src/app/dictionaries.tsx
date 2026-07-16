import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export default function DictionariesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const contentInset = {
    top: insets.top,
    left: insets.left,
    right: insets.right,
    bottom: insets.bottom + BottomTabInset + Spacing.three,
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>      
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Словники
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Тут буде список словників і керування ними.
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
