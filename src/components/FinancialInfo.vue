<script setup lang="ts">
import { computed } from 'vue'
import { useFinancialStore } from '../stores/financialStore'
import { useTimerStore } from '../stores/timerStore'
import { TrendingUp, Calendar, Clock } from 'lucide-vue-next'

const financial = useFinancialStore()
const timer = useTimerStore()
const breakdown = computed(() => financial.financialBreakdown)

// Calculate actual earnings based on worked time
const actualEarnings = computed(() => {
  const hourlyRate = financial.hourlyRate
  
  // Calculate total work time from all completed sessions (using effective work time)
  const workSessions = timer.sessions.filter(s => s.type === 'work' && s.endedAt)
  let totalWorkTimeMs = 0
  
  for (const session of workSessions) {
    const sessionDuration = session.endedAt! - session.startedAt
    // Find all breaks that occurred during this work session
    const sessionBreaks = timer.sessions.filter(s => 
      (s.type === 'break' || s.type === 'cigarette') &&
      s.startedAt >= session.startedAt &&
      s.endedAt && s.endedAt <= session.endedAt!
    )
    
    const totalBreakTime = sessionBreaks.reduce((acc, breakSession) => {
      return acc + (breakSession.endedAt! - breakSession.startedAt)
    }, 0)
    
    // Add effective work time (session duration minus breaks)
    totalWorkTimeMs += Math.max(0, sessionDuration - totalBreakTime)
  }
  
  // Add current session work time if active
  if (timer.activeType === 'work' && timer.activeStartedAt) {
    totalWorkTimeMs += timer.totalWorkMs
  }
  
  const workTimeHours = totalWorkTimeMs / 3600000
  
  // Calculate gross earnings for actual work time
  const grossEarnings = workTimeHours * hourlyRate
  
  // Calculate net earnings using the same logic as financial store
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
  
  // Calculate net hourly rate
  const netHourlyRate = financial.hourlyRate - (totalTaxes / (financial.weeklyHours * 52))
  
  // Calculate net earnings for actual work time
  const netEarnings = workTimeHours * netHourlyRate
  
  return {
    gross: grossEarnings,
    net: Math.max(0, netEarnings),
    workTimeHours
  }
})

// Calculate daily earnings (today's work)
const dailyEarnings = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStart = today.getTime()
  
  const todaySessions = timer.sessions.filter(session => 
    session.type === 'work' && 
    session.endedAt && 
    session.endedAt >= todayStart
  )
  
  const todayWorkMs = todaySessions.reduce((acc, session) => {
    return acc + (session.endedAt! - session.startedAt)
  }, 0)
  
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
  
  const weekSessions = timer.sessions.filter(session => 
    session.type === 'work' && 
    session.endedAt && 
    session.endedAt >= weekStart.getTime()
  )
  
  const weekWorkMs = weekSessions.reduce((acc, session) => {
    return acc + (session.endedAt! - session.startedAt)
  }, 0)
  
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
  
  const monthSessions = timer.sessions.filter(session => 
    session.type === 'work' && 
    session.endedAt && 
    session.endedAt >= monthStart.getTime()
  )
  
  const monthWorkMs = monthSessions.reduce((acc, session) => {
    return acc + (session.endedAt! - session.startedAt)
  }, 0)
  
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
