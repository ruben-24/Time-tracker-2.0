<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTimerStore, type Session } from '../stores/timerStore'
import { ArrowLeft, Trash2, Filter, Calendar, ChevronDown, ChevronUp, Clock } from 'lucide-vue-next'
import { formatDuration } from '../utils/format'

const emit = defineEmits<{
  navigate: [page: string]
}>()

const timer = useTimerStore()
const filterType = ref<'all' | 'work' | 'break' | 'cigarette'>('all')
const showFilters = ref(false)
const expandedMonths = ref<Set<string>>(new Set())
const expandedSessions = ref<Set<string>>(new Set())
const isEditOpen = ref(false)
const editingSession = ref<any | null>(null)

const filteredSessions = computed<Session[]>(() => {
  if (filterType.value === 'all') return timer.sessions
  return timer.sessions.filter(session => session.type === filterType.value)
})

const toggleMonth = (key: string) => {
  const next = new Set(expandedMonths.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expandedMonths.value = next
}

const isMonthExpanded = (key: string) => expandedMonths.value.has(key)

type MonthTotals = {
  workMs: number
  breakMs: number
  cigaretteMs: number
}

type MonthGroup = {
  key: string
  label: string
  sessions: Session[]
  totals: MonthTotals
}

const getMonthKey = (ts: number): string => {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  return `${y}-${m.toString().padStart(2, '0')}`
}

const formatMonthLabel = (key: string): string => {
  const [yStr, mStr] = key.split('-')
  const y = Number(yStr)
  const m = Number(mStr)
  const date = new Date(y, m - 1, 1)
  return date.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })
}

const computeMonthTotals = (monthSessions: Session[]): MonthTotals => {
  let workMs = 0
  let breakMs = 0
  let cigaretteMs = 0

  const workSessions = monthSessions.filter(s => s.type === 'work') as Session[]
  const standaloneBreaks = monthSessions.filter(s => s.type === 'break' || s.type === 'cigarette') as Session[]

  // Work totals: sum net work time (subtract embedded breaks; fallback to overlapping standalone if no embedded)
  for (const s of workSessions) {
    if (!s.endedAt) continue
    const gross = s.endedAt - s.startedAt
    if (Array.isArray(s.breaks) && s.breaks.length > 0) {
      const embedded = s.breaks.reduce((acc, b) => acc + (b.duration || Math.max(0, (b.endedAt || 0) - b.startedAt)), 0)
      workMs += Math.max(0, gross - embedded)
    } else {
      // Legacy fallback: subtract overlapping standalone breaks in the same month
      const overlapping = standaloneBreaks.filter(b => b.endedAt && b.startedAt < s.endedAt! && b.endedAt! > s.startedAt)
      const overlapMs = overlapping.reduce((acc, b) => acc + Math.max(0, Math.min(b.endedAt!, s.endedAt!) - Math.max(b.startedAt, s.startedAt)), 0)
      workMs += Math.max(0, gross - overlapMs)
    }
  }

  // Break totals: standalone break + in-session breaks
  const standaloneBreakMs = standaloneBreaks.reduce((acc, b) => acc + (b.endedAt ? Math.max(0, b.endedAt - b.startedAt) : 0), 0)
  const inSessionBreakMs = workSessions.reduce((acc, s) => acc + (s.breaks?.reduce((bAcc, b) => bAcc + (b.duration || Math.max(0, (b.endedAt || 0) - b.startedAt)), 0) || 0), 0)
  breakMs = standaloneBreakMs + inSessionBreakMs

  // Cigarette totals: standalone cigarettes + in-session cigarette breaks
  const standaloneCigaretteMs = monthSessions
    .filter(s => s.type === 'cigarette')
    .reduce((acc, c) => acc + (c.endedAt ? Math.max(0, c.endedAt - c.startedAt) : 0), 0)
  const inSessionCigaretteMs = workSessions.reduce((acc, s) => acc + (s.breaks?.reduce((bAcc, b) => bAcc + (b.type === 'cigarette' ? (b.duration || Math.max(0, (b.endedAt || 0) - b.startedAt)) : 0), 0) || 0), 0)
  cigaretteMs = standaloneCigaretteMs + inSessionCigaretteMs

  return { workMs, breakMs, cigaretteMs }
}

const groupedMonths = computed<MonthGroup[]>(() => {
  // Map of sessions to display (respects filter)
  const displayMap = new Map<string, Session[]>()
  for (const s of filteredSessions.value) {
    const key = getMonthKey(s.startedAt)
    const arr = displayMap.get(key)
    if (arr) arr.push(s)
    else displayMap.set(key, [s])
  }

  // Map of all sessions (for accurate per-month totals regardless of filter)
  const allMap = new Map<string, Session[]>()
  for (const s of timer.sessions) {
    const key = getMonthKey(s.startedAt)
    const arr = allMap.get(key)
    if (arr) arr.push(s)
    else allMap.set(key, [s])
  }

  const groups: MonthGroup[] = []
  for (const [key, sessions] of displayMap.entries()) {
    const sortedDisplay = [...sessions].sort((a, b) => (b.startedAt - a.startedAt))
    const allForMonth = allMap.get(key) ?? []
    groups.push({
      key,
      label: formatMonthLabel(key),
      sessions: sortedDisplay,
      totals: computeMonthTotals(allForMonth)
    })
  }

  // Sort groups by year-month descending
  groups.sort((a, b) => b.key.localeCompare(a.key))
  return groups
})

watch(groupedMonths, groups => {
  const activeKeys = new Set(groups.map(g => g.key))
  const retained = new Set<string>()
  for (const key of expandedMonths.value) {
    if (activeKeys.has(key)) retained.add(key)
  }
  if (retained.size === 0 && groups.length > 0) {
    const firstGroup = groups[0]
    if (firstGroup) {
      retained.add(firstGroup.key)
    }
  }
  expandedMonths.value = retained
}, { immediate: true })

const deleteSession = (sessionId: string) => {
  if (confirm('Sigur vrei să ștergi această sesiune?')) {
    timer.sessions = timer.sessions.filter(s => s.id !== sessionId)
    timer.persist()
  }
}

const cleanupOldData = () => {
  if (confirm('Sigur vrei să elimini toate sesiunile vechi de pauză din istoric? Această acțiune nu poate fi anulată.')) {
    const beforeCount = timer.sessions.length
    timer.cleanupOldBreakSessions()
    const afterCount = timer.sessions.length
    const removedCount = beforeCount - afterCount
    
    if (removedCount > 0) {
      alert(`Datele au fost curățate! Au fost eliminate ${removedCount} sesiuni duplicate.`)
    } else {
      alert('Nu au fost găsite sesiuni duplicate de eliminat.')
    }
  }
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getSessionDuration = (session: any) => {
  if (!session.endedAt) return 'În desfășurare'
  const gross = session.endedAt - session.startedAt
  // Subtract embedded breaks when present; else subtract overlapping standalone breaks
  if (Array.isArray(session.breaks) && session.breaks.length > 0) {
    const embedded = session.breaks.reduce((acc: number, b: any) => acc + ((b.endedAt - b.startedAt) || b.duration || 0), 0)
    return formatDuration(Math.max(0, gross - embedded))
  }
  const overlapping = timer.sessions.filter(s => (s.type === 'break' || s.type === 'cigarette') && s.endedAt && s.startedAt < session.endedAt && s.endedAt > session.startedAt)
  const overlapMs = overlapping.reduce((acc, s) => acc + Math.max(0, Math.min(s.endedAt!, session.endedAt) - Math.max(s.startedAt, session.startedAt)), 0)
  return formatDuration(Math.max(0, gross - overlapMs))
}

// Global totals replaced by per-month totals; keeping helper if needed in future

const toggleSessionDetails = (sessionId: string) => {
  if (expandedSessions.value.has(sessionId)) {
    expandedSessions.value.delete(sessionId)
  } else {
    expandedSessions.value.add(sessionId)
  }
}

const getSessionDetails = (session: any) => {
  const sessionDate = new Date(session.startedAt)
  const dayStart = new Date(sessionDate)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(sessionDate)
  dayEnd.setHours(23, 59, 59, 999)
  
  // Get all sessions from the same day
  const daySessions = timer.sessions.filter(s => {
    const sDate = new Date(s.startedAt)
    return sDate >= dayStart && sDate <= dayEnd
  }).sort((a, b) => a.startedAt - b.startedAt)
  
  const timeline = []
  let totalNetWorkTime = 0
  let totalBreakTime = 0
  let totalCigaretteTime = 0
  
  for (const s of daySessions) {
    const startTime = new Date(s.startedAt)
    const endTime = s.endedAt ? new Date(s.endedAt) : null
    
      if (s.type === 'work') {
      // Add work start
      timeline.push({
        type: 'work_start',
        time: startTime,
        note: 'Lucru început'
      })
      
      // Add breaks from this work session
      if (s.breaks && s.breaks.length > 0) {
        for (const breakItem of s.breaks) {
          const breakStartTime = new Date(breakItem.startedAt)
          const breakEndTime = new Date(breakItem.endedAt)
          const breakDuration = breakItem.duration
          
          const breakType = breakItem.type === 'cigarette' ? 'Pauză țigară' : 'Pauză'
          
          if (breakItem.type === 'cigarette') {
            totalCigaretteTime += breakDuration
            totalBreakTime += breakDuration
          } else {
            totalBreakTime += breakDuration
          }
          
          // Add break start
          timeline.push({
            type: 'break_start',
            time: breakStartTime,
            note: breakType + ' la ' + formatTime(breakStartTime),
            breakType: breakItem.type
          })
          
          // Add break end
          timeline.push({
            type: 'break_end',
            time: breakEndTime,
            duration: breakDuration,
            note: breakType + ' încheiată',
            breakType: breakItem.type
          })
        }
      }
      
      // Add work end if exists
      if (endTime) {
        const sessionDuration = endTime.getTime() - startTime.getTime()
        let netMs = sessionDuration
        if (Array.isArray((s as any).breaks) && (s as any).breaks.length > 0) {
          const embeddedBreakMs = (s as any).breaks.reduce((acc: number, b: any) => acc + ((b.endedAt - b.startedAt) || b.duration || 0), 0)
          netMs = Math.max(0, netMs - embeddedBreakMs)
        }
        totalNetWorkTime += netMs
        timeline.push({
          type: 'work_end',
          time: endTime,
          duration: netMs,
          note: 'Program încheiat'
        })
      }
    } else if (s.type === 'break' || s.type === 'cigarette') {
      const breakType = s.type === 'cigarette' ? 'Pauză țigară' : 'Pauză'
      const breakDuration = endTime ? endTime.getTime() - startTime.getTime() : 0
      
      if (s.type === 'cigarette') {
        totalCigaretteTime += breakDuration
        totalBreakTime += breakDuration // Include cigarette breaks in total break time
      } else {
        totalBreakTime += breakDuration
      }
      
      // Add break start
      timeline.push({
        type: 'break_start',
        time: startTime,
        note: breakType + ' la ' + formatTime(startTime),
        breakType: s.type
      })
      
      // Add break end if exists
      if (endTime) {
        timeline.push({
          type: 'break_end',
          time: endTime,
          duration: endTime.getTime() - startTime.getTime(),
          note: breakType + ' încheiată',
          breakType: s.type
        })
      }
    }
  }
  
  // actual work time is the sum of net work across sessions (breaks already subtracted)
  const actualWorkTime = totalNetWorkTime
  
  return {
    date: sessionDate.toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }),
    timeline: timeline.sort((a, b) => a.time.getTime() - b.time.getTime()),
    totals: {
      workTime: formatDuration(actualWorkTime),
      breakTime: formatDuration(totalBreakTime),
      cigaretteTime: formatDuration(totalCigaretteTime)
    }
  }
}

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('ro-RO', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const toInputValue = (ts: number) => {
  const d = new Date(ts)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

const fromInputValue = (val: string): number => {
  return new Date(val).getTime()
}

const openEdit = (session: Session) => {
  const base: any = {
    id: session.id,
    type: session.type,
    startedAtStr: toInputValue(session.startedAt),
    endedAtStr: session.endedAt ? toInputValue(session.endedAt) : '',
    note: session.note || ''
  }
  if (session.type === 'work') {
    base.breaks = (session.breaks || []).map(b => ({
      id: b.id,
      type: b.type,
      startStr: toInputValue(b.startedAt),
      endStr: toInputValue(b.endedAt)
    }))
  }
  editingSession.value = base
  isEditOpen.value = true
}

const addEditBreak = () => {
  if (!editingSession.value) return
  const start = editingSession.value.startedAtStr
  const end = editingSession.value.endedAtStr || editingSession.value.startedAtStr
  editingSession.value.breaks = editingSession.value.breaks || []
  editingSession.value.breaks.push({
    id: crypto.randomUUID(),
    type: 'break',
    startStr: start,
    endStr: end
  })
}

const removeEditBreak = (idx: number) => {
  if (!editingSession.value?.breaks) return
  editingSession.value.breaks.splice(idx, 1)
}

const saveEdit = () => {
  if (!editingSession.value) return
  try {
    const id = editingSession.value.id as string
    const startedAt = fromInputValue(editingSession.value.startedAtStr)
    const endedAt = editingSession.value.endedAtStr ? fromInputValue(editingSession.value.endedAtStr) : null
    const note = (editingSession.value.note || '').trim()

    const updates: any = { startedAt, endedAt, note }
    const original = timer.sessions.find(s => s.id === id)
    if (original?.type === 'work') {
      const breaks = (editingSession.value.breaks || []).map((b: any) => ({
        id: b.id,
        type: b.type,
        startedAt: fromInputValue(b.startStr),
        endedAt: fromInputValue(b.endStr),
        duration: 0 // will be normalized in store
      }))
      updates.breaks = breaks
    }
    timer.updateSession(id, updates)
    isEditOpen.value = false
    editingSession.value = null
  } catch (e) {
    alert((e as Error).message || 'Eroare la salvare')
  }
}

const cancelEdit = () => {
  isEditOpen.value = false
  editingSession.value = null
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 p-4 safe-top">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6 pt-4">
      <button @click="emit('navigate', 'main')" class="btn btn-primary p-3 rounded-full">
        <ArrowLeft class="h-5 w-5" />
      </button>
      <h1 class="text-2xl font-bold text-white">Istoric Sesiuni</h1>
      <button 
        @click="showFilters = !showFilters"
        class="btn btn-amber p-3 rounded-full"
      >
        <Filter class="h-5 w-5" />
      </button>
    </div>

    <!-- Monthly Groups with dropdown -->
    <div v-for="group in groupedMonths" :key="group.key" class="mb-6">
      <button
        @click="toggleMonth(group.key)"
        class="w-full flex items-center justify-between rounded-xl px-4 py-3 bg-white/5 hover:bg-white/10 transition-colors"
      >
        <div class="text-left">
          <h2 class="text-lg font-semibold text-white">{{ group.label }}</h2>
          <div class="text-xs text-white/60 mt-1">
            {{ group.sessions.length }} {{ group.sessions.length === 1 ? 'sesiune' : 'sesiuni' }}
            • Lucru: {{ formatDuration(group.totals.workMs) }}
            • Pauză: {{ formatDuration(group.totals.breakMs) }}
          </div>
        </div>
        <div class="text-white/70">
          <ChevronDown v-if="!isMonthExpanded(group.key)" class="h-5 w-5" />
          <ChevronUp v-else class="h-5 w-5" />
        </div>
      </button>

      <Transition name="fade">
        <div v-if="isMonthExpanded(group.key)" class="mt-4 space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="card-glass p-4 text-center">
              <div class="text-xl font-bold text-white">{{ formatDuration(group.totals.workMs) }}</div>
              <div class="text-sm text-white/70">Total Lucru</div>
            </div>
            <div class="card-glass p-4 text-center">
              <div class="text-xl font-bold text-white">{{ formatDuration(group.totals.breakMs) }}</div>
              <div class="text-sm text-white/70">Total Pauză</div>
            </div>
            <div class="card-glass p-4 text-center">
              <div class="text-xl font-bold text-white">{{ formatDuration(group.totals.cigaretteMs) }}</div>
              <div class="text-sm text-white/70">Pauze Țigară</div>
            </div>
          </div>

          <!-- Sessions List for the month -->
          <div class="space-y-3">
            <div
              v-for="session in group.sessions"
              :key="session.id"
              class="card-glass p-5"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-3 mb-2">
                    <div
                      :class="[
                        'w-3 h-3 rounded-full',
                        session.type === 'work' ? 'bg-blue-500' :
                        session.type === 'break' ? 'bg-orange-500' : 'bg-red-500'
                      ]"
                    ></div>
                    <span class="font-semibold text-white">
                      {{ session.type === 'work' ? 'Lucru' :
                         session.type === 'break' ? 'Pauză' : 'Pauză țigară' }}
                    </span>
                    <span class="text-white/60 text-sm">
                      {{ session.manual ? '(Manual)' : '' }}
                    </span>
                  </div>

                  <div class="text-white/70 text-sm space-y-1">
                    <div class="flex items-center gap-2">
                      <Calendar class="h-4 w-4" />
                      <span>{{ formatDate(session.startedAt) }}</span>
                    </div>
                    <div v-if="session.address" class="text-xs">
                      📍 {{ session.address }}
                    </div>
                    <div v-if="session.note" class="text-xs">
                      📝 {{ session.note }}
                    </div>
                  </div>
                </div>

                <div class="text-right ml-4 flex items-center gap-3">
                  <div>
                    <div class="text-lg font-bold text-white">
                      {{ getSessionDuration(session) }}
                    </div>
                    <button
                      @click="deleteSession(session.id)"
                      class="text-red-400 hover:text-red-300 text-sm mt-1"
                    >
                      <Trash2 class="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    @click="openEdit(session)"
                    class="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    title="Editează sesiunea"
                  >
                    Edit
                  </button>
                  <button
                    @click="toggleSessionDetails(session.id)"
                    class="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <ChevronDown v-if="!expandedSessions.has(session.id)" class="h-5 w-5" />
                    <ChevronUp v-else class="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div v-if="expandedSessions.has(session.id)" class="mt-4 pt-4 border-t border-white/20">
                <div class="space-y-3">
                  <div class="grid grid-cols-3 gap-3 mb-4">
                    <div class="card-glass p-3 text-center">
                      <div class="text-lg font-bold text-white">{{ getSessionDetails(session).totals.workTime }}</div>
                      <div class="text-xs text-white/70">Total Lucru</div>
                    </div>
                    <div class="card-glass p-3 text-center">
                      <div class="text-lg font-bold text-white">{{ getSessionDetails(session).totals.breakTime }}</div>
                      <div class="text-xs text-white/70">Total Pauză</div>
                    </div>
                    <div class="card-glass p-3 text-center">
                      <div class="text-lg font-bold text-white">{{ getSessionDetails(session).totals.cigaretteTime }}</div>
                      <div class="text-xs text-white/70">Pauze Țigară</div>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 mb-3">
                    <Clock class="h-4 w-4 text-blue-400" />
                    <span class="font-semibold text-white">Cronologia zilei {{ getSessionDetails(session).date }}</span>
                  </div>

                  <div class="space-y-2">
                    <div
                      v-for="(event, index) in getSessionDetails(session).timeline"
                      :key="index"
                      class="flex items-center gap-3 p-2 rounded-lg"
                      :class="{
                        'bg-blue-600/15 border border-blue-400/40 ring-1 ring-inset ring-blue-400/20 border-l-4 border-l-blue-400': event.type === 'work_start' || event.type === 'work_end',
                        'bg-amber-400/15 border border-amber-400/50 ring-1 ring-inset ring-amber-400/20 border-l-4 border-l-amber-400': (event.type === 'break_start' && event.breakType === 'break') || (event.type === 'break_end' && event.breakType === 'break'),
                        'bg-rose-500/15 border border-rose-500/60 ring-1 ring-inset ring-rose-500/20 border-l-4 border-l-rose-500': (event.type === 'break_start' && event.breakType === 'cigarette') || (event.type === 'break_end' && event.breakType === 'cigarette')
                      }"
                    >
                      <div class="text-sm font-mono text-white/80 min-w-[60px]">
                        {{ formatTime(event.time) }}
                      </div>
                      <div class="flex-1">
                        <div class="text-sm text-white font-medium">{{ event.note }}</div>
                        <div v-if="event.duration" class="text-xs text-white/60">
                          Durată: {{ formatDuration(event.duration) }}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-if="getSessionDetails(session).timeline.length === 0" class="text-center py-4">
                    <div class="text-white/50 text-sm">Nu există evenimente pentru această zi</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Cleanup Button -->
    <div class="card-glass p-4 mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-white">Curățare date</h3>
          <p class="text-sm text-white/70">Elimină sesiunile vechi de pauză din istoric</p>
        </div>
        <button 
          @click="cleanupOldData"
          class="btn btn-danger"
        >
          Curăță datele
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div v-if="showFilters" class="card-glass p-4 mb-6">
      <h3 class="text-lg font-semibold text-white mb-4">Filtrează</h3>
      <div class="flex gap-2">
        <button 
          @click="filterType = 'all'"
          :class="['btn', filterType === 'all' ? 'btn-primary' : 'btn-secondary']"
        >
          Toate
        </button>
        <button 
          @click="filterType = 'work'"
          :class="['btn', filterType === 'work' ? 'btn-primary' : 'btn-secondary']"
        >
          Lucru
        </button>
        <button 
          @click="filterType = 'break'"
          :class="['btn', filterType === 'break' ? 'btn-primary' : 'btn-secondary']"
        >
          Pauză
        </button>
        <button 
          @click="filterType = 'cigarette'"
          :class="['btn', filterType === 'cigarette' ? 'btn-primary' : 'btn-secondary']"
        >
          Țigară
        </button>
      </div>
    </div>

    

    <!-- Empty State -->
    <div v-if="groupedMonths.length === 0" class="text-center py-12">
      <div class="text-white/50 mb-4">
        <Calendar class="h-16 w-16 mx-auto mb-4" />
        <p class="text-lg">Nu ai sesiuni</p>
        <p class="text-sm">Începe să lucrezi pentru a vedea istoricul</p>
      </div>
    </div>
  </div>
  
  <!-- Edit Modal -->
  <div v-if="isEditOpen" class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
    <div class="card-glass w-full max-w-lg p-5">
      <h3 class="text-lg font-semibold text-white mb-4">Editează sesiunea</h3>
      <div v-if="editingSession" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-white/70 mb-1">Început</label>
            <input type="datetime-local" v-model="editingSession.startedAtStr" class="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white text-sm" />
          </div>
          <div>
            <label class="block text-sm text-white/70 mb-1">Sfârșit</label>
            <input type="datetime-local" v-model="editingSession.endedAtStr" class="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white text-sm" />
          </div>
        </div>
        <div>
          <label class="block text-sm text-white/70 mb-1">Notițe</label>
          <textarea v-model="editingSession.note" rows="2" class="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white text-sm"></textarea>
        </div>

        <div v-if="editingSession.type === 'work'" class="pt-2">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-white/80 font-medium">Pauze în sesiune</span>
            <button class="btn btn-amber px-3 py-1 text-xs" @click="addEditBreak">Adaugă pauză</button>
          </div>
          <div v-if="editingSession.breaks && editingSession.breaks.length > 0" class="space-y-2 max-h-48 overflow-y-auto pr-1">
            <div v-for="(b, idx) in editingSession.breaks" :key="b.id" class="grid grid-cols-2 gap-2 items-end bg-white/5 rounded-lg p-2">
              <div>
                <label class="block text-xs text-white/60 mb-1">Tip</label>
                <select v-model="b.type" class="w-full rounded-lg border border-white/20 bg-white/10 px-2 py-2 text-white text-xs">
                  <option value="break">Pauză</option>
                  <option value="cigarette">Țigară</option>
                </select>
              </div>
              <div class="text-right">
                <button class="text-rose-400 text-xs" @click="removeEditBreak(idx)">Șterge</button>
              </div>
              <div>
                <label class="block text-xs text-white/60 mb-1">Start</label>
                <input type="datetime-local" v-model="b.startStr" class="w-full rounded-lg border border-white/20 bg-white/10 px-2 py-2 text-white text-xs" />
              </div>
              <div>
                <label class="block text-xs text-white/60 mb-1">Stop</label>
                <input type="datetime-local" v-model="b.endStr" class="w-full rounded-lg border border-white/20 bg-white/10 px-2 py-2 text-white text-xs" />
              </div>
            </div>
          </div>
        </div>

        <div class="flex gap-2 pt-2">
          <button class="btn btn-primary flex-1" @click="saveEdit">Salvează</button>
          <button class="btn btn-glass flex-1" @click="cancelEdit">Anulează</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>