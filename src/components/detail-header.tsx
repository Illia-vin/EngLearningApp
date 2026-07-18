import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { BackButton } from '@/components/back-button';

export function DetailHeader({ title, subtitle, onBack }: {
  title: string;
  subtitle?: string;
  onBack: () => void;
}) {
  return (
    <View style={styles.container}>
      <BackButton accessibilityLabel="Back" onPress={onBack} />
      <View style={styles.text}>
        <ThemedText type="subtitle" numberOfLines={1}>{title}</ThemedText>
        {subtitle && <ThemedText type="small" themeColor="textSecondary">{subtitle}</ThemedText>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  text: { flex: 1, gap: Spacing.half },
});
