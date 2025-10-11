<script setup lang="ts">
import { computed } from 'vue'
import { useTimerStore } from '../stores/timerStore'
import { Play, Pause, RotateCcw, Square } from 'lucide-vue-next'

const timer = useTimerStore()

const canStart = computed(() => !timer.isRunning)
const canPause = computed(() => !timer.isRunning) // start a break when idle
const canResume = computed(() => !timer.isRunning)
const canEnd = computed(() => timer.isRunning)
</script>

<template>
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
    <button
      class="flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-white shadow hover:bg-primary-700 disabled:opacity-40"
      :disabled="!canStart"
      @click="timer.startWork()"
    >
      <Play class="h-5 w-5" />
      <span>Începe programul</span>
    </button>

    <button
      class="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-white shadow hover:bg-amber-600 disabled:opacity-40"
      :disabled="!canPause"
      @click="timer.startBreak()"
    >
      <Pause class="h-5 w-5" />
      <span>Pauză</span>
    </button>

    <button
      class="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-white shadow hover:bg-emerald-700 disabled:opacity-40"
      :disabled="!canResume"
      @click="timer.resumeWork()"
    >
      <RotateCcw class="h-5 w-5" />
      <span>Reia lucru</span>
    </button>

    <button
      class="flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-white shadow hover:bg-rose-700 disabled:opacity-40"
      :disabled="!canEnd"
      @click="timer.endCurrent()"
    >
      <Square class="h-5 w-5" />
      <span>Încheie programul</span>
    </button>
  </div>
</template>
