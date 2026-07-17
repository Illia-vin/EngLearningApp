/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#262521',
    background: '#FFFFFF',
    backgroundElement: '#F8F8F6',
    backgroundSelected: '#FFF3C4',
    textSecondary: '#6F6D66',
    primary: '#F1B900',
    primaryPressed: '#D6A300',
    accent: '#7A5900',
    onPrimary: '#302500',
    border: '#E8E6E0',
    control: '#FFFFFF',
  },
  dark: {
    text: '#F7F4EC',
    background: '#171714',
    backgroundElement: '#242421',
    backgroundSelected: '#3D371F',
    textSecondary: '#B9B4A8',
    primary: '#FFC83D',
    primaryPressed: '#E4AE24',
    accent: '#FFD66B',
    onPrimary: '#2B2200',
    border: '#3D3C36',
    control: '#FFFFFF',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
