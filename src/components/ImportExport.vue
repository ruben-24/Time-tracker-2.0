<script setup lang="ts">
import { ref } from 'vue'
import { useTimerStore } from '../stores/timerStore'
import { useLanguageStore } from '../stores/languageStore'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { parseSpreadsheetRows } from '../utils/importSpreadsheet'

const timer = useTimerStore()
const language = useLanguageStore()
const exportText = ref<string>('')
const isNativeApp = Capacitor.isNativePlatform()

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

    if (Capacitor.isNativePlatform()) {
      if (!Capacitor.isPluginAvailable('Share')) {
        await timer.saveToFile(timer.$state)
        alert(`${language.t('shareUnavailableFallback')} Files → On My iPhone → ChronoFlux → TimeTracker`)
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
        title: language.t('exportTitle'),
        text: language.t('exportShareText'),
        files: [uri],
        dialogTitle: language.t('exportDialogTitle')
      })
      return
    }

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
        alert(`${language.t('shareErrorFallback')} Files → On My iPhone → ChronoFlux → TimeTracker`)
        return
      }
    } catch {}
    alert(language.t('exportFailed'))
  }
}

async function doImport(evt: Event) {
  const input = evt.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    await importFile(file)
  } finally {
    input.value = ''
  }
}

async function importFile(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const isJson = extension === 'json' || file.type === 'application/json'
  const isSpreadsheet =
    SPREADSHEET_EXTENSIONS.has(extension) || SPREADSHEET_MIME_TYPES.has(file.type)

  try {
    if (isJson) {
      const text = await file.text()
      await timer.importData(text)
      alert(language.t('importSuccess'))
    } else if (isSpreadsheet) {
      await importSpreadsheetFile(file)
    } else {
      alert(language.t('unsupportedFormatError'))
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : language.t('importFailed')
    alert(message)
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
      throw new Error(language.t('emptySheetsError'))
    }

    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) {
      throw new Error(language.t('emptySheetsError'))
    }

    const sheet = workbook.Sheets[firstSheetName]
    if (!sheet) {
      throw new Error(language.t('readSheetError'))
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: null })

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error(language.t('emptyFileError'))
    }

    const { entries, errors, warnings } = parseSpreadsheetRows(rows)

    if (errors.length > 0) {
      const preview = errors.slice(0, 5).join('\n• ')
      throw new Error(`${language.t('importRowsError')}\n• ${preview}${errors.length > 5 ? '\n• …' : ''}`)
    }

    if (entries.length === 0) {
      throw new Error(language.t('noValidRowsError'))
    }

    const { inserted, skipped } = timer.addImportedSessions(entries)
    const info: string[] = [`${language.t('importSuccessRows')} ${inserted} ${language.t('rowsAdded')}`]

    if (skipped > 0) {
      info.push(`${skipped} ${language.t('rowsSkipped')}`)
    }

    if (warnings.length > 0) {
      const preview = warnings.slice(0, 5).join('\n• ')
      info.push(`${language.t('warningLabel')}\n• ${preview}${warnings.length > 5 ? '\n• …' : ''}`)
    }

    alert(info.join('\n\n'))
  } catch (error) {
    console.error('Spreadsheet import error:', error)
    const message = error instanceof Error ? error.message : language.t('excelImportFailed')
    throw new Error(message)
  }
}

async function openNativeImport() {
  try {
    const file = await pickNativeFile()
    if (!file) return
    await importFile(file)
  } catch (error) {
    if (isPickerCancelled(error)) return
    const message = error instanceof Error ? error.message : language.t('importFailed')
    alert(message)
  }
}

async function pickNativeFile(): Promise<File | null> {
  try {
    if (!Capacitor.isPluginAvailable?.('FilePicker')) {
      throw new Error(language.t('filePickerUnavailable'))
    }
    const { FilePicker } = await import('@capawesome/capacitor-file-picker')
    const result = await FilePicker.pickFiles({
      readData: true,
      limit: 1
    })
    const fileInfo = result.files?.[0]
    if (!fileInfo) return null

    let base64Data = fileInfo.data
    if (!base64Data && fileInfo.path) {
      try {
        const readRes = await Filesystem.readFile({ path: fileInfo.path })
        base64Data = readRes.data as string
      } catch {}
    }
    if (!base64Data) {
      throw new Error(language.t('readFileContentError'))
    }

    const mimeType = fileInfo.mimeType || guessMimeType(fileInfo.name)
    const blob = base64ToBlob(base64Data, mimeType)
    const filename = fileInfo.name || `import-${Date.now()}`

    if (typeof File !== 'undefined') {
      return new File([blob], filename, { type: mimeType })
    }
    const fallback: any = blob
    fallback.name = filename
    fallback.lastModified = Date.now()
    return fallback as File
  } catch (error) {
    if (isPickerCancelled(error)) return null
    throw error
  }
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const cleaned = base64.includes(',')
    ? base64.split(',').pop()!.trim()
    : base64.trim()
  if (typeof atob !== 'function') {
    throw new Error(language.t('base64DecodeError'))
  }
  const binaryString = atob(cleaned)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return new Blob([bytes], { type: mimeType || 'application/octet-stream' })
}

function guessMimeType(filename?: string | null): string {
  if (!filename) return 'application/octet-stream'
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'json':
      return 'application/json'
    case 'csv':
      return 'text/csv'
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    case 'xls':
      return 'application/vnd.ms-excel'
    default:
      return 'application/octet-stream'
  }
}

function isPickerCancelled(error: unknown): boolean {
  if (!error) return false
  const message = error instanceof Error ? error.message : String(error)
  return /cancel/i.test(message)
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <div class="flex flex-wrap gap-2">
        <button class="rounded-lg bg-gray-800 px-4 py-2 text-white hover:bg-gray-900" @click="doExport">{{ language.t('exportTextButton') }}</button>
        <button class="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700" @click="exportSaveAs">{{ language.t('exportFileButton') }}</button>
      </div>
      <textarea readonly class="mt-2 w-full rounded-lg border p-3 text-sm" rows="6" :value="exportText" :placeholder="language.t('exportPlaceholder')"></textarea>
    </div>
    <div>
      <label class="mb-2 block text-sm font-medium">{{ language.t('importLabel') }}</label>
      <template v-if="isNativeApp">
        <button
          class="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          type="button"
          @click="openNativeImport"
        >
          {{ language.t('chooseFilesButton') }}
        </button>
      </template>
      <template v-else>
        <input
          type="file"
          @change="doImport"
        />
      </template>
      <p class="mt-2 text-xs text-gray-500">
        {{ language.t('importHelpText') }}
      </p>
    </div>
  </div>
</template>