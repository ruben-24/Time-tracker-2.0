import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface ThemeSettings {
  backgroundStyle: 'gradient' | 'solid' | 'glass' | 'particles'
  backgroundColors: {
    primary: string
    secondary: string
    accent: string
  }
  buttonStyle: 'rounded' | 'square' | 'pill' | 'glass'
  buttonColors: {
    primary: string
    secondary: string
    accent: string
  }
  textStyle: 'gradient' | 'glow' | 'rainbow' | 'solid'
  animations: boolean
  particles: boolean
  glassEffect: boolean
}

export const useThemeStore = defineStore('theme', () => {
  const settings = ref<ThemeSettings>({
    backgroundStyle: 'gradient',
    backgroundColors: {
      primary: '#0f0f23',
      secondary: '#1a1a2e',
      accent: '#16213e'
    },
    buttonStyle: 'rounded',
    buttonColors: {
      primary: '#3b82f6',
      secondary: '#2563eb',
      accent: '#1d4ed8'
    },
    textStyle: 'gradient',
    animations: true,
    particles: true,
    glassEffect: true
  })

  const backgroundPresets = ref([
    {
      name: 'Ocean Deep',
      colors: { primary: '#0f0f23', secondary: '#1a1a2e', accent: '#16213e' },
      style: 'gradient'
    },
    {
      name: 'Sunset Glow',
      colors: { primary: '#ff6b6b', secondary: '#4ecdc4', accent: '#45b7d1' },
      style: 'gradient'
    },
    {
      name: 'Purple Dreams',
      colors: { primary: '#8b5cf6', secondary: '#7c3aed', accent: '#6d28d9' },
      style: 'gradient'
    },
    {
      name: 'Emerald Forest',
      colors: { primary: '#10b981', secondary: '#059669', accent: '#047857' },
      style: 'gradient'
    },
    {
      name: 'Cyber Punk',
      colors: { primary: '#ec4899', secondary: '#db2777', accent: '#be185d' },
      style: 'gradient'
    },
    {
      name: 'Midnight Blue',
      colors: { primary: '#1e293b', secondary: '#334155', accent: '#475569' },
      style: 'gradient'
    }
  ])

  const buttonPresets = ref([
    {
      name: 'Modern Blue',
      colors: { primary: '#3b82f6', secondary: '#2563eb', accent: '#1d4ed8' },
      style: 'rounded'
    },
    {
      name: 'Emerald Green',
      colors: { primary: '#10b981', secondary: '#059669', accent: '#047857' },
      style: 'rounded'
    },
    {
      name: 'Purple Magic',
      colors: { primary: '#8b5cf6', secondary: '#7c3aed', accent: '#6d28d9' },
      style: 'rounded'
    },
    {
      name: 'Pink Glow',
      colors: { primary: '#ec4899', secondary: '#db2777', accent: '#be185d' },
      style: 'rounded'
    },
    {
      name: 'Cyan Wave',
      colors: { primary: '#06b6d4', secondary: '#0891b2', accent: '#0e7490' },
      style: 'rounded'
    },
    {
      name: 'Glass Effect',
      colors: { primary: '#ffffff', secondary: '#f8fafc', accent: '#e2e8f0' },
      style: 'glass'
    }
  ])

  const updateSettings = (newSettings: Partial<ThemeSettings>) => {
    settings.value = { ...settings.value, ...newSettings }
    persist()
  }

  const applyBackgroundPreset = (preset: typeof backgroundPresets.value[0]) => {
    settings.value.backgroundStyle = preset.style as any
    settings.value.backgroundColors = { ...preset.colors }
    persist()
  }

  const applyButtonPreset = (preset: typeof buttonPresets.value[0]) => {
    settings.value.buttonStyle = preset.style as any
    settings.value.buttonColors = { ...preset.colors }
    persist()
  }

  const persist = () => {
    localStorage.setItem('theme-settings', JSON.stringify(settings.value))
  }

  const load = () => {
    const saved = localStorage.getItem('theme-settings')
    if (saved) {
      try {
        settings.value = { ...settings.value, ...JSON.parse(saved) }
      } catch (e) {
        console.error('Failed to load theme settings:', e)
      }
    }
  }

  const reset = () => {
    settings.value = {
      backgroundStyle: 'gradient',
      backgroundColors: {
        primary: '#0f0f23',
        secondary: '#1a1a2e',
        accent: '#16213e'
      },
      buttonStyle: 'rounded',
      buttonColors: {
        primary: '#3b82f6',
        secondary: '#2563eb',
        accent: '#1d4ed8'
      },
      textStyle: 'gradient',
      animations: true,
      particles: true,
      glassEffect: true
    }
    persist()
  }

  // Computed properties for CSS custom properties
  const cssVariables = computed(() => ({
    '--bg-primary': settings.value.backgroundColors.primary,
    '--bg-secondary': settings.value.backgroundColors.secondary,
    '--bg-accent': settings.value.backgroundColors.accent,
    '--btn-primary': settings.value.buttonColors.primary,
    '--btn-secondary': settings.value.buttonColors.secondary,
    '--btn-accent': settings.value.buttonColors.accent
  }))

  return {
    settings,
    backgroundPresets,
    buttonPresets,
    updateSettings,
    applyBackgroundPreset,
    applyButtonPreset,
    persist,
    load,
    reset,
    cssVariables
  }
})