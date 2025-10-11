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
  <div class="grid grid-cols-4 gap-2">
    <button
      class="btn btn-primary"
      :disabled="!canStart"
      @click="timer.startWork()"
    >
      <Play class="h-5 w-5" />
      <span>Începe programul</span>
    </button>

    <button
      class="btn btn-amber"
      :disabled="!canPause"
      @click="timer.startBreak()"
    >
      <Pause class="h-5 w-5" />
      <span>Pauză</span>
    </button>

    <button
      class="btn btn-emerald"
      :disabled="!canResume"
      @click="timer.resumeWork()"
    >
      <RotateCcw class="h-5 w-5" />
      <span>Reia lucru</span>
    </button>

    <button
      class="btn btn-rose"
      :disabled="!canEnd"
      @click="timer.endCurrent()"
    >
      <Square class="h-5 w-5" />
      <span>Încheie programul</span>
    </button>
  </div>
</template>
