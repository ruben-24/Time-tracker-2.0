<script setup lang="ts">
import { ref } from 'vue'
import { useTimerStore, type SessionType } from '../stores/timerStore'
import { pad2 } from '../utils/format'

const open = defineModel<boolean>({ default: false })
const type = ref<SessionType>('work')
const date = ref<string>(new Date().toISOString().slice(0, 10))
// New UX: duration steppers + end time steppers (no native inputs)
const durationHours = ref<number>(8)
const durationMinutes = ref<number>(0)
const endHour = ref<number>(17)
const endMinute = ref<number>(0)
const note = ref<string>('')

const timer = useTimerStore()

function wrap(value: number, min: number, max: number): number {
  const range = max - min + 1
  return ((value - min) % range + range) % range + min
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function incEndHour() { endHour.value = wrap(endHour.value + 1, 0, 23) }
function decEndHour() { endHour.value = wrap(endHour.value - 1, 0, 23) }
function incEndMinute() { endMinute.value = wrap(endMinute.value + 1, 0, 59) }
function decEndMinute() { endMinute.value = wrap(endMinute.value - 1, 0, 59) }

function incDurationHour() { durationHours.value = clamp(durationHours.value + 1, 0, 23) }
function decDurationHour() { durationHours.value = clamp(durationHours.value - 1, 0, 23) }
function incDurationMinute() {
  if (durationMinutes.value >= 59) {
    if (durationHours.value < 23) {
      durationHours.value += 1
      durationMinutes.value = 0
    } else {
      durationMinutes.value = 0
    }
  } else {
    durationMinutes.value += 1
  }
}
function decDurationMinute() {
  if (durationMinutes.value <= 0) {
    if (durationHours.value > 0) {
      durationHours.value -= 1
      durationMinutes.value = 59
    } else {
      durationMinutes.value = 0
    }
  } else {
    durationMinutes.value -= 1
  }
}

function submit() {
  const endTs = new Date(`${date.value}T${pad2(endHour.value)}:${pad2(endMinute.value)}:00`).getTime()
  const durationMs = (durationHours.value * 60 + durationMinutes.value) * 60 * 1000
  const startTs = endTs - durationMs
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
            <label class="mb-1 block text-sm font-medium">Durată</label>
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-2">
                <button type="button" class="rounded-lg border px-4 py-3 text-lg active:scale-95" @click="decDurationHour">−</button>
                <div class="w-14 text-center font-mono text-lg">{{ pad2(durationHours) }}</div>
                <button type="button" class="rounded-lg border px-4 py-3 text-lg active:scale-95" @click="incDurationHour">+</button>
              </div>
              <span class="text-sm">:</span>
              <div class="flex items-center gap-2">
                <button type="button" class="rounded-lg border px-4 py-3 text-lg active:scale-95" @click="decDurationMinute">−</button>
                <div class="w-14 text-center font-mono text-lg">{{ pad2(durationMinutes) }}</div>
                <button type="button" class="rounded-lg border px-4 py-3 text-lg active:scale-95" @click="incDurationMinute">+</button>
              </div>
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium">Se termină la</label>
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-2">
                <button type="button" class="rounded-lg border px-4 py-3 text-lg active:scale-95" @click="decEndHour">−</button>
                <div class="w-14 text-center font-mono text-lg">{{ pad2(endHour) }}</div>
                <button type="button" class="rounded-lg border px-4 py-3 text-lg active:scale-95" @click="incEndHour">+</button>
              </div>
              <span class="text-sm">:</span>
              <div class="flex items-center gap-2">
                <button type="button" class="rounded-lg border px-4 py-3 text-lg active:scale-95" @click="decEndMinute">−</button>
                <div class="w-14 text-center font-mono text-lg">{{ pad2(endMinute) }}</div>
                <button type="button" class="rounded-lg border px-4 py-3 text-lg active:scale-95" @click="incEndMinute">+</button>
              </div>
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
