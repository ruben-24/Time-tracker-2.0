<script setup lang="ts">
import { ref } from 'vue'
import { useTimerStore } from '../stores/timerStore'

const timer = useTimerStore()
const exportText = ref<string>('')

function doExport() {
  exportText.value = timer.exportData()
}

function doImport(evt: Event) {
  const input = evt.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const text = String(reader.result || '')
    try {
      timer.importData(text)
      alert('Import reușit!')
    } catch (e) {
      alert('Import invalid')
    }
  }
  reader.readAsText(file)
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <button class="rounded-lg bg-gray-800 px-4 py-2 text-white hover:bg-gray-900" @click="doExport">Exportă date</button>
      <textarea readonly class="mt-2 w-full rounded-lg border p-3 text-sm" rows="6" :value="exportText" placeholder="JSON exportat va apărea aici"></textarea>
    </div>
    <div>
      <label class="mb-2 block text-sm font-medium">Importă din fișier JSON</label>
      <input type="file" accept="application/json" @change="doImport" />
    </div>
  </div>
</template>
