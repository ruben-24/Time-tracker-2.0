<script setup lang="ts">
import { onMounted, ref, computed, onBeforeUnmount } from 'vue'
import { useTimerStore } from './stores/timerStore'
import TimerControls from './components/TimerControls.vue'
import BurgerMenu from './components/BurgerMenu.vue'
import { formatDuration } from './utils/format'
import { setupBackgroundHandlers } from './utils/background'

const timer = useTimerStore()
const now = ref(Date.now())
let ticker: number | undefined

onMounted(() => {
  void timer.load()
  void setupBackgroundHandlers()
  ticker = window.setInterval(() => (now.value = Date.now()), 1000)
})

onBeforeUnmount(() => {
  if (ticker) window.clearInterval(ticker)
})

const elapsed = computed(() => {
  if (!timer.activeStartedAt) return 0
  return now.value - timer.activeStartedAt
})

const stateLabel = computed(() => {
  if (!timer.activeType) return 'Inactiv'
  if (timer.isPaused) return 'Pauză'
  return timer.activeType === 'work' ? 'Lucru' : 'Pauză'
})
</script>

<template>
  <div class="relative min-h-dvh">
    <div class="hero-gradient" />
    <div class="mx-auto max-w-[430px] px-4 pb-36 safe-top">
      <!-- Header with Burger Menu -->
      <header class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-gradient">Time Tracker Pro</h1>
          <p class="text-sm text-white/80 font-medium">Simplu. Rapid. Precis.</p>
        </div>
        <BurgerMenu />
      </header>

      <!-- Main Timer Section -->
      <section class="card-glass card-hover p-8 mb-8">
        <div class="mb-8 flex items-center justify-between">
          <div>
            <div class="text-xs text-white/70 font-medium uppercase tracking-wide">Stare</div>
            <div class="text-xl font-bold text-white">{{ stateLabel }}</div>
          </div>
          <div class="text-right">
            <div class="text-xs text-white/70 font-medium uppercase tracking-wide">Cronometru</div>
            <div class="text-6xl font-bold tabular-nums tracking-tight timer-display text-white">{{ formatDuration(elapsed) }}</div>
          </div>
        </div>
        
        <!-- Stats Grid -->
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="rounded-2xl glass-enhanced p-6 card-hover">
            <div class="text-xs text-white/70 font-medium uppercase tracking-wide">Total lucru</div>
            <div class="text-3xl font-bold text-white">{{ formatDuration(timer.totalWorkMs) }}</div>
          </div>
          <div class="rounded-2xl glass-enhanced p-6 card-hover">
            <div class="text-xs text-white/70 font-medium uppercase tracking-wide">Total pauză</div>
            <div class="text-3xl font-bold text-white">{{ formatDuration(timer.totalBreakMs) }}</div>
          </div>
        </div>
      </section>

      <!-- Bottom control bar -->
      <nav class="fixed inset-x-0 bottom-0 z-50 border-t border-white/30 glass-enhanced safe-bottom">
        <div class="mx-auto max-w-[430px] px-4 py-4">
          <TimerControls />
        </div>
      </nav>
    </div>
  </div>
</template>

<style scoped>
</style>
