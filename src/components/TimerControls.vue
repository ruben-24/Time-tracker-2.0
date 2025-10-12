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
  <div class="grid grid-cols-4 gap-3">
    <button
      class="btn btn-primary flex-col w-full"
      :disabled="!canStart"
      @click="timer.startWork()"
    >
      <Play class="h-6 w-6" />
      <span class="text-xs">Lucru</span>
    </button>

    <button
      class="btn btn-amber flex-col w-full"
      :disabled="!canPause"
      @click="timer.startBreak()"
    >
      <Pause class="h-6 w-6" />
      <span class="text-xs">Pauză</span>
    </button>

    <button
      class="btn btn-emerald flex-col w-full"
      :disabled="!canResume"
      @click="timer.resumeWork()"
    >
      <RotateCcw class="h-6 w-6" />
      <span class="text-xs">Reia</span>
    </button>

    <button
      class="btn btn-rose flex-col w-full"
      :disabled="!canEnd"
      @click="timer.endCurrent()"
    >
      <Square class="h-6 w-6" />
      <span class="text-xs">Încheie lucru</span>
    </button>
  </div>
</template>
