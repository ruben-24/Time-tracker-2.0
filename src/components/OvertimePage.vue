<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTimerStore } from '../stores/timerStore'
import { ArrowLeft, Plus, Settings } from 'lucide-vue-next'
import { formatDuration } from '../utils/format'

const emit = defineEmits<{ navigate: [page: string] }>()
const timer = useTimerStore()

const dailyTargetMs = computed(() => Math.max(0, timer.dailyTargetHours) * 3600_000)
const targetOverrides = computed(() => timer.overtimeTargetOverrides || {})

const toDateKey = (ts: number): string => {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const signed = (ms: number): string => {
  const sign = ms < 0 ? '-' : '+'
  return `${sign}${formatDuration(Math.abs(ms))}`
}

// Compute net work per day (subtract embedded breaks; legacy: subtract overlapping standalone breaks)
const dailyNetMs = computed<Record<string, number>>(() => {
  const map: Record<string, number> = {}
  const workSessions = timer.sessions.filter(s => s.type === 'work' && s.endedAt) as any[]
  for (const s of workSessions) {
    const key = toDateKey(s.startedAt)
    const gross = (s.endedAt as number) - s.startedAt
    let net = gross
    if (Array.isArray(s.breaks) && s.breaks.length > 0) {
      const embedded = s.breaks.reduce((acc: number, b: any) => acc + ((b.endedAt - b.startedAt) || b.duration || 0), 0)
      net = Math.max(0, net - embedded)
    } else {
      // Legacy standalone breaks overlapping
      const overlapping = timer.sessions.filter(ss => (ss.type === 'break' || ss.type === 'cigarette') && ss.endedAt && ss.startedAt < (s.endedAt as number) && (ss.endedAt as number) > s.startedAt)
      const overlapMs = overlapping.reduce((acc, b) => acc + Math.max(0, Math.min(b.endedAt as number, s.endedAt as number) - Math.max(b.startedAt, s.startedAt)), 0)
      net = Math.max(0, net - overlapMs)
    }
    map[key] = (map[key] || 0) + net
  }
  return map
})

const allDates = computed<string[]>(() => {
  const set = new Set<string>(Object.keys(dailyNetMs.value))
  Object.keys(timer.overtimeAdjustments || {}).forEach(k => set.add(k))
  Object.keys(targetOverrides.value || {}).forEach(k => set.add(k))
  return Array.from(set).sort((a, b) => b.localeCompare(a))
})

const dailyOvertime = computed(() => {
  const res: Array<{ date: string, net: number, target: number, overtime: number, adjustment: number }> = []
  for (const date of allDates.value) {
    const net = dailyNetMs.value[date] || 0
    const adj = (timer.overtimeAdjustments || {})[date] || 0
    const target = targetOverrides.value[date] ?? dailyTargetMs.value
    const overtime = (net - target) + adj
    res.push({ date, net, target, overtime, adjustment: adj })
  }
  return res
})

const totalOvertimeMs = computed(() => timer.overtimeGlobalOffsetMs + dailyOvertime.value.reduce((acc, d) => acc + d.overtime, 0))

// Manual adjustments
const adjDate = ref<string>('')
const adjSign = ref<'+' | '-' >('+')
const adjHours = ref<number>(0)
const adjMinutes = ref<number>(0)

const addAdjustment = () => {
  if (!adjDate.value) { alert('Alege o dată'); return }
  const ms = ((adjHours.value || 0) * 60 + (adjMinutes.value || 0)) * 60_000
  const signedMs = (adjSign.value === '-' ? -ms : ms)
  const existing = (timer.overtimeAdjustments || {})[adjDate.value] || 0
  timer.setOvertimeAdjustment(adjDate.value, existing + signedMs)
  adjHours.value = 0; adjMinutes.value = 0
}

const targetOverrideDate = ref<string>('')
const targetOverrideHours = ref<number>(0)
const targetOverrideMinutes = ref<number>(0)
const targetOverrideTotalMs = computed(() => {
  const minutes = ((targetOverrideHours.value || 0) * 60) + (targetOverrideMinutes.value || 0)
  return Math.max(0, minutes * 60_000)
})
const canSaveTargetOverride = computed(() =>
  !!targetOverrideDate.value &&
  /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(targetOverrideDate.value)
)
const saveTargetOverride = () => {
  if (!canSaveTargetOverride.value) {
    alert('Alege o dată pentru ținta personalizată.')
    return
  }
  timer.setOvertimeTargetOverride(targetOverrideDate.value, targetOverrideTotalMs.value)
  alert(`Ținta pentru ${targetOverrideDate.value} a fost setată la ${formatDuration(targetOverrideTotalMs.value)}.`)
}
const clearTargetOverride = (date: string) => {
  timer.setOvertimeTargetOverride(date, null)
}

const targetInput = ref<number>(timer.dailyTargetHours)
const saveTarget = () => { timer.setDailyTargetHours(targetInput.value) }

const offsetHours = ref<number>(Math.trunc(Math.abs(timer.overtimeGlobalOffsetMs) / 3600_000))
const offsetMinutes = ref<number>(Math.trunc((Math.abs(timer.overtimeGlobalOffsetMs) % 3600_000) / 60_000))
const offsetSign = ref<'+' | '-'>(timer.overtimeGlobalOffsetMs < 0 ? '-' : '+')
const saveOffset = () => {
  const ms = ((offsetHours.value || 0) * 60 + (offsetMinutes.value || 0)) * 60_000
  timer.setOvertimeGlobalOffset(offsetSign.value === '-' ? -ms : ms)
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 p-4 safe-top">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6 pt-4">
      <button @click="emit('navigate', 'main')" class="btn btn-primary p-3 rounded-full">
        <ArrowLeft class="h-5 w-5" />
      </button>
      <h1 class="text-2xl font-bold text-white">Ore Suplimentare</h1>
      <div></div>
    </div>

    <!-- Totals -->
    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="card-glass p-4 text-center">
        <div class="text-sm text-white/70">Țintă zilnică</div>
        <div class="text-xl font-bold text-white">{{ timer.dailyTargetHours }}h</div>
      </div>
      <div class="card-glass p-4 text-center">
        <div class="text-sm text-white/70">Offset global</div>
        <div class="text-xl font-bold" :class="totalOvertimeMs >= 0 ? 'text-emerald-400' : 'text-rose-400'">{{ signed(timer.overtimeGlobalOffsetMs) }}</div>
      </div>
      <div class="card-glass p-4 text-center">
        <div class="text-sm text-white/70">Total</div>
        <div class="text-xl font-bold" :class="totalOvertimeMs >= 0 ? 'text-emerald-400' : 'text-rose-400'">{{ signed(totalOvertimeMs) }}</div>
      </div>
    </div>

    <!-- Settings -->
    <div class="card-glass p-4 mb-6">
      <div class="flex items-center gap-2 mb-3">
        <Settings class="h-4 w-4 text-white/70" />
        <span class="text-white font-semibold">Setări</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm text-white/70 mb-1">Țintă zilnică (ore)</label>
          <div class="flex gap-2">
            <input type="number" min="0" max="16" v-model.number="targetInput" class="w-24 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white" />
            <button class="btn btn-primary" @click="saveTarget">Salvează</button>
          </div>
        </div>
        <div>
          <label class="block text-sm text-white/70 mb-1">Offset global</label>
          <div class="flex items-center gap-2">
            <select v-model="offsetSign" class="rounded-lg border border-white/20 bg-white/10 px-2 py-2 text-white">
              <option value="+">+</option>
              <option value="-">-</option>
            </select>
            <input type="number" min="0" v-model.number="offsetHours" class="w-20 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white" placeholder="ore" />
            <input type="number" min="0" max="59" v-model.number="offsetMinutes" class="w-24 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white" placeholder="minute" />
            <button class="btn btn-amber" @click="saveOffset">Aplică</button>
          </div>
        </div>
      </div>
    </div>

      <div class="grid gap-4 mb-6 md:grid-cols-2">
        <!-- Add manual adjustment -->
        <div class="card-glass p-4">
          <div class="text-white font-semibold mb-3">Adaugă ajustare manuală</div>
          <div class="flex flex-wrap items-center gap-2">
            <input type="date" v-model="adjDate" class="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white" />
            <select v-model="adjSign" class="rounded-lg border border-white/20 bg-white/10 px-2 py-2 text-white">
              <option value="+">+</option>
              <option value="-">-</option>
            </select>
            <input type="number" min="0" v-model.number="adjHours" class="w-20 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white" placeholder="ore" />
            <input type="number" min="0" max="59" v-model.number="adjMinutes" class="w-24 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white" placeholder="minute" />
            <button class="btn btn-emerald" @click="addAdjustment"><Plus class="h-4 w-4" />Adaugă</button>
          </div>
        </div>

        <!-- Target override -->
        <div class="card-glass p-4">
          <div class="text-white font-semibold mb-3">Țintă personalizată pe zi</div>
          <div class="flex flex-wrap items-center gap-2">
            <input type="date" v-model="targetOverrideDate" class="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white" />
            <input type="number" min="0" v-model.number="targetOverrideHours" class="w-20 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white" placeholder="ore" />
            <input type="number" min="0" max="59" v-model.number="targetOverrideMinutes" class="w-24 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white" placeholder="minute" />
            <button class="btn btn-primary" :disabled="!canSaveTargetOverride" @click="saveTargetOverride">
              Salvează ({{ formatDuration(targetOverrideTotalMs) }})
            </button>
          </div>
          <p class="text-xs text-white/60 mt-2">
            Pentru zile fără cerință, lasă orele/minutele la 0 și salvează.
          </p>
        </div>
      </div>

    <!-- Daily list -->
    <div class="space-y-3">
        <div v-for="d in dailyOvertime" :key="d.date" class="card-glass p-4 flex items-center justify-between gap-4">
        <div>
          <div class="text-white font-semibold">{{ new Date(d.date).toLocaleDateString('ro-RO') }}</div>
            <div class="text-xs text-white/60">
              Net lucru: {{ formatDuration(d.net) }} |
              Țintă: {{ formatDuration(d.target) }}
              <span v-if="targetOverrides[d.date]" class="text-emerald-300 ml-1">(personalizată)</span>
            </div>
          <div v-if="d.adjustment" class="text-xs text-white/60">Ajustare: {{ signed(d.adjustment) }}</div>
        </div>
          <div class="flex items-center gap-3">
            <div :class="d.overtime >= 0 ? 'text-emerald-400' : 'text-rose-400'" class="text-lg font-bold">{{ signed(d.overtime) }}</div>
            <button
              v-if="targetOverrides[d.date]"
              class="btn btn-rose text-xs px-3 py-1"
              @click="clearTargetOverride(d.date)"
            >
              Resetează ținta
            </button>
          </div>
      </div>
      <div v-if="dailyOvertime.length === 0" class="text-center text-white/60 py-8">Nu există încă zile calculate.</div>
    </div>
  </div>
</template>

<style scoped>
</style>
