<script setup lang="ts">
import { computed } from 'vue'
import { useFinancialStore } from '../stores/financialStore'
import { useTimerStore } from '../stores/timerStore'
import { TrendingUp, Calendar, Clock } from 'lucide-vue-next'

const financial = useFinancialStore()
const timer = useTimerStore()
const breakdown = computed(() => financial.financialBreakdown)

// Calculate elapsed time for current session
const elapsed = computed(() => {
  if (!timer.activeStartedAt) return 0
  return Date.now() - timer.activeStartedAt
})

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

// const formatPercentage = (value: number, total: number) => {
//   return ((value / total) * 100).toFixed(1)
// }
</script>

<template>
  <div class="space-y-4">
    <!-- Current Session Earnings -->
    <div class="card-glass p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-semibold text-white">Câștig Sesiune</h3>
        <Clock class="h-5 w-5 text-blue-400" />
      </div>
      <div class="text-2xl font-bold text-white">
        {{ formatCurrency(breakdown.grossHourly * (elapsed / 3600000)) }}
      </div>
      <div class="text-sm text-white/70">
        Net: {{ formatCurrency(breakdown.netHourly * (elapsed / 3600000)) }}
      </div>
    </div>

    <!-- Daily Summary -->
    <div class="card-glass p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-semibold text-white">Astăzi</h3>
        <Calendar class="h-5 w-5 text-green-400" />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <div class="text-sm text-white/70">Brut</div>
          <div class="text-xl font-bold text-white">{{ formatCurrency(breakdown.grossDaily) }}</div>
        </div>
        <div>
          <div class="text-sm text-white/70">Net</div>
          <div class="text-xl font-bold text-green-400">{{ formatCurrency(breakdown.netDaily) }}</div>
        </div>
      </div>
    </div>

    <!-- Weekly Summary -->
    <div class="card-glass p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-semibold text-white">Săptămâna</h3>
        <TrendingUp class="h-5 w-5 text-purple-400" />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <div class="text-sm text-white/70">Brut</div>
          <div class="text-xl font-bold text-white">{{ formatCurrency(breakdown.grossWeekly) }}</div>
        </div>
        <div>
          <div class="text-sm text-white/70">Net</div>
          <div class="text-xl font-bold text-green-400">{{ formatCurrency(breakdown.netWeekly) }}</div>
        </div>
      </div>
    </div>

    <!-- Tax Breakdown -->
    <div class="card-glass p-4">
      <h3 class="text-lg font-semibold text-white mb-3">Impozite (Anual)</h3>
      <div class="space-y-2">
        <div class="flex justify-between text-sm">
          <span class="text-white/70">Impozit pe venit</span>
          <span class="text-white">{{ formatCurrency(breakdown.taxes.incomeTax) }}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-white/70">Contribuții sociale</span>
          <span class="text-white">{{ formatCurrency(breakdown.taxes.socialContributions) }}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-white/70">Solidaritätszuschlag</span>
          <span class="text-white">{{ formatCurrency(breakdown.taxes.solidaritySurcharge) }}</span>
        </div>
        <div class="border-t border-white/20 pt-2">
          <div class="flex justify-between font-semibold">
            <span class="text-white">Total impozite</span>
            <span class="text-red-400">{{ formatCurrency(breakdown.taxes.totalTaxes) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Rate Information -->
    <div class="card-glass p-4">
      <h3 class="text-lg font-semibold text-white mb-3">Rate Orară</h3>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <div class="text-sm text-white/70">Brut</div>
          <div class="text-xl font-bold text-white">{{ formatCurrency(breakdown.grossHourly) }}</div>
        </div>
        <div>
          <div class="text-sm text-white/70">Net</div>
          <div class="text-xl font-bold text-green-400">{{ formatCurrency(breakdown.netHourly) }}</div>
        </div>
      </div>
      <div class="mt-3 text-xs text-white/60">
        Clasa fiscală {{ financial.taxClass }} • {{ financial.weeklyHours }}h/săptămână
      </div>
    </div>
  </div>
</template>
