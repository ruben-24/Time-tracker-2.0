<script setup lang="ts">
import { onMounted, ref, computed, onBeforeUnmount, watch } from 'vue'
import { useTimerStore } from './stores/timerStore'
import { useThemeStore } from './stores/themeStore'
import TimerControls from './components/TimerControls.vue'
import BurgerMenu from './components/BurgerMenu.vue'
import HistoryPage from './components/HistoryPage.vue'
import AddressesPage from './components/AddressesPage.vue'
import FinancialInfo from './components/FinancialInfo.vue'
import AddressSelector from './components/AddressSelector.vue'
import SettingsPage from './components/SettingsPage.vue'
import { formatDuration } from './utils/format'
import { setupBackgroundHandlers } from './utils/background'
import { ArrowLeft, DollarSign } from 'lucide-vue-next'

const timer = useTimerStore()
const theme = useThemeStore()
const now = ref(Date.now())
const currentPage = ref('main')
let ticker: number | undefined

onMounted(() => {
  void timer.load()
  void theme.load()
  void setupBackgroundHandlers()
  ticker = window.setInterval(() => {
    now.value = Date.now()
    forceUpdateTotals()
  }, 1000)
})

// Watch for theme changes and apply CSS variables
watch(() => theme.cssVariables, (newVars) => {
  const root = document.documentElement
  Object.entries(newVars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
}, { immediate: true })

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
  <div class="relative min-h-dvh" :class="{ 'floating-particles': theme.settings.particles }">
    <div class="hero-gradient" />
    
    <!-- Main Page -->
    <div v-if="currentPage === 'main'" class="mx-auto max-w-[430px] px-4 pb-36 safe-top">
      <!-- Header with Burger Menu -->
      <header class="mb-8 flex items-center justify-between">
        <div class="flex-1">
          <h1 class="text-3xl font-bold tracking-tight mb-1" :class="theme.settings.textStyle === 'rainbow' ? 'text-gradient-rainbow' : theme.settings.textStyle === 'glow' ? 'text-gradient-glow' : 'text-gradient'">Time Tracker Pro</h1>
          <p class="text-sm text-white/80 font-medium">Simplu. Rapid. Precis. v2.0.0</p>
          <div class="flex items-center gap-2 mt-2">
            <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span class="text-xs text-white/60">Sistem activ</span>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-right">
            <div class="text-xs text-white/60">Status</div>
            <div class="text-sm font-semibold text-white">{{ stateLabel }}</div>
          </div>
          <BurgerMenu @navigate="navigateTo" />
        </div>
      </header>

      <!-- Main Timer Section -->
      <section class="card-glass card-hover p-8 mb-8" :class="{ 'glass-enhanced': theme.settings.glassEffect }">
        <div class="mb-8">
          <div class="text-center mb-6">
            <div class="text-xs text-white/70 font-medium uppercase tracking-wide mb-2">Cronometru Principal</div>
            <div class="text-7xl font-bold tabular-nums tracking-tight timer-display text-white neon-glow-blue">{{ formatDuration(elapsed) }}</div>
            <div class="text-sm text-white/60 mt-2">Timpul curent de lucru</div>
          </div>
          
          <div class="flex items-center justify-center gap-4">
            <div class="text-center">
              <div class="text-xs text-white/70 font-medium uppercase tracking-wide">Stare</div>
              <div class="text-lg font-bold text-white">{{ stateLabel }}</div>
            </div>
            <div class="w-px h-8 bg-white/20"></div>
            <div class="text-center">
              <div class="text-xs text-white/70 font-medium uppercase tracking-wide">Sesiune</div>
              <div class="text-lg font-bold text-white">{{ timer.sessions.length + 1 }}</div>
            </div>
          </div>
        </div>
        
        <!-- Address Selector -->
        <div class="mb-6">
          <AddressSelector />
        </div>

        <!-- Stats Grid -->
        <div class="grid gap-4 sm:grid-cols-3">
          <div class="rounded-2xl glass-enhanced p-6 card-hover" :class="{ 'glass-enhanced': theme.settings.glassEffect }">
            <div class="text-xs text-white/70 font-medium uppercase tracking-wide">Total lucru</div>
            <div class="text-2xl font-bold text-white">{{ formatDuration(timer.totalWorkMs) }}</div>
            <div class="text-xs text-white/50 mt-1">Sesiuni: {{ timer.sessions.filter(s => s.type === 'work').length }}</div>
          </div>
          <div class="rounded-2xl glass-enhanced p-6 card-hover" :class="{ 'glass-enhanced': theme.settings.glassEffect }">
            <div class="text-xs text-white/70 font-medium uppercase tracking-wide">Total pauză</div>
            <div class="text-2xl font-bold text-white">{{ formatDuration(timer.totalBreakMs) }}</div>
            <div class="text-xs text-white/50 mt-1">Sesiuni: {{ timer.sessions.filter(s => s.type === 'break').length }}</div>
          </div>
          <div class="rounded-2xl glass-enhanced p-6 card-hover" :class="{ 'glass-enhanced': theme.settings.glassEffect }">
            <div class="text-xs text-white/70 font-medium uppercase tracking-wide">Pauze țigară</div>
            <div class="text-2xl font-bold text-orange-400">{{ formatDuration(timer.totalCigaretteMs) }}</div>
            <div class="text-xs text-white/50 mt-1">Sesiuni: {{ timer.sessions.filter(s => s.type === 'cigarette').length }}</div>
          </div>
        </div>

        <!-- Advanced Stats -->
        <div class="mt-6 grid gap-4 sm:grid-cols-2">
          <div class="rounded-2xl glass-enhanced p-6 card-hover" :class="{ 'glass-enhanced': theme.settings.glassEffect }">
            <div class="text-xs text-white/70 font-medium uppercase tracking-wide">Eficiență</div>
            <div class="text-3xl font-bold text-green-400">
              {{ Math.round((timer.totalWorkMs / (timer.totalWorkMs + timer.totalBreakMs)) * 100) || 0 }}%
            </div>
            <div class="text-xs text-white/50 mt-1">Raport lucru/pauză</div>
          </div>
          <div class="rounded-2xl glass-enhanced p-6 card-hover" :class="{ 'glass-enhanced': theme.settings.glassEffect }">
            <div class="text-xs text-white/70 font-medium uppercase tracking-wide">Sesiune medie</div>
            <div class="text-3xl font-bold text-blue-400">
              {{ formatDuration(timer.sessions.length > 0 ? timer.sessions.reduce((acc, s) => acc + s.duration, 0) / timer.sessions.length : 0) }}
            </div>
            <div class="text-xs text-white/50 mt-1">Durată medie</div>
          </div>
        </div>

        <!-- Financial Information -->
        <div class="mt-8">
          <div class="flex items-center gap-2 mb-4">
            <DollarSign class="h-5 w-5 text-green-400" />
            <h2 class="text-lg font-semibold text-white">Informații Financiare</h2>
            <div class="ml-auto">
              <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </div>
          </div>
          <FinancialInfo />
        </div>
      </section>

      <!-- Bottom control bar -->
      <nav class="fixed inset-x-0 bottom-0 z-50 border-t border-white/30 glass-enhanced safe-bottom" :class="{ 'glass-enhanced': theme.settings.glassEffect }">
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
    <SettingsPage v-else-if="currentPage === 'settings'" @navigate="navigateTo" />
  </div>
</template>

<style scoped>
</style>
