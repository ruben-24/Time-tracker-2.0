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
    backgroundStyle: 'solid',
    backgroundColors: {
      primary: '#ff0000',
      secondary: '#ff0000',
      accent: '#ff0000'
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
      name: 'Roșu Aprins',
      colors: { primary: '#ff0000', secondary: '#ff0000', accent: '#ff0000' },
      style: 'solid'
    },
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
    },
    {
      name: 'Aurora Borealis',
      colors: { primary: '#06ffa5', secondary: '#00d4aa', accent: '#00a8cc' },
      style: 'gradient'
    },
    {
      name: 'Fire & Ice',
      colors: { primary: '#ff416c', secondary: '#ff4b2b', accent: '#ff6b6b' },
      style: 'gradient'
    },
    {
      name: 'Cosmic Purple',
      colors: { primary: '#667eea', secondary: '#764ba2', accent: '#f093fb' },
      style: 'gradient'
    },
    {
      name: 'Golden Hour',
      colors: { primary: '#f093fb', secondary: '#f5576c', accent: '#4facfe' },
      style: 'gradient'
    },
    {
      name: 'Neon Nights',
      colors: { primary: '#00c9ff', secondary: '#92fe9d', accent: '#ff9a9e' },
      style: 'gradient'
    },
    {
      name: 'Dark Matter',
      colors: { primary: '#0c0c0c', secondary: '#1a1a1a', accent: '#2d2d2d' },
      style: 'gradient'
    },
    {
      name: 'Tropical Paradise',
      colors: { primary: '#11998e', secondary: '#38ef7d', accent: '#56ab2f' },
      style: 'gradient'
    },
    {
      name: 'Rose Gold',
      colors: { primary: '#f8b500', secondary: '#f093fb', accent: '#f5576c' },
      style: 'gradient'
    },
    {
      name: 'Electric Blue',
      colors: { primary: '#00d2ff', secondary: '#3a7bd5', accent: '#00c6ff' },
      style: 'gradient'
    },
    {
      name: 'Mystic Violet',
      colors: { primary: '#667eea', secondary: '#764ba2', accent: '#f093fb' },
      style: 'gradient'
    }
    ,
    {
      name: 'Sky Mint',
      colors: { primary: '#38bdf8', secondary: '#22d3ee', accent: '#14b8a6' },
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
    },
    {
      name: 'Ocean Blue',
      colors: { primary: '#0ea5e9', secondary: '#0284c7', accent: '#0369a1' },
      style: 'rounded'
    },
    {
      name: 'Cherry Pink',
      colors: { primary: '#f472b6', secondary: '#ec4899', accent: '#db2777' },
      style: 'rounded'
    },
    {
      name: 'Lime Green',
      colors: { primary: '#84cc16', secondary: '#65a30d', accent: '#4d7c0f' },
      style: 'rounded'
    },
    {
      name: 'Copper Orange',
      colors: { primary: '#f59e0b', secondary: '#d97706', accent: '#b45309' },
      style: 'rounded'
    },
    {
      name: 'Indigo Purple',
      colors: { primary: '#6366f1', secondary: '#4f46e5', accent: '#4338ca' },
      style: 'rounded'
    },
    {
      name: 'Coral Red',
      colors: { primary: '#f97316', secondary: '#ea580c', accent: '#c2410c' },
      style: 'rounded'
    },
    {
      name: 'Mint Cyan',
      colors: { primary: '#06b6d4', secondary: '#0891b2', accent: '#0e7490' },
      style: 'rounded'
    },
    {
      name: 'Rose Red',
      colors: { primary: '#f43f5e', secondary: '#e11d48', accent: '#be123c' },
      style: 'rounded'
    },
    {
      name: 'Electric Blue',
      colors: { primary: '#3b82f6', secondary: '#2563eb', accent: '#1d4ed8' },
      style: 'rounded'
    },
    {
      name: 'Square Style',
      colors: { primary: '#8b5cf6', secondary: '#7c3aed', accent: '#6d28d9' },
      style: 'square'
    },
    {
      name: 'Pill Style',
      colors: { primary: '#10b981', secondary: '#059669', accent: '#047857' },
      style: 'pill'
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
