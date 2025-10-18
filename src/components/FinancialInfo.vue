<script setup lang="ts">
import { computed } from 'vue'
import { useFinancialStore } from '../stores/financialStore'
import { useTimerStore } from '../stores/timerStore'
import { TrendingUp, Calendar, Clock } from 'lucide-vue-next'

const financial = useFinancialStore()
const timer = useTimerStore()
const breakdown = computed(() => financial.financialBreakdown)

// Calculate actual earnings based on worked time (exclude embedded and standalone breaks)
const actualEarnings = computed(() => {
  const hourlyRate = financial.hourlyRate

  const workSessions = timer.sessions.filter(s => s.type === 'work' && s.endedAt)
  let totalWorkTimeMs = 0

  for (const session of workSessions as any[]) {
    const sessionStart = session.startedAt as number
    const sessionEnd = session.endedAt as number
    let netMs = sessionEnd - sessionStart

    if (Array.isArray(session.breaks) && session.breaks.length > 0) {
      const embeddedBreakMs = session.breaks.reduce((acc: number, b: any) => acc + ((b.endedAt - b.startedAt) || b.duration || 0), 0)
      netMs = Math.max(0, netMs - embeddedBreakMs)
    } else {
      // Legacy: subtract standalone breaks overlapping the session
      const overlappingBreaks = timer.sessions.filter(s =>
        (s.type === 'break' || s.type === 'cigarette') && s.endedAt && s.startedAt < sessionEnd && s.endedAt > sessionStart
      )
      const overlappedBreakMs = overlappingBreaks.reduce((acc, s) => {
        const bStart = Math.max(s.startedAt, sessionStart)
        const bEnd = Math.min(s.endedAt!, sessionEnd)
        return acc + Math.max(0, bEnd - bStart)
      }, 0)
      netMs = Math.max(0, netMs - overlappedBreakMs)
    }

    totalWorkTimeMs += netMs
  }

  const workTimeHours = totalWorkTimeMs / 3600000
  const grossEarnings = workTimeHours * hourlyRate

  // Taxes and net rate
  const yearlyGross = financial.hourlyRate * financial.weeklyHours * 52
  let incomeTax = 0
  if (yearlyGross > 10908) {
    if (yearlyGross <= 62810) {
      const taxableIncome = yearlyGross - 10908
      incomeTax = taxableIncome * 0.14 + (taxableIncome - 10908) * 0.2397
    } else {
      incomeTax = yearlyGross * 0.42
    }
  }
  const socialContributions = yearlyGross * 0.20
  const solidaritySurcharge = incomeTax * 0.00825
  const totalTaxes = incomeTax + socialContributions + solidaritySurcharge
  const netHourlyRate = financial.hourlyRate - (totalTaxes / (financial.weeklyHours * 52))
  const netEarnings = workTimeHours * netHourlyRate

  return { gross: grossEarnings, net: Math.max(0, netEarnings), workTimeHours }
})

// Helper: compute effective work ms in a time range [startMs, endMs]
const computeWorkMsInRange = (startMs: number, endMs: number) => {
  // Sum effective work time from completed work sessions overlapping the range
  const workSessions = timer.sessions.filter(s => s.type === 'work' && s.endedAt)
  let totalWorkMs = 0

  for (const rawSession of workSessions as any[]) {
    const sessionStart = rawSession.startedAt as number
    const sessionEnd = rawSession.endedAt as number
    // Skip if no overlap with range
    const overlapStart = Math.max(sessionStart, startMs)
    const overlapEnd = Math.min(sessionEnd, endMs)
    if (overlapEnd <= overlapStart) continue

    // Base duration inside the range window
    const overlappedDuration = overlapEnd - overlapStart

    // If this session has embedded breaks, subtract only overlapping portions
    const embeddedBreaks: any[] = Array.isArray(rawSession.breaks) ? rawSession.breaks : []
    if (embeddedBreaks.length > 0) {
      const overlappedBreakMs = embeddedBreaks.reduce((acc, b) => {
        const bStart = Math.max(b.startedAt, overlapStart)
        const bEnd = Math.min(b.endedAt, overlapEnd)
        const d = Math.max(0, bEnd - bStart)
        return acc + d
      }, 0)
      totalWorkMs += Math.max(0, overlappedDuration - overlappedBreakMs)
      continue
    }

    // Legacy sessions without embedded breaks: subtract standalone break/cigarette sessions that overlap
    const overlappingBreaks = timer.sessions.filter(s =>
      (s.type === 'break' || s.type === 'cigarette') && s.endedAt && s.startedAt < overlapEnd && s.endedAt > overlapStart
    )
    const overlappedBreakMs = overlappingBreaks.reduce((acc, s) => {
      const bStart = Math.max(s.startedAt, overlapStart)
      const bEnd = Math.min(s.endedAt!, overlapEnd)
      return acc + Math.max(0, bEnd - bStart)
    }, 0)
    totalWorkMs += Math.max(0, overlappedDuration - overlappedBreakMs)
  }

  return totalWorkMs
}

// Calculate daily earnings (today's work)
const dailyEarnings = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = today.getTime()
  const end = start + 24 * 60 * 60 * 1000 - 1
  const todayWorkMs = computeWorkMsInRange(start, end)
  
  const todayWorkHours = todayWorkMs / 3600000
  const hourlyRate = financial.hourlyRate
  
  // Calculate net hourly rate using financial store logic
  const yearlyGross = financial.hourlyRate * financial.weeklyHours * 52
  let incomeTax = 0
  if (yearlyGross > 10908) {
    if (yearlyGross <= 62810) {
      const taxableIncome = yearlyGross - 10908
      incomeTax = taxableIncome * 0.14 + (taxableIncome - 10908) * 0.2397
    } else {
      incomeTax = yearlyGross * 0.42
    }
  }
  const socialContributions = yearlyGross * 0.20
  const solidaritySurcharge = incomeTax * 0.00825
  const totalTaxes = incomeTax + socialContributions + solidaritySurcharge
  const netHourlyRate = financial.hourlyRate - (totalTaxes / (financial.weeklyHours * 52))
  
  const gross = todayWorkHours * hourlyRate
  const net = todayWorkHours * netHourlyRate
  
  return { gross, net, workTimeHours: todayWorkHours }
})

// Calculate weekly earnings
const weeklyEarnings = computed(() => {
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const start = weekStart.getTime()
  const end = start + 7 * 24 * 60 * 60 * 1000 - 1
  const weekWorkMs = computeWorkMsInRange(start, end)
  
  const weekWorkHours = weekWorkMs / 3600000
  const hourlyRate = financial.hourlyRate
  
  // Calculate net hourly rate using financial store logic
  const yearlyGross = financial.hourlyRate * financial.weeklyHours * 52
  let incomeTax = 0
  if (yearlyGross > 10908) {
    if (yearlyGross <= 62810) {
      const taxableIncome = yearlyGross - 10908
      incomeTax = taxableIncome * 0.14 + (taxableIncome - 10908) * 0.2397
    } else {
      incomeTax = yearlyGross * 0.42
    }
  }
  const socialContributions = yearlyGross * 0.20
  const solidaritySurcharge = incomeTax * 0.00825
  const totalTaxes = incomeTax + socialContributions + solidaritySurcharge
  const netHourlyRate = financial.hourlyRate - (totalTaxes / (financial.weeklyHours * 52))
  
  const gross = weekWorkHours * hourlyRate
  const net = weekWorkHours * netHourlyRate
  
  return { gross, net, workTimeHours: weekWorkHours }
})

// Calculate monthly earnings
const monthlyEarnings = computed(() => {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const start = monthStart.getTime()
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() - 1
  const monthWorkMs = computeWorkMsInRange(start, end)
  
  const monthWorkHours = monthWorkMs / 3600000
  const hourlyRate = financial.hourlyRate
  
  // Calculate net hourly rate using financial store logic
  const yearlyGross = financial.hourlyRate * financial.weeklyHours * 52
  let incomeTax = 0
  if (yearlyGross > 10908) {
    if (yearlyGross <= 62810) {
      const taxableIncome = yearlyGross - 10908
      incomeTax = taxableIncome * 0.14 + (taxableIncome - 10908) * 0.2397
    } else {
      incomeTax = yearlyGross * 0.42
    }
  }
  const socialContributions = yearlyGross * 0.20
  const solidaritySurcharge = incomeTax * 0.00825
  const totalTaxes = incomeTax + socialContributions + solidaritySurcharge
  const netHourlyRate = financial.hourlyRate - (totalTaxes / (financial.weeklyHours * 52))
  
  const gross = monthWorkHours * hourlyRate
  const net = monthWorkHours * netHourlyRate
  
  return { gross, net, workTimeHours: monthWorkHours }
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
        {{ formatCurrency(actualEarnings.gross) }}
      </div>
      <div class="text-sm text-white/70">
        Net: {{ formatCurrency(actualEarnings.net) }}
      </div>
      <div class="text-xs text-white/60 mt-1">
        {{ actualEarnings.workTimeHours.toFixed(1) }}h lucrate
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
          <div class="text-xl font-bold text-white">{{ formatCurrency(dailyEarnings.gross) }}</div>
        </div>
        <div>
          <div class="text-sm text-white/70">Net</div>
          <div class="text-xl font-bold text-green-400">{{ formatCurrency(dailyEarnings.net) }}</div>
        </div>
      </div>
      <div class="text-xs text-white/60 mt-2">
        {{ dailyEarnings.workTimeHours.toFixed(1) }}h lucrate astăzi
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
          <div class="text-xl font-bold text-white">{{ formatCurrency(weeklyEarnings.gross) }}</div>
        </div>
        <div>
          <div class="text-sm text-white/70">Net</div>
          <div class="text-xl font-bold text-green-400">{{ formatCurrency(weeklyEarnings.net) }}</div>
        </div>
      </div>
      <div class="text-xs text-white/60 mt-2">
        {{ weeklyEarnings.workTimeHours.toFixed(1) }}h lucrate săptămâna aceasta
      </div>
    </div>

    <!-- Monthly Summary -->
    <div class="card-glass p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-semibold text-white">Luna</h3>
        <Calendar class="h-5 w-5 text-orange-400" />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <div class="text-sm text-white/70">Brut</div>
          <div class="text-xl font-bold text-white">{{ formatCurrency(monthlyEarnings.gross) }}</div>
        </div>
        <div>
          <div class="text-sm text-white/70">Net</div>
          <div class="text-xl font-bold text-green-400">{{ formatCurrency(monthlyEarnings.net) }}</div>
        </div>
      </div>
      <div class="text-xs text-white/60 mt-2">
        {{ monthlyEarnings.workTimeHours.toFixed(1) }}h lucrate luna aceasta
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
