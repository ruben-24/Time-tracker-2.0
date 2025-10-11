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
  <div class="min-h-dvh bg-gradient-to-b from-white to-gray-50">
    <div class="mx-auto max-w-3xl px-4 pb-28 pt-6">
      <header class="mb-6">
        <h1 class="text-2xl font-bold tracking-tight">Time Tracker 2.0</h1>
        <p class="text-sm text-gray-600">Contorizează lucru și pauze cu un singur tap</p>
      </header>

      <section class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <div class="mb-6 flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500">Stare</div>
            <div class="text-lg font-semibold">{{ stateLabel }}</div>
          </div>
          <div class="text-right">
            <div class="text-sm text-gray-500">Cronometru</div>
            <div class="text-3xl font-bold tabular-nums">{{ formatDuration(elapsed) }}</div>
          </div>
        </div>

        <TimerControls />

        <div class="mt-6 grid gap-3 sm:grid-cols-2">
          <div class="rounded-xl bg-gray-50 p-4">
            <div class="text-sm text-gray-500">Total lucru</div>
            <div class="text-xl font-semibold">{{ formatDuration(timer.totalWorkMs) }}</div>
          </div>
          <div class="rounded-xl bg-gray-50 p-4">
            <div class="text-sm text-gray-500">Total pauză</div>
            <div class="text-xl font-semibold">{{ formatDuration(timer.totalBreakMs) }}</div>
          </div>
        </div>
      </section>

      <section class="mt-8">
        <SessionList />
      </section>

      <section class="mt-8 grid gap-6 md:grid-cols-2">
        <div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h2 class="mb-2 text-lg font-semibold">Adrese</h2>
          <AddressSettings />
        </div>
        <div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <div class="mb-2 flex items-center justify-between">
            <h2 class="text-lg font-semibold">Import/Export</h2>
            <button class="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50" @click="manualOpen = true">Adaugă manual</button>
          </div>
          <ImportExport />
        </div>
      </section>

      <ManualEntryDialog v-model="manualOpen" />

      <!-- Bottom control bar -->
      <div class="fixed inset-x-0 bottom-0 z-50 border-t bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div class="mx-auto max-w-3xl px-4 py-3">
          <TimerControls />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
