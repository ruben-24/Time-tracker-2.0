<script setup lang="ts">
import { ref } from 'vue'
import { useTimerStore } from '../stores/timerStore'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { parseSpreadsheetRows } from '../utils/importSpreadsheet'

const timer = useTimerStore()
const exportText = ref<string>('')

const SPREADSHEET_EXTENSIONS = new Set(['xlsx', 'xls', 'csv'])
const SPREADSHEET_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
])

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
      if (!Capacitor.isPluginAvailable('Share')) {
        // Fallback: save in Files default folder
        await timer.saveToFile(timer.$state)
        alert('Share indisponibil. Backup salvat în Files → On My iPhone → ChronoFlux → TimeTracker')
        return
      }

      await Filesystem.writeFile({
        path: filename,
        data,
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      })
      const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache })
      await Share.share({
        title: 'Exportă date ChronoFlux',
        text: 'Salvează fișierul JSON în Files',
        files: [uri],
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
    try {
      if (Capacitor.isNativePlatform()) {
        await timer.saveToFile(timer.$state)
        alert('Nu s-a putut deschide Share. Backup salvat în Files → On My iPhone → ChronoFlux → TimeTracker')
        return
      }
    } catch {}
    alert('Exportul a eșuat. Încearcă din nou.')
  }
}

async function doImport(evt: Event) {
  const input = evt.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const isJson = extension === 'json' || file.type === 'application/json'
  const isSpreadsheet =
    SPREADSHEET_EXTENSIONS.has(extension) || SPREADSHEET_MIME_TYPES.has(file.type)

  try {
    if (isJson) {
      const text = await file.text()
      await timer.importData(text)
      alert('Import reușit!')
    } else if (isSpreadsheet) {
      await importSpreadsheetFile(file)
    } else {
      alert('Format neacceptat. Folosește JSON exportat din aplicație sau un fișier Excel/CSV cu coloanele Date, Start, End, Type, Note.')
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Importul a eșuat.'
    alert(message)
  } finally {
    input.value = ''
  }
}

async function importSpreadsheetFile(file: File) {
  try {
    const XLSX = (await import('xlsx')) as typeof import('xlsx')
    let workbook: import('xlsx').WorkBook

    if (file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv') {
      const text = await file.text()
      workbook = XLSX.read(text, { type: 'string' })
    } else {
      const data = await file.arrayBuffer()
      workbook = XLSX.read(data, { type: 'array' })
    }

    if (!Array.isArray(workbook.SheetNames) || workbook.SheetNames.length === 0) {
      throw new Error('Fișierul nu conține nicio foaie.')
    }

    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) {
      throw new Error('Fișierul nu conține nicio foaie.')
    }

    const sheet = workbook.Sheets[firstSheetName]
    if (!sheet) {
      throw new Error('Nu am putut citi prima foaie din document.')
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: null })

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('Fișierul pare gol.')
    }

    const { entries, errors, warnings } = parseSpreadsheetRows(rows)

    if (errors.length > 0) {
      const preview = errors.slice(0, 5).join('\n• ')
      throw new Error(`Nu am putut importa toate rândurile:\n• ${preview}${errors.length > 5 ? '\n• …' : ''}`)
    }

    if (entries.length === 0) {
      throw new Error('Nu am găsit rânduri valide de importat.')
    }

    const { inserted, skipped } = timer.addImportedSessions(entries)
    const info: string[] = [`Import reușit: ${inserted} rânduri adăugate.`]

    if (skipped > 0) {
      info.push(`${skipped} rânduri au fost ignorate (duplicat sau date invalide).`)
    }

    if (warnings.length > 0) {
      const preview = warnings.slice(0, 5).join('\n• ')
      info.push(`Atenție:\n• ${preview}${warnings.length > 5 ? '\n• …' : ''}`)
    }

    alert(info.join('\n\n'))
  } catch (error) {
    console.error('Spreadsheet import error:', error)
    const message = error instanceof Error ? error.message : 'Importul fișierului Excel/CSV a eșuat.'
    throw new Error(message)
  }
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
      <label class="mb-2 block text-sm font-medium">Importă din fișier (JSON / Excel / CSV)</label>
      <input
        type="file"
        accept=".json,application/json,.JSON,.xlsx,.XLSX,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xls,.XLS,application/vnd.ms-excel,.csv,.CSV,text/csv,application/csv,text/plain"
        @change="doImport"
      />
      <p class="mt-2 text-xs text-gray-500">
        Pentru Excel/CSV folosește coloanele: <strong>Date</strong>, <strong>Start</strong>, <strong>End</strong>,
        opțional <strong>Type</strong> (work/break/cigarette), <strong>Note</strong>, <strong>Address</strong>.
      </p>
    </div>
  </div>
</template>
