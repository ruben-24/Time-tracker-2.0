<script setup lang="ts">
import { computed } from 'vue'
import { useTimerStore } from '../stores/timerStore'
import { Play, Pause, RotateCcw, Square } from 'lucide-vue-next'

const timer = useTimerStore()

// All controls remain active; actions will end current session if needed
const canStart = computed(() => true)
const canPause = computed(() => true)
const canResume = computed(() => true)
const canEnd = computed(() => true)
</script>

<template>
  <div class="grid grid-cols-4 gap-3 px-4 py-3">
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
