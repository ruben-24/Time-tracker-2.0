<script setup lang="ts">
import { computed } from 'vue'
import { useTimerStore, type Session } from '../stores/timerStore'
import { formatDuration, formatDateTime } from '../utils/format'

const timer = useTimerStore()

const items = computed<Session[]>(() => timer.sessions)
</script>

<template>
  <div class="mt-6">
    <h2 class="mb-2 text-lg font-semibold">Istoric sesiuni</h2>
    <div v-if="items.length === 0" class="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
      Nu există sesiuni încă.
    </div>
    <ul v-else class="space-y-3">
      <li v-for="s in items" :key="s.id" class="rounded-xl border bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span
              :class="[
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                s.type === 'work' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
              ]"
            >
              {{ s.type === 'work' ? 'Lucru' : 'Pauză' }}
            </span>
            <span class="text-sm text-gray-500">{{ s.manual ? '(manual)' : '' }}</span>
          </div>
          <div class="text-right text-sm text-gray-600">
            <div class="font-medium">{{ formatDuration((s.endedAt ?? Date.now()) - s.startedAt) }}</div>
            <div>{{ formatDateTime(s.startedAt) }} → {{ s.endedAt ? formatDateTime(s.endedAt) : 'în curs' }}</div>
            <div v-if="s.address" class="truncate text-xs text-gray-500">{{ s.address }}</div>
          </div>
        </div>
        <div v-if="s.note" class="mt-2 text-sm text-gray-700">{{ s.note }}</div>
      </li>
    </ul>
  </div>
</template>
