import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Colors } from '@/constants/theme';
import { useLanguage } from '@/i18n';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { t } = useLanguage();

  return (
    <NativeTabs
      backgroundColor={colors.backgroundElement}
      indicatorColor={colors.backgroundSelected}
      rippleColor={colors.backgroundSelected}
      iconColor={{ default: colors.textSecondary, selected: colors.accent }}
      labelStyle={{
        default: { color: colors.textSecondary, fontWeight: '600' },
        selected: { color: colors.accent, fontWeight: '700' },
      }}>
      <NativeTabs.Trigger name="words">
        <NativeTabs.Trigger.Label>{t('navigation.words')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={
            <NativeTabs.Trigger.VectorIcon
              family={MaterialCommunityIcons}
              name="book-open-variant"
            />
          }
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="dictionaries">
        <NativeTabs.Trigger.Label>{t('navigation.dictionaries')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={
            <NativeTabs.Trigger.VectorIcon
              family={MaterialCommunityIcons}
              name="format-list-bulleted"
            />
          }
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>{t('navigation.settings')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={
            <NativeTabs.Trigger.VectorIcon
              family={MaterialCommunityIcons}
              name="cog"
            />
          }
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
