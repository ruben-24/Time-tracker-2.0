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
  <div class="relative min-h-dvh bg-gradient-to-b from-white to-sky-50">
    <div class="hero-gradient" />
    <div class="mx-auto max-w-[430px] px-4 pb-36 safe-top">
      <header class="mb-4">
        <h1 class="text-xl font-semibold tracking-tight text-gray-900">Time Tracker</h1>
        <p class="text-xs text-gray-500">Simplu. Rapid. Precis.</p>
      </header>

      <section class="card-glass p-5">
        <div class="mb-5 flex items-center justify-between">
          <div>
            <div class="text-xs text-gray-500">Stare</div>
            <div class="text-base font-semibold">{{ stateLabel }}</div>
          </div>
          <div class="text-right">
            <div class="text-xs text-gray-500">Cronometru</div>
            <div class="text-4xl font-bold tabular-nums tracking-tight">{{ formatDuration(elapsed) }}</div>
          </div>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-2xl bg-gray-50 p-4">
            <div class="text-xs text-gray-500">Total lucru</div>
            <div class="text-xl font-semibold">{{ formatDuration(timer.totalWorkMs) }}</div>
          </div>
          <div class="rounded-2xl bg-gray-50 p-4">
            <div class="text-xs text-gray-500">Total pauză</div>
            <div class="text-xl font-semibold">{{ formatDuration(timer.totalBreakMs) }}</div>
          </div>
        </div>
      </section>

      <section class="mt-6">
        <SessionList />
      </section>

      <section class="mt-6 grid gap-4 md:grid-cols-2">
        <div class="card-glass p-5">
          <h2 class="mb-2 text-base font-semibold">Adrese</h2>
          <AddressSettings />
        </div>
        <div class="card-glass p-5">
          <div class="mb-2 flex items-center justify-between">
            <h2 class="text-base font-semibold">Import/Export</h2>
            <button class="rounded-full border px-4 py-2 text-xs hover:bg-gray-50" @click="manualOpen = true">Adaugă manual</button>
          </div>
          <ImportExport />
        </div>
      </section>

      <ManualEntryDialog v-model="manualOpen" />

      <!-- Bottom control bar -->
      <nav class="fixed inset-x-0 bottom-0 z-50 border-t border-white/40 bg-white/75 backdrop-blur safe-bottom supports-[backdrop-filter]:bg-white/50">
        <div class="mx-auto max-w-[430px] px-4 py-3">
          <TimerControls />
        </div>
      </nav>
    </div>
  </div>
</template>

<style scoped>
</style>
