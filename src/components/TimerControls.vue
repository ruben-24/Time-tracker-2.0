<script setup lang="ts">
import { computed } from 'vue'
import { useLanguageStore } from '../stores/languageStore'
import { useTimerStore } from '../stores/timerStore'
import { Play, Pause, RotateCcw, Square } from 'lucide-vue-next'

const timer = useTimerStore()
const language = useLanguageStore()

const canStart = computed(() => timer.activeType === null)
const canPause = computed(() => timer.activeType === 'work' && !timer.isPaused)
const canResume = computed(() => (timer.isOnBreak || (timer.isPaused && timer.activeType === 'work')))
const canEnd = computed(() => timer.activeType !== null && !timer.isPaused)

const showStartOnly = computed(() => timer.activeType === null)
const showResumeOnly = computed(() => timer.isOnBreak || (timer.isPaused && timer.activeType === 'work'))
const showPauseEnd = computed(() => timer.activeType === 'work' && !timer.isPaused)

const buttonBase = computed(() => {
  const shapeClass = 'btn-square'
  return `btn w-full py-8 text-lg ${shapeClass}`
})

function confirmEnd() {
  const ok = confirm(language.t('warning') + ': ' + language.t('end') + '?')
  if (ok) timer.endCurrent()
}
</script>

<template>
  <div v-if="showStartOnly" class="grid grid-cols-1 rounded-2xl shadow-2xl">
    <button
      :class="[buttonBase, 'btn-emerald text-base font-semibold py-6']"
      :disabled="!canStart"
      @click="timer.startWork()"
      :aria-label="language.t('start')"
    >
      <Play class="h-8 w-8" />
      <span class="ml-2">{{ language.t('start') }}</span>
    </button>
  </div>

  <div v-else-if="showPauseEnd" class="grid grid-cols-2 gap-3 rounded-2xl shadow-2xl">
    <button
      :class="[buttonBase, 'btn-amber text-base font-semibold py-6']"
      :disabled="!canPause"
      @click="timer.startBreak()"
      :aria-label="language.t('pause')"
    >
      <Pause class="h-8 w-8" />
      <span class="ml-2">{{ language.t('pause') }}</span>
    </button>

    <button
      :class="[buttonBase, 'btn-rose text-base font-semibold py-6']"
      :disabled="!canEnd"
      @click="confirmEnd()"
      :aria-label="language.t('end')"
    >
      <Square class="h-8 w-8" />
      <span class="ml-2">{{ language.t('end') }}</span>
    </button>
  </div>

  <div v-else-if="showResumeOnly" class="grid grid-cols-1 rounded-2xl shadow-2xl">
    <button
      :class="[buttonBase, 'btn-primary text-base font-semibold py-6']"
      :disabled="!canResume"
      @click="timer.resumeWork()"
      :aria-label="language.t('resume')"
    >
      <RotateCcw class="h-8 w-8" />
      <span class="ml-2">{{ language.t('resume') }}</span>
    </button>
  </div>
</template>