<script setup lang="ts">
import { onMounted, ref, computed, onBeforeUnmount } from 'vue'
import { useTimerStore } from './stores/timerStore'
import TimerControls from './components/TimerControls.vue'
import BurgerMenu from './components/BurgerMenu.vue'
import HistoryPage from './components/HistoryPage.vue'
import AddressesPage from './components/AddressesPage.vue'
import FinancialInfo from './components/FinancialInfo.vue'
import { formatDuration } from './utils/format'
import { setupBackgroundHandlers } from './utils/background'
import { ArrowLeft, DollarSign } from 'lucide-vue-next'

const timer = useTimerStore()
const now = ref(Date.now())
const currentPage = ref('main')
let ticker: number | undefined

onMounted(() => {
  void timer.load()
  void setupBackgroundHandlers()
  ticker = window.setInterval(() => {
    now.value = Date.now()
    forceUpdateTotals()
  }, 1000)
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

const navigateTo = (page: string) => {
  currentPage.value = page
}

// Force update totals every second
const forceUpdateTotals = () => {
  // This will trigger reactivity for computed properties
  timer.$patch({})
}
</script>

<template>
  <div class="relative min-h-dvh">
    <div class="hero-gradient" />
    
    <!-- Main Page -->
    <div v-if="currentPage === 'main'" class="mx-auto max-w-[430px] px-4 pb-36 safe-top">
      <!-- Header with Burger Menu -->
      <header class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-gradient">Time Tracker Pro</h1>
          <p class="text-sm text-white/80 font-medium">Simplu. Rapid. Precis.</p>
        </div>
        <BurgerMenu @navigate="navigateTo" />
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

        <!-- Financial Information -->
        <div class="mt-6">
          <div class="flex items-center gap-2 mb-4">
            <DollarSign class="h-5 w-5 text-green-400" />
            <h2 class="text-lg font-semibold text-white">Informații Financiare</h2>
          </div>
          <FinancialInfo />
        </div>
      </section>

      <!-- Bottom control bar -->
      <nav class="fixed inset-x-0 bottom-0 z-50 border-t border-white/30 glass-enhanced safe-bottom">
        <div class="mx-auto max-w-[430px] px-4 py-4">
          <TimerControls />
        </div>
      </nav>
    </div>

    <!-- History Page -->
    <HistoryPage v-else-if="currentPage === 'history'" @navigate="navigateTo" />

    <!-- Addresses Page -->
    <AddressesPage v-else-if="currentPage === 'addresses'" @navigate="navigateTo" />

    <!-- Financial Reports Page -->
    <div v-else-if="currentPage === 'financial'" class="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 p-4 safe-top">
      <div class="flex items-center justify-between mb-6 pt-4">
        <button @click="navigateTo('main')" class="btn btn-primary p-3 rounded-full">
          <ArrowLeft class="h-5 w-5" />
        </button>
        <h1 class="text-2xl font-bold text-white">Rapoarte Financiare</h1>
        <div></div>
      </div>
      <FinancialInfo />
    </div>

    <!-- Import/Export Page -->
    <div v-else-if="currentPage === 'import-export'" class="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 p-4 safe-top">
      <div class="flex items-center justify-between mb-6 pt-4">
        <button @click="navigateTo('main')" class="btn btn-primary p-3 rounded-full">
          <ArrowLeft class="h-5 w-5" />
        </button>
        <h1 class="text-2xl font-bold text-white">Import/Export</h1>
        <div></div>
      </div>
      <div class="card-glass p-6">
        <h2 class="text-lg font-semibold text-white mb-4">Funcționalitate în dezvoltare</h2>
        <p class="text-white/70">Această funcționalitate va fi disponibilă în versiunea următoare.</p>
      </div>
    </div>

    <!-- Settings Page -->
    <div v-else-if="currentPage === 'settings'" class="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 p-4 safe-top">
      <div class="flex items-center justify-between mb-6 pt-4">
        <button @click="navigateTo('main')" class="btn btn-primary p-3 rounded-full">
          <ArrowLeft class="h-5 w-5" />
        </button>
        <h1 class="text-2xl font-bold text-white">Setări</h1>
        <div></div>
      </div>
      <div class="card-glass p-6">
        <h2 class="text-lg font-semibold text-white mb-4">Funcționalitate în dezvoltare</h2>
        <p class="text-white/70">Această funcționalitate va fi disponibilă în versiunea următoare.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
