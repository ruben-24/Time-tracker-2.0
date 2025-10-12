<script setup lang="ts">
import { onMounted, ref, computed, onBeforeUnmount } from 'vue'
import { useTimerStore } from './stores/timerStore'
import TimerControls from './components/TimerControls.vue'
import SessionList from './components/SessionList.vue'
import ManualEntryDialog from './components/ManualEntryDialog.vue'
import AddressSettings from './components/AddressSettings.vue'
import ImportExport from './components/ImportExport.vue'
import { formatDuration } from './utils/format'
import { setupBackgroundHandlers } from './utils/background'

const timer = useTimerStore()
const manualOpen = ref(false)
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

const stateLabel = computed(() =>
  timer.activeType ? (timer.activeType === 'work' ? 'Lucru' : 'Pauză') : 'Inactiv'
)
</script>

<template>
  <div class="relative min-h-dvh">
    <div class="hero-gradient" />
    <div class="mx-auto max-w-[430px] px-4 pb-36 safe-top">
      <header class="mb-6">
        <h1 class="text-2xl font-bold tracking-tight text-gradient">Time Tracker Pro</h1>
        <p class="text-sm text-white/80 font-medium">Simplu. Rapid. Precis.</p>
      </header>

      <section class="card-glass card-hover p-6 mb-6">
        <div class="mb-6 flex items-center justify-between">
          <div>
            <div class="text-xs text-white/70 font-medium">Stare</div>
            <div class="text-lg font-bold text-white">{{ stateLabel }}</div>
          </div>
          <div class="text-right">
            <div class="text-xs text-white/70 font-medium">Cronometru</div>
            <div class="text-5xl font-bold tabular-nums tracking-tight timer-display text-white">{{ formatDuration(elapsed) }}</div>
          </div>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="rounded-2xl glass-enhanced p-5 card-hover">
            <div class="text-xs text-white/70 font-medium">Total lucru</div>
            <div class="text-2xl font-bold text-white">{{ formatDuration(timer.totalWorkMs) }}</div>
          </div>
          <div class="rounded-2xl glass-enhanced p-5 card-hover">
            <div class="text-xs text-white/70 font-medium">Total pauză</div>
            <div class="text-2xl font-bold text-white">{{ formatDuration(timer.totalBreakMs) }}</div>
          </div>
        </div>
      </section>

      <section class="mt-6">
        <SessionList />
      </section>

      <section class="mt-6 grid gap-4 md:grid-cols-2">
        <div class="card-glass card-hover p-6">
          <h2 class="mb-4 text-lg font-bold text-white">Adrese</h2>
          <AddressSettings />
        </div>
        <div class="card-glass card-hover p-6">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-bold text-white">Import/Export</h2>
            <button class="btn btn-emerald text-sm px-4 py-2" @click="manualOpen = true">Adaugă manual</button>
          </div>
          <ImportExport />
        </div>
      </section>

      <ManualEntryDialog v-model="manualOpen" />

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
