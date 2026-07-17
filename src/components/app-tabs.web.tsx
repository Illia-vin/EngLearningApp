import type { ComponentProps } from 'react';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, useColorScheme, View, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage } from '@/i18n';

type MaterialCommunityIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

interface TabButtonProps extends TabTriggerSlotProps {
  iconName: MaterialCommunityIconName;
}

export default function AppTabs() {
  const { t } = useLanguage();

  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="words" href="/words" asChild>
            <TabButton iconName="book-open-variant">
              {t('navigation.words')}
            </TabButton>
          </TabTrigger>
          <TabTrigger name="dictionaries" href="/dictionaries" asChild>
            <TabButton iconName="google-classroom">
              {t('navigation.dictionaries')}
            </TabButton>
          </TabTrigger>
          <TabTrigger name="settings" href="/settings" asChild>
            <TabButton iconName="cog">
              {t('navigation.settings')}
            </TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, iconName, isFocused, ...props }: TabButtonProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <Pressable
      {...props}
      style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}>
        <MaterialCommunityIcons
          name={iconName}
          size={16}
          color={isFocused ? colors.accent : colors.textSecondary}
          style={styles.tabIcon}
        />
        <ThemedText type="small" themeColor={isFocused ? 'accent' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const theme = useTheme();

  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView
        type="backgroundElement"
        style={[styles.innerContainer, { borderColor: theme.border }]}>
        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.one,
    maxWidth: MaxContentWidth,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  brandText: {
    marginRight: 'auto',
  },
  pressed: {
    opacity: 0.7,
  },
  tabButton: {
    flex: 1,
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  tabIcon: {
    marginRight: Spacing.one,
  },
  externalPressable: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.one,
    marginLeft: Spacing.three,
  },
});
