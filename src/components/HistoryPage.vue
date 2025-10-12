<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTimerStore } from '../stores/timerStore'
import { ArrowLeft, Trash2, Filter, Calendar } from 'lucide-vue-next'
import { formatDuration } from '../utils/format'

const timer = useTimerStore()
const filterType = ref<'all' | 'work' | 'break'>('all')
const showFilters = ref(false)

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

const getTotalTime = (type: 'work' | 'break') => {
  const sessions = timer.sessions.filter(s => s.type === type)
  const total = sessions.reduce((acc, session) => {
    const endTime = session.endedAt || Date.now()
    return acc + (endTime - session.startedAt)
  }, 0)
  return formatDuration(total)
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 p-4">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <button class="btn btn-primary p-3 rounded-full">
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
    <div class="grid grid-cols-2 gap-4 mb-6">
      <div class="card-glass p-4 text-center">
        <div class="text-2xl font-bold text-white">{{ getTotalTime('work') }}</div>
        <div class="text-sm text-white/70">Total Lucru</div>
      </div>
      <div class="card-glass p-4 text-center">
        <div class="text-2xl font-bold text-white">{{ getTotalTime('break') }}</div>
        <div class="text-sm text-white/70">Total Pauză</div>
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
                  session.type === 'work' ? 'bg-blue-500' : 'bg-orange-500'
                ]"
              ></div>
              <span class="font-semibold text-white">
                {{ session.type === 'work' ? 'Lucru' : 'Pauză' }}
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
          
          <div class="text-right ml-4">
            <div class="text-lg font-bold text-white">
              {{ getSessionDuration(session) }}
            </div>
            <button 
              @click="deleteSession(session.id)"
              class="text-red-400 hover:text-red-300 text-sm mt-2"
            >
              <Trash2 class="h-4 w-4" />
            </button>
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