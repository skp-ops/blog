/**
 * Theme manager for handling theme colors and persistence
 */

import type { ThemeColors, ThemePreset } from './theme-presets'
import { themePresets } from './theme-presets'

const THEME_PRESET_KEY = 'theme-preset'
const CUSTOM_THEME_KEY = 'custom-theme'

/**
 * Parse OKLCH color string to extract components
 * @param oklchStr - OKLCH color string like "oklch(0.5 0.1 180 / 0.5)"
 * @returns Object with lightness, chroma, hue, and alpha values
 */
export function parseOKLCH(oklchStr: string): { l: number, c: number, h: number, a: number } | null {
  const match = oklchStr.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/)
  if (!match)
    return null

  return {
    l: Number.parseFloat(match[1]),
    c: Number.parseFloat(match[2]),
    h: Number.parseFloat(match[3]),
    a: match[4] ? Number.parseFloat(match[4]) : 1,
  }
}

/**
 * Format OKLCH components to color string
 * @param l - Lightness (0-1)
 * @param c - Chroma (0-0.4 typically)
 * @param h - Hue (0-360)
 * @param a - Alpha (0-1), optional
 * @returns OKLCH color string
 */
export function formatOKLCH(l: number, c: number, h: number, a?: number): string {
  if (a !== undefined && a !== 1) {
    return `oklch(${l} ${c} ${h} / ${a})`
  }
  return `oklch(${l} ${c} ${h})`
}

/**
 * Validate OKLCH color string
 * @param oklchStr - OKLCH color string to validate
 * @returns true if valid, false otherwise
 */
export function isValidOKLCH(oklchStr: string): boolean {
  const parsed = parseOKLCH(oklchStr)
  if (!parsed)
    return false

  const { l, c, h, a } = parsed
  return l >= 0 && l <= 1 && c >= 0 && h >= 0 && h <= 360 && a >= 0 && a <= 1
}

/**
 * Get all available theme presets
 */
export function getThemePresets(): ThemePreset[] {
  return themePresets
}

/**
 * Get theme preset by name
 */
export function getThemePreset(name: string): ThemePreset | undefined {
  return themePresets.find(preset => preset.name === name)
}

/**
 * Save theme preset to localStorage
 */
export function saveThemePreset(presetName: string): void {
  try {
    localStorage.setItem(THEME_PRESET_KEY, presetName)
    // Clear custom theme when using preset
    localStorage.removeItem(CUSTOM_THEME_KEY)
  }
  catch (error) {
    console.error('Failed to save theme preset:', error)
  }
}

/**
 * Save custom theme colors to localStorage
 */
export function saveCustomTheme(lightColors: ThemeColors, darkColors: ThemeColors): void {
  try {
    const customTheme = {
      light: lightColors,
      dark: darkColors,
    }
    localStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(customTheme))
    // Clear preset when using custom theme
    localStorage.removeItem(THEME_PRESET_KEY)
  }
  catch (error) {
    console.error('Failed to save custom theme:', error)
  }
}

/**
 * Get saved theme preset name from localStorage
 */
export function getSavedThemePreset(): string | null {
  try {
    return localStorage.getItem(THEME_PRESET_KEY)
  }
  catch (error) {
    console.error('Failed to get saved theme preset:', error)
    return null
  }
}

/**
 * Get saved custom theme from localStorage
 */
export function getSavedCustomTheme(): { light: ThemeColors, dark: ThemeColors } | null {
  try {
    const saved = localStorage.getItem(CUSTOM_THEME_KEY)
    if (!saved)
      return null
    return JSON.parse(saved)
  }
  catch (error) {
    console.error('Failed to get saved custom theme:', error)
    return null
  }
}

/**
 * Apply theme colors to the document
 */
export function applyThemeColors(lightColors: ThemeColors, darkColors: ThemeColors): void {
  const root = document.documentElement
  const isDark = root.classList.contains('dark')

  const colors = isDark ? darkColors : lightColors

  // Apply colors to UnoCSS custom properties for both light and dark modes
  // This allows the unocss-preset-theme to pick up the colors
  Object.entries(lightColors).forEach(([key, value]) => {
    root.style.setProperty(`--un-preset-theme-colors-${key}`, value)
  })

  // Store dark mode colors for when theme switches
  Object.entries(darkColors).forEach(([key, value]) => {
    root.style.setProperty(`--un-preset-theme-colors-dark-${key}`, value)
  })

  // Update meta theme-color
  const metaThemeColor = document.head.querySelector('meta[name="theme-color"]')
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', colors.background)
  }

  // Store both light and dark colors for theme mode switching
  root.dataset.themeLight = JSON.stringify(lightColors)
  root.dataset.themeDark = JSON.stringify(darkColors)

  // Dispatch custom event
  document.dispatchEvent(new CustomEvent('theme-colors-changed', {
    detail: { light: lightColors, dark: darkColors },
  }))
}

/**
 * Load and apply saved theme or default theme
 */
export function loadSavedTheme(): void {
  // Check for custom theme first
  const customTheme = getSavedCustomTheme()
  if (customTheme) {
    applyThemeColors(customTheme.light, customTheme.dark)
    return
  }

  // Check for preset theme
  const presetName = getSavedThemePreset()
  if (presetName) {
    const preset = getThemePreset(presetName)
    if (preset) {
      applyThemeColors(preset.light, preset.dark)
      return
    }
  }

  // Use default theme from config
  const defaultPreset = themePresets[0]
  applyThemeColors(defaultPreset.light, defaultPreset.dark)
}

/**
 * Apply theme preset by name
 */
export function applyThemePreset(presetName: string): boolean {
  const preset = getThemePreset(presetName)
  if (!preset)
    return false

  applyThemeColors(preset.light, preset.dark)
  saveThemePreset(presetName)
  return true
}

/**
 * Apply custom theme from OKLCH input
 */
export function applyCustomThemeFromInput(
  lightPrimary: string,
  darkPrimary: string,
): boolean {
  // Validate input
  if (!isValidOKLCH(lightPrimary) || !isValidOKLCH(darkPrimary)) {
    return false
  }

  // Parse the primary colors
  const lightParsed = parseOKLCH(lightPrimary)
  const darkParsed = parseOKLCH(darkPrimary)

  if (!lightParsed || !darkParsed)
    return false

  // Generate complementary colors based on primary
  const lightColors: ThemeColors = {
    primary: lightPrimary,
    secondary: formatOKLCH(lightParsed.l + 0.3, lightParsed.c * 0.5, lightParsed.h),
    background: formatOKLCH(0.975, 0.003, lightParsed.h),
    highlight: formatOKLCH(0.90, lightParsed.c * 2, lightParsed.h, 0.30),
  }

  const darkColors: ThemeColors = {
    primary: darkPrimary,
    secondary: formatOKLCH(darkParsed.l - 0.25, darkParsed.c * 0.8, darkParsed.h),
    background: formatOKLCH(0.18, 0.015, darkParsed.h),
    highlight: formatOKLCH(0.85, darkParsed.c * 1.5, darkParsed.h, 0.25),
  }

  applyThemeColors(lightColors, darkColors)
  saveCustomTheme(lightColors, darkColors)
  return true
}
