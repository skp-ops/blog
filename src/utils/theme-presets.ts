/**
 * Theme preset definitions
 * Each preset contains light and dark mode colors in OKLCH format
 */

export interface ThemeColors {
  primary: string
  secondary: string
  background: string
  highlight: string
}

export interface ThemePreset {
  name: string
  light: ThemeColors
  dark: ThemeColors
}

export const themePresets: ThemePreset[] = [
  {
    name: 'default',
    light: {
      primary: 'oklch(0.20 0.01 45)',
      secondary: 'oklch(0.55 0.015 45)',
      background: 'oklch(0.975 0.003 45)',
      highlight: 'oklch(0.90 0.06 45 / 0.30)',
    },
    dark: {
      primary: 'oklch(0.92 0.015 45)',
      secondary: 'oklch(0.65 0.02 45)',
      background: 'oklch(0.18 0.015 45)',
      highlight: 'oklch(0.85 0.08 45 / 0.25)',
    },
  },
  {
    name: 'ocean',
    light: {
      primary: 'oklch(0.25 0.05 240)',
      secondary: 'oklch(0.55 0.03 240)',
      background: 'oklch(0.97 0.01 240)',
      highlight: 'oklch(0.85 0.10 240 / 0.30)',
    },
    dark: {
      primary: 'oklch(0.90 0.05 240)',
      secondary: 'oklch(0.65 0.03 240)',
      background: 'oklch(0.20 0.03 240)',
      highlight: 'oklch(0.80 0.12 240 / 0.25)',
    },
  },
  {
    name: 'forest',
    light: {
      primary: 'oklch(0.25 0.06 150)',
      secondary: 'oklch(0.50 0.04 150)',
      background: 'oklch(0.97 0.01 150)',
      highlight: 'oklch(0.85 0.10 150 / 0.30)',
    },
    dark: {
      primary: 'oklch(0.88 0.08 150)',
      secondary: 'oklch(0.65 0.05 150)',
      background: 'oklch(0.18 0.03 150)',
      highlight: 'oklch(0.80 0.12 150 / 0.25)',
    },
  },
  {
    name: 'sunset',
    light: {
      primary: 'oklch(0.28 0.08 30)',
      secondary: 'oklch(0.55 0.05 30)',
      background: 'oklch(0.97 0.01 30)',
      highlight: 'oklch(0.85 0.12 30 / 0.30)',
    },
    dark: {
      primary: 'oklch(0.90 0.08 30)',
      secondary: 'oklch(0.68 0.05 30)',
      background: 'oklch(0.19 0.03 30)',
      highlight: 'oklch(0.82 0.12 30 / 0.25)',
    },
  },
  {
    name: 'purple',
    light: {
      primary: 'oklch(0.30 0.10 300)',
      secondary: 'oklch(0.55 0.06 300)',
      background: 'oklch(0.97 0.01 300)',
      highlight: 'oklch(0.85 0.12 300 / 0.30)',
    },
    dark: {
      primary: 'oklch(0.88 0.12 300)',
      secondary: 'oklch(0.68 0.08 300)',
      background: 'oklch(0.18 0.03 300)',
      highlight: 'oklch(0.80 0.15 300 / 0.25)',
    },
  },
]
