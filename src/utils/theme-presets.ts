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
  {
    name: 'rose',
    light: {
      primary: 'oklch(0.30 0.12 350)',
      secondary: 'oklch(0.55 0.06 350)',
      background: 'oklch(0.97 0.01 350)',
      highlight: 'oklch(0.85 0.15 350 / 0.30)',
    },
    dark: {
      primary: 'oklch(0.88 0.15 350)',
      secondary: 'oklch(0.68 0.08 350)',
      background: 'oklch(0.18 0.03 350)',
      highlight: 'oklch(0.80 0.18 350 / 0.25)',
    },
  },
  {
    name: 'amber',
    light: {
      primary: 'oklch(0.30 0.10 60)',
      secondary: 'oklch(0.55 0.06 60)',
      background: 'oklch(0.97 0.01 60)',
      highlight: 'oklch(0.85 0.12 60 / 0.30)',
    },
    dark: {
      primary: 'oklch(0.88 0.12 60)',
      secondary: 'oklch(0.68 0.08 60)',
      background: 'oklch(0.18 0.03 60)',
      highlight: 'oklch(0.80 0.15 60 / 0.25)',
    },
  },
  {
    name: 'emerald',
    light: {
      primary: 'oklch(0.25 0.08 165)',
      secondary: 'oklch(0.50 0.05 165)',
      background: 'oklch(0.97 0.01 165)',
      highlight: 'oklch(0.85 0.12 165 / 0.30)',
    },
    dark: {
      primary: 'oklch(0.88 0.10 165)',
      secondary: 'oklch(0.65 0.06 165)',
      background: 'oklch(0.18 0.03 165)',
      highlight: 'oklch(0.80 0.14 165 / 0.25)',
    },
  },
  {
    name: 'sky',
    light: {
      primary: 'oklch(0.28 0.08 210)',
      secondary: 'oklch(0.55 0.05 210)',
      background: 'oklch(0.97 0.01 210)',
      highlight: 'oklch(0.85 0.12 210 / 0.30)',
    },
    dark: {
      primary: 'oklch(0.88 0.10 210)',
      secondary: 'oklch(0.68 0.06 210)',
      background: 'oklch(0.18 0.03 210)',
      highlight: 'oklch(0.80 0.14 210 / 0.25)',
    },
  },
  {
    name: 'indigo',
    light: {
      primary: 'oklch(0.30 0.10 270)',
      secondary: 'oklch(0.55 0.06 270)',
      background: 'oklch(0.97 0.01 270)',
      highlight: 'oklch(0.85 0.12 270 / 0.30)',
    },
    dark: {
      primary: 'oklch(0.88 0.12 270)',
      secondary: 'oklch(0.68 0.08 270)',
      background: 'oklch(0.18 0.03 270)',
      highlight: 'oklch(0.80 0.15 270 / 0.25)',
    },
  },
]
