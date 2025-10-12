<script setup lang="ts">
import { computed } from 'vue'
import { useTimerStore } from '../stores/timerStore'
import { useThemeStore } from '../stores/themeStore'
import { Play, Pause, RotateCcw, Square } from 'lucide-vue-next'

const timer = useTimerStore()
const theme = useThemeStore()

// All controls remain active; actions will end current session if needed
const canStart = computed(() => true)
const canPause = computed(() => true)
const canResume = computed(() => true)
const canEnd = computed(() => true)

// Button classes based on theme
const buttonClasses = computed(() => {
  const baseClass = 'btn flex-col w-full'
  const shapeClass = theme.settings.buttonStyle === 'pill' ? 'btn-pill' : 
                    theme.settings.buttonStyle === 'square' ? 'btn-square' : 
                    theme.settings.buttonStyle === 'glass' ? 'btn-glass' : 'btn-rounded'
  
  return `${baseClass} ${shapeClass}`
})
</script>

<template>
  <div class="grid grid-cols-4 gap-3">
    <button
      :class="buttonClasses"
      :style="theme.settings.buttonStyle === 'glass' ? { 
        background: `linear-gradient(135deg, ${theme.settings.buttonColors.primary}20, ${theme.settings.buttonColors.secondary}10)`,
        borderColor: `${theme.settings.buttonColors.primary}40`,
        color: theme.settings.buttonColors.primary
      } : {}"
      :disabled="!canStart"
      @click="timer.startWork()"
    >
      <Play class="h-6 w-6" />
      <span class="text-xs">Lucru</span>
    </button>

    <button
      :class="buttonClasses"
      :style="theme.settings.buttonStyle === 'glass' ? { 
        background: `linear-gradient(135deg, #f59e0b20, #d9770610)`,
        borderColor: `#f59e0b40`,
        color: '#f59e0b'
      } : {}"
      :disabled="!canPause"
      @click="timer.startBreak()"
    >
      <Pause class="h-6 w-6" />
      <span class="text-xs">Pauză</span>
    </button>

    <button
      :class="buttonClasses"
      :style="theme.settings.buttonStyle === 'glass' ? { 
        background: `linear-gradient(135deg, #10b98120, #05966910)`,
        borderColor: `#10b98140`,
        color: '#10b981'
      } : {}"
      :disabled="!canResume"
      @click="timer.resumeWork()"
    >
      <RotateCcw class="h-6 w-6" />
      <span class="text-xs">Reia</span>
    </button>

    <button
      :class="buttonClasses"
      :style="theme.settings.buttonStyle === 'glass' ? { 
        background: `linear-gradient(135deg, #ef444420, #dc262610)`,
        borderColor: `#ef444440`,
        color: '#ef4444'
      } : {}"
      :disabled="!canEnd"
      @click="timer.endCurrent()"
    >
      <Square class="h-6 w-6" />
      <span class="text-xs">Încheie lucru</span>
    </button>
  </div>
</template>
