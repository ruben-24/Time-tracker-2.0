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
</script>

<template>
  <div class="min-h-dvh bg-gradient-to-b from-white to-gray-50">
    <div class="mx-auto max-w-3xl px-4 py-8">
      <header class="mb-6">
        <h1 class="text-2xl font-bold tracking-tight">Time Tracker 2.0</h1>
        <p class="text-sm text-gray-600">Contorizează lucru, pauze, export/import, adrese</p>
      </header>

      <section class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <div class="mb-4 flex items-baseline justify-between">
          <div>
            <div class="text-sm text-gray-500">Stare</div>
            <div class="text-lg font-semibold">
              {{ timer.activeType ? (timer.activeType === 'work' ? 'Lucru' : 'Pauză') : 'Inactiv' }}
            </div>
          </div>
          <div class="text-right">
            <div class="text-sm text-gray-500">Timp curent</div>
            <div class="text-2xl font-bold tabular-nums">{{ formatDuration(elapsed) }}</div>
          </div>
        </div>
        <TimerControls />
        <div class="mt-4 flex justify-between text-sm text-gray-600">
          <div>Total lucru: <span class="font-semibold">{{ formatDuration(timer.totalWorkMs) }}</span></div>
          <div>Total pauză: <span class="font-semibold">{{ formatDuration(timer.totalBreakMs) }}</span></div>
        </div>
        <div class="mt-6 flex flex-wrap gap-3">
          <button class="rounded-lg border px-4 py-2 hover:bg-gray-50" @click="manualOpen = true">Adaugă manual</button>
        </div>
      </section>

      <SessionList />

      <section class="mt-8 grid gap-6 md:grid-cols-2">
        <div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h2 class="mb-2 text-lg font-semibold">Adrese</h2>
          <AddressSettings />
        </div>
        <div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h2 class="mb-2 text-lg font-semibold">Import/Export</h2>
          <ImportExport />
        </div>
      </section>

      <ManualEntryDialog v-model="manualOpen" />
    </div>
  </div>
</template>

<style scoped>
</style>
