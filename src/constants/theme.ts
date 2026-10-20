/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#121316',
    background: '#f8f8fb',
    backgroundElement: '#ececf0',
    backgroundSelected: '#dfdfe6',
    textSecondary: '#60646c',
    surface: '#ffffff',
    surfaceContainer: '#f2f2f6',
    surfaceContainerHigh: '#e8e8ed',
    surfaceContainerHighest: '#dedee4',
    primary: '#4f46e5',
    primaryContainer: '#e0e0ff',
    secondary: '#0284c7',
    tertiary: '#059669',
    outline: '#918fa1',
    outlineVariant: '#d0d0d8',
    error: '#dc2626',
  },
  dark: {
    text: '#e3e2e6',
    background: '#121316',
    backgroundElement: '#1b1b1f',
    backgroundSelected: '#292a2d',
    textSecondary: '#c7c4d8',
    surface: '#121316',
    surfaceContainer: '#1f1f23',
    surfaceContainerHigh: '#292a2d',
    surfaceContainerHighest: '#343538',
    primary: '#c3c0ff',
    primaryContainer: '#4f46e5',
    secondary: '#4cd7f6',
    tertiary: '#4edea3',
    outline: '#918fa1',
    outlineVariant: '#464555',
    error: '#ffb4ab',
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
