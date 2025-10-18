<script setup lang="ts">
import { ref } from 'vue'
import { useTimerStore, type SessionType } from '../stores/timerStore'
import { pad2 } from '../utils/format'

const open = defineModel<boolean>({ default: false })
const type = ref<SessionType>('work')
const date = ref<string>(new Date().toISOString().slice(0, 10))
// Use dropdowns for robust mobile entry (avoid native time inputs)
const hours = Array.from({ length: 24 }, (_, i) => pad2(i))
const minutes = Array.from({ length: 60 }, (_, i) => pad2(i))
const startHour = ref<string>('09')
const startMinute = ref<string>('00')
const endHour = ref<string>('17')
const endMinute = ref<string>('00')
const note = ref<string>('')

const timer = useTimerStore()

function submit() {
  const sh = Number.parseInt(startHour.value, 10) || 0
  const sm = Number.parseInt(startMinute.value, 10) || 0
  const eh = Number.parseInt(endHour.value, 10) || 0
  const em = Number.parseInt(endMinute.value, 10) || 0
  const startTs = new Date(`${date.value}T${pad2(sh)}:${pad2(sm)}:00`).getTime()
  const endTs = new Date(`${date.value}T${pad2(eh)}:${pad2(em)}:00`).getTime()
  timer.addManualSession(type.value, startTs, endTs, note.value || undefined)
  open.value = false
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
      <h3 class="mb-4 text-lg font-semibold">Adaugă sesiune manuală</h3>
      <div class="space-y-4">
        <div>
          <label class="mb-1 block text-sm font-medium">Tip</label>
          <select v-model="type" class="w-full rounded-lg border px-3 py-2">
            <option value="work">Lucru</option>
            <option value="break">Pauză</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium">Data</label>
          <input type="date" v-model="date" class="w-full rounded-lg border px-3 py-2" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1 block text-sm font-medium">Start</label>
            <div class="flex items-center gap-2">
              <select v-model="startHour" class="w-full rounded-lg border px-3 py-2" aria-label="Ora start">
                <option v-for="h in hours" :key="`sh-${h}`" :value="h">{{ h }}</option>
              </select>
              <span class="text-sm">:</span>
              <select v-model="startMinute" class="w-full rounded-lg border px-3 py-2" aria-label="Minute start">
                <option v-for="m in minutes" :key="`sm-${m}`" :value="m">{{ m }}</option>
              </select>
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium">Sfârșit</label>
            <div class="flex items-center gap-2">
              <select v-model="endHour" class="w-full rounded-lg border px-3 py-2" aria-label="Ora sfârșit">
                <option v-for="h in hours" :key="`eh-${h}`" :value="h">{{ h }}</option>
              </select>
              <span class="text-sm">:</span>
              <select v-model="endMinute" class="w-full rounded-lg border px-3 py-2" aria-label="Minute sfârșit">
                <option v-for="m in minutes" :key="`em-${m}`" :value="m">{{ m }}</option>
              </select>
            </div>
          </div>
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium">Notă (opțional)</label>
          <input type="text" v-model="note" class="w-full rounded-lg border px-3 py-2" />
        </div>
      </div>
      <div class="mt-6 flex justify-end gap-3">
        <button class="rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100" @click="open = false">Anulează</button>
        <button class="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700" @click="submit">Salvează</button>
      </div>
    </div>
  </div>
</template>
