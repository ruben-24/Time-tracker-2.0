<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTimerStore } from '../stores/timerStore'
import { ArrowLeft, Trash2, Filter, Calendar, ChevronDown, ChevronUp, Clock } from 'lucide-vue-next'
import { formatDuration } from '../utils/format'

const emit = defineEmits<{
  navigate: [page: string]
}>()

const timer = useTimerStore()
const filterType = ref<'all' | 'work' | 'break' | 'cigarette'>('all')
const showFilters = ref(false)
const expandedSessions = ref<Set<string>>(new Set())

const filteredSessions = computed(() => {
  if (filterType.value === 'all') return timer.sessions
  return timer.sessions.filter(session => session.type === filterType.value)
})

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
  return formatDuration(session.endedAt - session.startedAt)
}

const getTotalTime = (type: 'work' | 'break' | 'cigarette') => {
  if (type === 'work') {
    // For work sessions, calculate actual work time (excluding breaks)
    const workSessions = timer.sessions.filter(s => s.type === 'work')
    let totalWorkTime = 0
    
    for (const session of workSessions) {
      if (session.endedAt) {
        const sessionDuration = session.endedAt - session.startedAt
        // Find all breaks that occurred during this work session
        const sessionBreaks = timer.sessions.filter(s => 
          (s.type === 'break' || s.type === 'cigarette') &&
          s.startedAt >= session.startedAt &&
          s.endedAt && s.endedAt <= (session.endedAt || 0)
        )
        
        const totalBreakTime = sessionBreaks.reduce((acc, breakSession) => {
          return acc + (breakSession.endedAt ? breakSession.endedAt - breakSession.startedAt : 0)
        }, 0)
        
        // Subtract break time from work time
        totalWorkTime += Math.max(0, sessionDuration - totalBreakTime)
      }
    }
    
    return formatDuration(totalWorkTime)
  } else if (type === 'break') {
    // For breaks, include both normal breaks and cigarettes
    const breakSessions = timer.sessions.filter(s => s.type === 'break' || s.type === 'cigarette')
    const total = breakSessions.reduce((acc, session) => {
      if (session.endedAt) {
        return acc + (session.endedAt - session.startedAt)
      }
      return acc
    }, 0)
    return formatDuration(total)
  } else {
    // For cigarettes only
    const sessions = timer.sessions.filter(s => s.type === type)
    const total = sessions.reduce((acc, session) => {
      if (session.endedAt) {
        return acc + (session.endedAt - session.startedAt)
      }
      return acc
    }, 0)
    return formatDuration(total)
  }
}

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
  let totalWorkTime = 0
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
        totalWorkTime += sessionDuration
        
        timeline.push({
          type: 'work_end',
          time: endTime,
          duration: sessionDuration,
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
  
  // Calculate actual work time (subtract breaks from work time)
  const actualWorkTime = Math.max(0, totalWorkTime - totalBreakTime)
  
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

    <!-- Stats Cards -->
    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="card-glass p-4 text-center">
        <div class="text-xl font-bold text-white">{{ getTotalTime('work') }}</div>
        <div class="text-sm text-white/70">Total Lucru</div>
      </div>
      <div class="card-glass p-4 text-center">
        <div class="text-xl font-bold text-white">{{ getTotalTime('break') }}</div>
        <div class="text-sm text-white/70">Total Pauză</div>
      </div>
      <div class="card-glass p-4 text-center">
        <div class="text-xl font-bold text-orange-400">{{ getTotalTime('cigarette') }}</div>
        <div class="text-sm text-white/70">Pauze Țigară</div>
      </div>
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

    <!-- Sessions List -->
    <div class="space-y-3">
      <div 
        v-for="session in filteredSessions" 
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
              @click="toggleSessionDetails(session.id)"
              class="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronDown v-if="!expandedSessions.has(session.id)" class="h-5 w-5" />
              <ChevronUp v-else class="h-5 w-5" />
            </button>
          </div>
        </div>

        <!-- Session Details Dropdown -->
        <div v-if="expandedSessions.has(session.id)" class="mt-4 pt-4 border-t border-white/20">
          <div class="space-y-3">
            <!-- Session Totals -->
            <div class="grid grid-cols-3 gap-3 mb-4">
              <div class="bg-blue-500/10 border border-blue-400/30 rounded-lg p-3 text-center">
                <div class="text-lg font-bold text-blue-400">{{ getSessionDetails(session).totals.workTime }}</div>
                <div class="text-xs text-white/70">Total Lucru</div>
              </div>
              <div class="bg-orange-500/10 border border-orange-400/30 rounded-lg p-3 text-center">
                <div class="text-lg font-bold text-orange-400">{{ getSessionDetails(session).totals.breakTime }}</div>
                <div class="text-xs text-white/70">Total Pauză</div>
              </div>
              <div class="bg-red-500/10 border border-red-400/30 rounded-lg p-3 text-center">
                <div class="text-lg font-bold text-red-400">{{ getSessionDetails(session).totals.cigaretteTime }}</div>
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
                  'bg-blue-500/10 border border-blue-400/30': event.type === 'work_start' || event.type === 'work_end',
                  'bg-orange-500/10 border border-orange-400/30': event.type === 'break_start' && event.breakType === 'break' || event.type === 'break_end' && event.breakType === 'break',
                  'bg-red-500/10 border border-red-400/30': event.type === 'break_start' && event.breakType === 'cigarette' || event.type === 'break_end' && event.breakType === 'cigarette'
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

    <!-- Empty State -->
    <div v-if="filteredSessions.length === 0" class="text-center py-12">
      <div class="text-white/50 mb-4">
        <Calendar class="h-16 w-16 mx-auto mb-4" />
        <p class="text-lg">Nu ai sesiuni</p>
        <p class="text-sm">Începe să lucrezi pentru a vedea istoricul</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Additional styles if needed */
</style>