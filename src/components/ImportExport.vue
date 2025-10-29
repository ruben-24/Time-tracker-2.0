<script setup lang="ts">
import { ref } from 'vue'
import { useTimerStore } from '../stores/timerStore'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

const timer = useTimerStore()
const exportText = ref<string>('')

function doExport() {
  exportText.value = timer.exportData()
}

async function exportSaveAs() {
  try {
    const data = timer.exportData()
    const now = new Date()
    const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`
    const filename = `time-tracker-export-${stamp}.json`

    // Native iOS/Android: write to cache and open share sheet (Save to Files lets user choose folder)
    if (Capacitor.isNativePlatform()) {
      await Filesystem.writeFile({
        path: filename,
        data,
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      })
      const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache })
      await Share.share({
        title: 'Exportă date Time Tracker',
        text: 'Salvează fișierul JSON în Files',
        url: uri,
        dialogTitle: 'Exportă date'
      })
      return
    }

    // Web fallback: trigger download
    const blob = new Blob([data], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (e) {
    alert('Exportul a eșuat. Încearcă din nou.')
  }
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
      <div class="flex flex-wrap gap-2">
        <button class="rounded-lg bg-gray-800 px-4 py-2 text-white hover:bg-gray-900" @click="doExport">Exportă (text)</button>
        <button class="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700" @click="exportSaveAs">Salvează ca fișier…</button>
      </div>
      <textarea readonly class="mt-2 w-full rounded-lg border p-3 text-sm" rows="6" :value="exportText" placeholder="JSON exportat va apărea aici"></textarea>
    </div>
    <div>
      <label class="mb-2 block text-sm font-medium">Importă din fișier JSON</label>
      <input type="file" accept="application/json" @change="doImport" />
    </div>
  </div>
</template>
