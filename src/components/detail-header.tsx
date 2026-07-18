import { Pressable, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export function DetailHeader({ title, subtitle, onBack }: {
  title: string;
  subtitle?: string;
  onBack: () => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={onBack}
        style={styles.backButton}>
        <MaterialCommunityIcons name="arrow-left" size={26} color={theme.text} />
      </Pressable>
      <View style={styles.text}>
        <ThemedText type="subtitle" numberOfLines={1}>{title}</ThemedText>
        {subtitle && <ThemedText type="small" themeColor="textSecondary">{subtitle}</ThemedText>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: Spacing.half },
});
