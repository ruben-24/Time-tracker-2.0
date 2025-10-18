<script setup lang="ts">
import { ref } from 'vue'
import { useTimerStore, type SessionType } from '../stores/timerStore'

const open = defineModel<boolean>({ default: false })
const type = ref<SessionType>('work')
const date = ref<string>(new Date().toISOString().slice(0, 10))
const start = ref<string>('09:00:00')
const end = ref<string>('17:00:00')
const note = ref<string>('')

const timer = useTimerStore()

function submit() {
  const [sh, sm, ss = 0] = start.value.split(':').map(Number)
  const [eh, em, es = 0] = end.value.split(':').map(Number)
  const startTs = new Date(`${date.value}T${String(sh).padStart(2,'0')}:${String(sm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`).getTime()
  const endTs = new Date(`${date.value}T${String(eh).padStart(2,'0')}:${String(em).padStart(2,'0')}:${String(es).padStart(2,'0')}`).getTime()
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
            <input type="time" step="1" v-model="start" class="w-full rounded-lg border px-3 py-2" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium">Sfârșit</label>
            <input type="time" step="1" v-model="end" class="w-full rounded-lg border px-3 py-2" />
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
