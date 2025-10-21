<script setup lang="ts">
import { computed } from 'vue'
import { useTimerStore } from '../stores/timerStore'
import { useThemeStore } from '../stores/themeStore'
import { Play, Pause, RotateCcw, Square } from 'lucide-vue-next'

const timer = useTimerStore()
const theme = useThemeStore()

// State guards
const canStart = computed(() => timer.activeType === null)
const canPause = computed(() => timer.activeType === 'work' && !timer.isPaused)
const canResume = computed(() => (timer.isOnBreak || (timer.isPaused && timer.activeType === 'work')))
const canEnd = computed(() => timer.activeType !== null && !timer.isPaused)

// Layout state
const showStartOnly = computed(() => timer.activeType === null)
const showResumeOnly = computed(() => timer.isOnBreak || (timer.isPaused && timer.activeType === 'work'))
const showPauseEnd = computed(() => timer.activeType === 'work' && !timer.isPaused)

// Common button base classes (never use glass style for timer controls)
const buttonBase = computed(() => {
  const shapeClass = theme.settings.buttonStyle === 'pill' ? 'btn-pill' :
                    theme.settings.buttonStyle === 'square' ? 'btn-square' :
                    /* force non-glass for these critical actions */ 'btn-rounded'
  return `btn w-full py-5 ${shapeClass}`
})
</script>

<template>
  <!-- No active session: single large START button -->
  <div v-if="showStartOnly" class="grid grid-cols-1">
    <button
      :class="[buttonBase, 'btn-emerald text-base font-semibold py-6']"
      :disabled="!canStart"
      @click="timer.startWork()"
      aria-label="Începe lucru"
    >
      <Play class="h-6 w-6" />
      <span class="ml-2">Începe lucru</span>
    </button>
  </div>

  <!-- Session running: PAUSE and END as two large buttons side by side -->
  <div v-else-if="showPauseEnd" class="grid grid-cols-2 gap-3">
    <button
      :class="[buttonBase, 'btn-amber text-base font-semibold py-6']"
      :disabled="!canPause"
      @click="timer.startBreak()"
      aria-label="Pauză"
    >
      <Pause class="h-6 w-6" />
      <span class="ml-2">Pauză</span>
    </button>

    <button
      :class="[buttonBase, 'btn-rose text-base font-semibold py-6']"
      :disabled="!canEnd"
      @click="timer.endCurrent()"
      aria-label="Încheie lucru"
    >
      <Square class="h-6 w-6" />
      <span class="ml-2">Încheie lucru</span>
    </button>
  </div>

  <!-- On break: single large RESUME button -->
  <div v-else-if="showResumeOnly" class="grid grid-cols-1">
    <button
      :class="[buttonBase, 'btn-primary text-base font-semibold py-6']"
      :disabled="!canResume"
      @click="timer.resumeWork()"
      aria-label="Reia"
    >
      <RotateCcw class="h-6 w-6" />
      <span class="ml-2">Reia</span>
    </button>
  </div>
</template>
