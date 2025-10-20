<script setup lang="ts">
import { onMounted, ref, computed, onBeforeUnmount, watch } from 'vue'
import { useTimerStore } from './stores/timerStore'
import { useThemeStore } from './stores/themeStore'
import TimerControls from './components/TimerControls.vue'
import BurgerMenu from './components/BurgerMenu.vue'
import HistoryPage from './components/HistoryPage.vue'
import AddressesPage from './components/AddressesPage.vue'
import FinancialInfo from './components/FinancialInfo.vue'
import AddressSelector from './components/AddressSelector.vue'
import SettingsPage from './components/SettingsPage.vue'
import { formatDuration } from './utils/format'
import { setupBackgroundHandlers } from './utils/background'
import { checkForOtaUpdate, applyOtaUpdate, rollbackOtaUpdate, hasOtaSupport } from './utils/ota'
import { ArrowLeft, Clock, Pause, Settings, X, Download, Upload, FolderOpen, RefreshCw, Save, RotateCcw } from 'lucide-vue-next'

const timer = useTimerStore()
const theme = useThemeStore()
const now = ref(Date.now())
const currentPage = ref('main')
let ticker: number | undefined

// Count of all breaks (standalone + in-session)
const totalBreakCount = computed(() => {
  const standalone = timer.sessions.filter(s => s.type === 'break' || s.type === 'cigarette').length
  const inSession = timer.sessions
    .filter(s => s.type === 'work' && Array.isArray((s as any).breaks))
    .reduce((acc, s: any) => acc + ((s.breaks?.length) || 0), 0)
  return standalone + inSession
})

// App version
const appVersion = ref('2.3.1')
const latestVersion = ref<string | null>(null)
const updateManifestUrl = 'https://time-tracker-e36f1.web.app/updates/stable/manifest.json'
const isUpdateAvailable = ref(false)
const canUseOta = ref(false)

// Manual entry variables
const manualWorkStart = ref('')
const manualWorkEnd = ref('')
const manualWorkNote = ref('')
const manualBreakStart = ref('')
const manualBreakEnd = ref('')
const manualBreakNote = ref('')

// Multiple breaks management
const manualBreaks = ref<Array<{
  id: string
  start: string
  end: string
  note: string
}>>([])

// Ongoing session
const isOngoingSession = ref(false)

// Import/Export variables
const importData = ref('')
const backupFiles = ref<Array<{name: string, modificationTime: number}>>([])
const backupFolder = ref('TimeTracker')

onMounted(async () => {
  try {
    await Promise.all([
      timer.load(),
      theme.load(),
      setupBackgroundHandlers()
    ])
    
    // Detect OTA support (native only)
    canUseOta.value = hasOtaSupport()

    // Load backup settings
    const savedSettings = localStorage.getItem('backupSettings')
    if (savedSettings) {
      const settings = JSON.parse(savedSettings)
      backupFolder.value = settings.customFolder || 'TimeTracker'
    }
    
    // Check OTA updates (non-blocking)
    try {
      const manifest = await checkForOtaUpdate(updateManifestUrl, appVersion.value)
      if (manifest) {
        latestVersion.value = manifest.version
        isUpdateAvailable.value = true
      }
    } catch {}

    ticker = window.setInterval(() => {
      now.value = Date.now()
      forceUpdateTotals()
    }, 1000)
  } catch (error) {
    console.error('Failed to initialize app:', error instanceof Error ? error.message : 'Unknown error')
    // Continue with app initialization even if some parts fail
    ticker = window.setInterval(() => {
      now.value = Date.now()
      forceUpdateTotals()
    }, 1000)
  }
})

// Watch for theme changes and apply CSS variables
watch(() => theme.cssVariables, (newVars) => {
  const root = document.documentElement
  Object.entries(newVars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
}, { immediate: true })

// Watch for background color changes
watch(() => theme.settings.backgroundColors, (newColors) => {
  const root = document.documentElement
  root.style.setProperty('--bg-primary', newColors.primary)
  root.style.setProperty('--bg-secondary', newColors.secondary)
  root.style.setProperty('--bg-accent', newColors.accent)
}, { deep: true, immediate: true })

// Watch for button color changes
watch(() => theme.settings.buttonColors, (newColors) => {
  const root = document.documentElement
  root.style.setProperty('--btn-primary', newColors.primary)
  root.style.setProperty('--btn-secondary', newColors.secondary)
  root.style.setProperty('--btn-accent', newColors.accent)
}, { deep: true, immediate: true })

onBeforeUnmount(() => {
  if (ticker) window.clearInterval(ticker)
})

const elapsed = computed(() => {
  if (!timer.activeStartedAt) return 0
  
  const totalTime = now.value - timer.activeStartedAt
  let pausedTime = timer.totalPausedMs
  
  // If we're currently paused, add current pause time
  if (timer.isPaused && timer.pausedAt) {
    pausedTime += now.value - timer.pausedAt
  }
  
  return Math.max(0, totalTime - pausedTime)
})

const stateLabel = computed(() => {
  if (!timer.activeType) return 'Inactiv'
  if (timer.isOnBreak) return 'Pauză'
  if (timer.isPaused) return 'Pauză'
  return timer.activeType === 'work' ? 'Lucru' : 'Pauză'
})

const breakElapsed = computed(() => {
  if (timer.pausedAt !== null && timer.breakStartedAt !== null) {
    return timer.totalBreakTimeMs + (now.value - timer.breakStartedAt)
  }
  return timer.totalBreakTimeMs
})

const isOnBreak = computed(() => {
  return timer.pausedAt !== null && timer.breakStartedAt !== null
})

const navigateTo = (page: string) => {
  currentPage.value = page
}

const applyUpdateNow = async () => {
  if (!canUseOta.value) {
    alert('Actualizările OTA sunt disponibile doar în aplicația instalată (iOS/Android).')
    return
  }
  const manifest = await checkForOtaUpdate(updateManifestUrl, appVersion.value)
  if (!manifest) {
    alert('Nu există update disponibil.')
    isUpdateAvailable.value = false
    return
  }
  const ok = await applyOtaUpdate(manifest)
  if (!ok) return
}

const rollbackUpdate = async () => {
  if (!canUseOta.value) {
    alert('Rollback OTA este disponibil doar în aplicația instalată (iOS/Android).')
    return
  }
  await rollbackOtaUpdate()
}

// Changelog data
const changelog = ref([
  {
    version: '2.2.0',
    date: '2024-12-19',
    changes: [
      'Mutare calcul financiar din pagina principală în burger menu',
      'Adăugare 12 culori noi pentru butoane (Ocean Blue, Cherry Pink, Lime Green, etc.)',
      'Îmbunătățire organizare interfață - pagina principală mai curată',
      'Rapoarte financiare accesibile din meniul principal',
      'Actualizare versiune la 2.2.0'
    ]
  },
  {
    version: '2.1.0',
    date: '2024-12-19',
    changes: [
      'Auto-save pentru setări - modificările se salvează automat',
      'Incrementare automată a versiunii la fiecare push',
      'Changelog în aplicație - istoricul modificărilor',
      'Logica pauzelor în sesiuni - salvare corectă în sesiunea activă',
      'Timer de pauză continuu - nu se mai resetează',
      'Salvare pauze în istoric ca sesiuni separate'
    ]
  },
  {
    version: '2.0.0',
    date: '2024-12-19',
    changes: [
      'Design profesional și sexy cu glassmorphism',
      '20+ preset-uri de background și butoane',
      'Culori personalizabile cu picker custom',
      'Efecte vizuale - particule, glass effect, animații',
      'Butoane floating accesibile tot timpul',
      'Setări extinse - esențiale, notificări, performanță',
      'Import/Export cu backup în fișiere și iCloud',
      'Gestionare adrese cu tarife și selectare',
      'Adăugare manuală - sesiuni integrate cu pauze',
      'Timer logic perfect - work/pause/resume/end',
      'Istoric și statistici complete'
    ]
  }
])

// Manual entry functions

const addManualBreakSession = () => {
  if (!manualBreakStart.value || !manualBreakEnd.value) {
    alert('Te rog completează începutul și sfârșitul!')
    return
  }
  
  const startTime = new Date(manualBreakStart.value).getTime()
  const endTime = new Date(manualBreakEnd.value).getTime()
  const breakDuration = endTime - startTime
  
  if (endTime <= startTime) {
    alert('Sfârșitul trebuie să fie după începutul!')
    return
  }
  
  // Check if there's an active work session
  if (timer.activeType === 'work' && timer.activeStartedAt) {
    alert('Există o sesiune de lucru activă! Pauzele se adaugă automat în sesiunea activă. Folosește butonul "Pauză" din timer.')
    return
  }
  
  // Determine if it's a cigarette break (< 5 minutes)
  const breakType = breakDuration < 5 * 60 * 1000 ? 'cigarette' : 'break'

  // Save as standalone break session so it appears in history
  timer.addManualSession(breakType as 'break' | 'cigarette', startTime, endTime, manualBreakNote.value)
  
  // Reset form
  manualBreakStart.value = ''
  manualBreakEnd.value = ''
  manualBreakNote.value = ''
  
  const breakTypeLabel = breakType === 'cigarette' ? 'pauză țigară' : 'pauză'
  alert(`Sesiunea de ${breakTypeLabel} a fost adăugată cu succes!`)
}

// Multiple breaks management
const addBreakToSession = () => {
  if (!manualBreakStart.value || !manualBreakEnd.value) {
    alert('Te rog completează toate câmpurile pentru pauză!')
    return
  }

  const startTime = new Date(manualBreakStart.value).getTime()
  const endTime = new Date(manualBreakEnd.value).getTime()

  if (endTime <= startTime) {
    alert('Timpul de sfârșit trebuie să fie după timpul de început!')
    return
  }

  // Add break to the list (only for manual session creation)
  manualBreaks.value.push({
    id: crypto.randomUUID(),
    start: manualBreakStart.value,
    end: manualBreakEnd.value,
    note: manualBreakNote.value
  })

  // Clear break form
  manualBreakStart.value = ''
  manualBreakEnd.value = ''
  manualBreakNote.value = ''
  
  alert('Pauza a fost adăugată la sesiunea manuală!')
}

const removeBreak = (breakId: string) => {
  manualBreaks.value = manualBreaks.value.filter(b => b.id !== breakId)
}

const addIntegratedWorkSession = () => {
  if (!manualWorkStart.value) {
    alert('Te rog completează timpul de început!')
    return
  }

  const startTime = new Date(manualWorkStart.value).getTime()
  const endTime = manualWorkEnd.value ? new Date(manualWorkEnd.value).getTime() : null
  const now = Date.now()

  if (startTime > now) {
    alert('Timpul de început nu poate fi în viitor!')
    return
  }

  if (endTime && endTime <= startTime) {
    alert('Timpul de sfârșit trebuie să fie după timpul de început!')
    return
  }

  // Calculate total break time for validation and summary
  const totalBreakTime = manualBreaks.value.reduce((total, breakItem) => {
    return total + (new Date(breakItem.end).getTime() - new Date(breakItem.start).getTime())
  }, 0)

  const totalTime = (endTime ?? now) - startTime
  const workTime = totalTime - totalBreakTime
  if (workTime <= 0) {
    alert('Timpul de lucru nu poate fi negativ! Verifică pauzele.')
    return
  }

  if (manualBreaks.value.length > 0) {
    // Embed breaks inside the work session so all views subtract them
    const breaks = manualBreaks.value.map(b => ({
      start: new Date(b.start).getTime(),
      end: new Date(b.end).getTime()
    }))
    timer.addManualWorkWithBreaks(startTime, breaks, endTime, manualWorkNote.value)
  } else {
    // No breaks: just add a normal manual work session
    const workEndTime = endTime ?? (startTime + workTime)
    timer.addManualSession('work', startTime, workEndTime, manualWorkNote.value)
  }

  // Clear all forms
  manualWorkStart.value = ''
  manualWorkEnd.value = ''
  manualWorkNote.value = ''
  manualBreaks.value = []

  alert(`Sesiunea integrată a fost adăugată! Timp lucru: ${formatDuration(workTime)}, Pauze: ${formatDuration(totalBreakTime)}`)
}

const addOngoingWorkSession = () => {
  if (!manualWorkStart.value) {
    alert('Te rog completează timpul de început!')
    return
  }

  const startTime = new Date(manualWorkStart.value).getTime()
  const now = Date.now()

  if (startTime > now) {
    alert('Timpul de început nu poate fi în viitor!')
    return
  }

  // Add ongoing work session (no end time)
  timer.addManualSession('work', startTime, null, manualWorkNote.value)
  
  // Don't add breaks as separate sessions - they're part of the work session
  // The breaks are tracked within the work session

  // Clear all forms
  manualWorkStart.value = ''
  manualWorkEnd.value = ''
  manualWorkNote.value = ''
  manualBreaks.value = []
  isOngoingSession.value = false
  
  alert('Sesiunea în curs a fost adăugată!')
}

// Import/Export functions
const exportAllData = async () => {
  try {
    const data = timer.exportData()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    // Create download link
    const a = document.createElement('a')
    a.href = url
    a.download = `time-tracker-backup-${new Date().toISOString().split('T')[0]}.json`
    a.style.display = 'none'
    
    // Add to DOM, click, and remove
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    
    // Clean up
    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 100)
    
    alert('Backup-ul a fost descărcat cu succes!')
  } catch (error) {
    console.error('Export error:', error)
    alert('Eroare la exportarea datelor. Încearcă din nou.')
  }
}

// Export directly into iOS Files (Documents/TimeTracker)
const exportToFilesIOS = async () => {
  try {
    await timer.saveToFile(timer.$state)
    alert('Backup salvat în Files → On My iPhone → Time Tracker 2.0 → TimeTracker')
  } catch (error) {
    console.error('Export to Files error:', error)
    alert('Eroare la salvarea în Files. Încearcă din nou.')
  }
}

const importAllData = async () => {
  try {
    if (!importData.value.trim()) {
      alert('Te rog introdu datele JSON pentru import!')
      return
    }
    
    await timer.importData(importData.value)
    importData.value = ''
    alert('Datele au fost importate cu succes! Aplicația va fi reîncărcată.')
    
    // Reload the page to refresh all data
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  } catch (error) {
    console.error('Import error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Eroare necunoscută'
    alert(`Eroare la importarea datelor: ${errorMessage}`)
  }
}

// Import from Files (iOS/Android) using a file picker
const fileInputRef = ref<HTMLInputElement | null>(null)
const triggerFilePicker = () => {
  fileInputRef.value?.click()
}
const importFromFile = async (e: Event) => {
  try {
    const input = e.target as HTMLInputElement
    const file = input.files && input.files[0]
    if (!file) return
    const text = await file.text()
    await timer.importData(text)
    alert('Backup importat cu succes din fișier! Aplicația va fi reîncărcată.')
    setTimeout(() => {
      window.location.reload()
    }, 800)
  } catch (error) {
    console.error('Import file error:', error)
    alert('Eroare la importul din fișier. Încearcă din nou.')
  } finally {
    if (fileInputRef.value) fileInputRef.value.value = ''
  }
}

// Backup functions
const loadBackupFiles = async () => {
  try {
    const files = await timer.getBackupFiles()
    backupFiles.value = files.map(file => ({
      name: file.name,
      modificationTime: (file as any).modificationTime || Date.now()
    }))
    alert(`Găsite ${files.length} backup-uri`)
  } catch (error) {
    console.error('Failed to load backup files:', error)
    alert('Eroare la încărcarea backup-urilor')
  }
}

const createManualBackup = async () => {
  try {
    await timer.saveToFile(timer.$state)
    alert('Backup manual creat cu succes!')
    await loadBackupFiles()
  } catch (error) {
    console.error('Failed to create backup:', error)
    alert('Eroare la crearea backup-ului')
  }
}

const restoreBackup = async (filename: string) => {
  if (!confirm(`Sigur vrei să restaurezi backup-ul ${filename}? Toate datele curente vor fi înlocuite!`)) {
    return
  }
  
  try {
    await timer.restoreFromBackup(filename)
    alert('Backup restaurat cu succes! Aplicația va fi reîncărcată.')
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  } catch (error) {
    console.error('Failed to restore backup:', error)
    const errorMessage = error instanceof Error ? error.message : 'Eroare necunoscută'
    alert(`Eroare la restaurarea backup-ului: ${errorMessage}`)
  }
}

const downloadBackup = async (filename: string) => {
  try {
    const data = await timer.exportData()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    alert('Backup descărcat cu succes!')
  } catch (error) {
    console.error('Failed to download backup:', error)
    alert('Eroare la descărcarea backup-ului')
  }
}

const selectBackupFolder = () => {
  const newFolder = prompt('Introdu numele folderului pentru backup:', backupFolder.value)
  if (newFolder && newFolder.trim()) {
    backupFolder.value = newFolder.trim()
    // Update timer store with new folder
    localStorage.setItem('backupSettings', JSON.stringify({
      customFolder: backupFolder.value,
      useiCloud: false,
      autoBackup: true,
      backupFrequency: 'daily'
    }))
    alert(`Folder backup setat la: ${backupFolder.value}`)
  }
}

const setCurrentTime = (type: 'work' | 'break') => {
  const now = new Date()
  const timeString = now.toISOString().slice(0, 16) // Format for datetime-local input
  
  if (type === 'work') {
    if (!manualWorkStart.value) {
      manualWorkStart.value = timeString
    } else if (!manualWorkEnd.value) {
      manualWorkEnd.value = timeString
    } else {
      // Reset and set start time
      manualWorkStart.value = timeString
      manualWorkEnd.value = ''
    }
  } else {
    if (!manualBreakStart.value) {
      manualBreakStart.value = timeString
    } else if (!manualBreakEnd.value) {
      manualBreakEnd.value = timeString
    } else {
      // Reset and set start time
      manualBreakStart.value = timeString
      manualBreakEnd.value = ''
    }
  }
}

// Force update totals every second
const forceUpdateTotals = () => {
  // This will trigger reactivity for computed properties
  timer.$patch({})
}
</script>

<template>
  <div class="relative min-h-dvh" :class="{ 'floating-particles': theme.settings.particles }">
    <div class="hero-gradient" />
    
    <!-- Main Page -->
    <div v-if="currentPage === 'main'" class="mx-auto max-w-[430px] px-4 pb-36 safe-top">
      <!-- Header with Burger Menu -->
      <header class="mb-8 flex items-center justify-between">
        <div class="flex-1">
          <h1 class="text-3xl font-bold tracking-tight mb-1" :class="theme.settings.textStyle === 'rainbow' ? 'text-gradient-rainbow' : theme.settings.textStyle === 'glow' ? 'text-gradient-glow' : 'text-gradient'">Time Tracker Pro</h1>
          <p class="text-sm text-white/80 font-medium">Simplu. Rapid. Precis. v2.0.0</p>
          <div class="flex items-center gap-2 mt-2">
            <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span class="text-xs text-white/60">Sistem activ</span>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-right">
            <div class="text-xs text-white/60">Status</div>
            <div class="text-sm font-semibold text-white">{{ stateLabel }}</div>
          </div>
          <BurgerMenu @navigate="navigateTo" />
        </div>
      </header>

      <!-- Update Banner -->
      <div v-if="isUpdateAvailable" class="mb-4 rounded-xl border border-blue-400/40 bg-blue-500/10 p-3 text-white flex items-center justify-between">
        <div class="text-sm">Update disponibil: {{ latestVersion }} (curent {{ appVersion }})</div>
        <div class="flex gap-2">
          <button class="btn btn-primary px-3 py-1 text-xs" :disabled="!canUseOta" @click="applyUpdateNow" title="Disponibil doar în aplicația instalată">
            Aplică
          </button>
          <button class="btn btn-glass px-3 py-1 text-xs" :disabled="!canUseOta" @click="rollbackUpdate" title="Disponibil doar în aplicația instalată">
            Rollback
          </button>
        </div>
      </div>

      <!-- Main Timer Section -->
      <section class="card-glass card-hover p-8 mb-8" :class="{ 'glass-enhanced': theme.settings.glassEffect }">
        <div class="mb-8">
          <div class="text-center mb-6">
            <div class="text-xs text-white/70 font-medium uppercase tracking-wide mb-2">
              {{ isOnBreak ? 'Cronometru Pauză' : 'Cronometru Principal' }}
            </div>
            <div class="text-7xl font-bold tabular-nums tracking-tight timer-display text-white" 
                 :class="isOnBreak ? 'neon-glow-green' : 'neon-glow-blue'">
              {{ formatDuration(isOnBreak ? breakElapsed : elapsed) }}
            </div>
            <div class="text-sm text-white/60 mt-2">
              {{ isOnBreak ? 'Timpul curent de pauză' : 'Timpul curent de lucru' }}
            </div>
          </div>
          
          <div class="flex items-center justify-center gap-4">
            <div class="text-center">
              <div class="text-xs text-white/70 font-medium uppercase tracking-wide">Stare</div>
              <div class="text-lg font-bold text-white">{{ stateLabel }}</div>
            </div>
            <div class="w-px h-8 bg-white/20"></div>
            <div class="text-center">
              <div class="text-xs text-white/70 font-medium uppercase tracking-wide">Sesiune</div>
              <div class="text-lg font-bold text-white">{{ timer.sessions.length + 1 }}</div>
            </div>
          </div>
        </div>
        
        <!-- Address Selector -->
        <div class="mb-6">
          <AddressSelector />
        </div>

        <!-- Stats Grid -->
        <div class="grid gap-4 sm:grid-cols-3">
          <div class="rounded-2xl glass-enhanced p-6 card-hover" :class="{ 'glass-enhanced': theme.settings.glassEffect }">
            <div class="text-xs text-white/70 font-medium uppercase tracking-wide">Total lucru</div>
            <div class="text-2xl font-bold text-white">{{ formatDuration(timer.totalWorkMs) }}</div>
            <div class="text-xs text-white/50 mt-1">Sesiuni: {{ timer.sessions.filter(s => s.type === 'work').length }}</div>
          </div>
          <div class="rounded-2xl glass-enhanced p-6 card-hover" :class="{ 'glass-enhanced': theme.settings.glassEffect }">
            <div class="text-xs text-white/70 font-medium uppercase tracking-wide">Total pauză</div>
            <div class="text-2xl font-bold text-white">{{ formatDuration(timer.totalBreakMs) }}</div>
            <div class="text-xs text-white/50 mt-1">Pauze: {{ totalBreakCount }}</div>
          </div>
          <div class="rounded-2xl glass-enhanced p-6 card-hover" :class="{ 'glass-enhanced': theme.settings.glassEffect }">
            <div class="text-xs text-white/70 font-medium uppercase tracking-wide">Pauze țigară</div>
            <div class="text-2xl font-bold text-orange-400">{{ formatDuration(timer.totalCigaretteMs) }}</div>
            <div class="text-xs text-white/50 mt-1">Sesiuni: {{ timer.sessions.filter(s => s.type === 'cigarette').length }}</div>
          </div>
        </div>

        <!-- Advanced Stats -->
        <div class="mt-6 grid gap-4 sm:grid-cols-2">
          <div class="rounded-2xl glass-enhanced p-6 card-hover" :class="{ 'glass-enhanced': theme.settings.glassEffect }">
            <div class="text-xs text-white/70 font-medium uppercase tracking-wide">Eficiență</div>
            <div class="text-3xl font-bold text-green-400">
              {{ Math.round((timer.totalWorkMs / (timer.totalWorkMs + timer.totalBreakMs)) * 100) || 0 }}%
            </div>
            <div class="text-xs text-white/50 mt-1">Raport lucru/pauză</div>
          </div>
          <div class="rounded-2xl glass-enhanced p-6 card-hover" :class="{ 'glass-enhanced': theme.settings.glassEffect }">
            <div class="text-xs text-white/70 font-medium uppercase tracking-wide">Sesiune medie</div>
            <div class="text-3xl font-bold text-blue-400">
              {{ formatDuration(timer.sessions.length > 0 ? timer.sessions.reduce((acc, s) => acc + (s.endedAt ? s.endedAt - s.startedAt : 0), 0) / timer.sessions.length : 0) }}
            </div>
            <div class="text-xs text-white/50 mt-1">Durată medie</div>
          </div>
        </div>

      </section>

      <!-- Floating Timer Controls - Always visible on main page -->
      <div class="fixed inset-x-0 bottom-0 z-50 safe-bottom">
        <div class="mx-auto max-w-[430px] px-4 pb-4">
          <div class="glass-enhanced rounded-2xl p-4 shadow-2xl border border-white/20" :class="{ 'glass-enhanced': theme.settings.glassEffect }">
            <TimerControls />
          </div>
        </div>
      </div>
    </div>

    <!-- History Page -->
    <HistoryPage v-else-if="currentPage === 'history'" @navigate="navigateTo" />

    <!-- Addresses Page -->
    <AddressesPage v-else-if="currentPage === 'addresses'" @navigate="navigateTo" />

    <!-- Financial Reports Page -->
    <div v-else-if="currentPage === 'financial'" class="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 p-4 safe-top">
      <div class="flex items-center justify-between mb-6 pt-4">
        <button @click="navigateTo('main')" class="btn btn-primary p-3 rounded-full">
          <ArrowLeft class="h-5 w-5" />
        </button>
        <h1 class="text-2xl font-bold text-white">Rapoarte Financiare</h1>
        <div></div>
      </div>
      <FinancialInfo />
    </div>


    <!-- Manual Entry Page -->
    <div v-else-if="currentPage === 'manual'" class="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 p-4 safe-top">
      <div class="flex items-center justify-between mb-6 pt-4">
        <button @click="navigateTo('main')" class="btn btn-primary p-3 rounded-full">
          <ArrowLeft class="h-5 w-5" />
        </button>
        <h1 class="text-2xl font-bold text-white">Adăugare Manuală</h1>
        <div></div>
      </div>
      
      <div class="space-y-6">
        <!-- Integrated Work Session with Breaks -->
        <div class="card-glass p-6">
          <h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock class="h-5 w-5 text-blue-400" />
            Sesiune de Lucru cu Pauze
          </h2>
          
          <!-- Work Session Times -->
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium text-white/80 mb-2">Început Lucru</label>
              <input
                v-model="manualWorkStart"
                type="datetime-local"
                class="w-full rounded-lg border border-white/20 bg-white/20 px-4 py-3 text-white focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-white/80 mb-2">Sfârșit Lucru (opțional)</label>
              <input
                v-model="manualWorkEnd"
                type="datetime-local"
                class="w-full rounded-lg border border-white/20 bg-white/20 px-4 py-3 text-white focus:border-blue-400 focus:outline-none"
              />
            </div>
          </div>
          
          <!-- Work Session Note -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-white/80 mb-2">Observații Sesiune</label>
            <textarea
              v-model="manualWorkNote"
              placeholder="Adaugă observații despre sesiunea de lucru..."
              class="w-full rounded-lg border border-white/20 bg-white/20 px-4 py-3 text-white placeholder-white/50 focus:border-blue-400 focus:outline-none resize-none"
              rows="2"
            ></textarea>
          </div>
          
          <!-- Break Form -->
          <div class="border-t border-white/20 pt-4 mb-4">
            <h3 class="text-md font-medium text-white/80 mb-3 flex items-center gap-2">
              <Pause class="h-4 w-4 text-orange-400" />
              Adaugă Pauză
            </h3>
            
            <div class="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label class="block text-sm font-medium text-white/80 mb-2">Început Pauză</label>
                <input
                  v-model="manualBreakStart"
                  type="datetime-local"
                  class="w-full rounded-lg border border-white/20 bg-white/20 px-4 py-3 text-white focus:border-orange-400 focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-white/80 mb-2">Sfârșit Pauză</label>
                <input
                  v-model="manualBreakEnd"
                  type="datetime-local"
                  class="w-full rounded-lg border border-white/20 bg-white/20 px-4 py-3 text-white focus:border-orange-400 focus:outline-none"
                />
              </div>
            </div>
            
            <div class="mb-3">
              <label class="block text-sm font-medium text-white/80 mb-2">Observații Pauză</label>
              <textarea
                v-model="manualBreakNote"
                placeholder="Adaugă observații despre pauză..."
                class="w-full rounded-lg border border-white/20 bg-white/20 px-4 py-3 text-white placeholder-white/50 focus:border-orange-400 focus:outline-none resize-none"
                rows="2"
              ></textarea>
            </div>
            
            <button
              @click="addBreakToSession"
              class="btn btn-amber w-full"
              :disabled="!manualBreakStart || !manualBreakEnd"
            >
              Adaugă Pauză la Sesiune
            </button>
          </div>
          
          <!-- Breaks List -->
          <div v-if="manualBreaks.length > 0" class="space-y-2 mb-4">
            <h3 class="text-md font-medium text-white/80 mb-2">Pauze adăugate:</h3>
            <div 
              v-for="breakItem in manualBreaks" 
              :key="breakItem.id"
              class="flex items-center justify-between bg-white/10 rounded-lg p-3"
            >
              <div class="flex-1">
                <div class="text-sm text-white/80">
                  {{ new Date(breakItem.start).toLocaleString('ro-RO') }} - 
                  {{ new Date(breakItem.end).toLocaleString('ro-RO') }}
                </div>
                <div class="text-xs text-white/60 mt-1">
                  Durată: {{ formatDuration(new Date(breakItem.end).getTime() - new Date(breakItem.start).getTime()) }}
                  <span v-if="(new Date(breakItem.end).getTime() - new Date(breakItem.start).getTime()) < 5 * 60 * 1000" class="text-yellow-400 ml-2">
                    (Pauză țigară)
                  </span>
                </div>
                <div v-if="breakItem.note" class="text-xs text-white/60 mt-1">
                  {{ breakItem.note }}
                </div>
              </div>
              <button
                @click="removeBreak(breakItem.id)"
                class="btn btn-rose p-2 rounded-full"
              >
                <X class="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <!-- Session Summary -->
          <div v-if="manualWorkStart && manualBreaks.length > 0" class="bg-white/10 rounded-lg p-4 mb-4">
            <h3 class="text-md font-medium text-white/80 mb-2">Rezumat Sesiune:</h3>
            <div class="text-sm text-white/70 space-y-1">
              <div>Început: {{ new Date(manualWorkStart).toLocaleString('ro-RO') }}</div>
              <div v-if="manualWorkEnd">Sfârșit: {{ new Date(manualWorkEnd).toLocaleString('ro-RO') }}</div>
              <div>Pauze: {{ manualBreaks.length }}</div>
              <div class="text-orange-400">
                Timp total pauze: {{ formatDuration(manualBreaks.reduce((total, b) => total + (new Date(b.end).getTime() - new Date(b.start).getTime()), 0)) }}
              </div>
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div class="flex gap-3">
            <button
              @click="addIntegratedWorkSession"
              class="btn btn-primary flex-1"
              :disabled="!manualWorkStart"
            >
              Adaugă Sesiune Completă
            </button>
            <button
              @click="addOngoingWorkSession"
              class="btn btn-glass flex-1"
              :disabled="!manualWorkStart"
            >
              Adaugă Sesiune în Curs
            </button>
          </div>
        </div>
        
        <!-- Individual Break Session (for standalone breaks) -->
        <div class="card-glass p-6">
          <h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Pause class="h-5 w-5 text-rose-400" />
            Pauză Individuală
          </h2>
          <p class="text-sm text-white/60 mb-4">
            Pentru pauze care nu fac parte dintr-o sesiune de lucru
          </p>
          
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium text-white/80 mb-2">Început</label>
              <input
                v-model="manualBreakStart"
                type="datetime-local"
                class="w-full rounded-lg border border-white/20 bg-white/20 px-4 py-3 text-white focus:border-rose-400 focus:outline-none"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-white/80 mb-2">Sfârșit</label>
              <input
                v-model="manualBreakEnd"
                type="datetime-local"
                class="w-full rounded-lg border border-white/20 bg-white/20 px-4 py-3 text-white focus:border-rose-400 focus:outline-none"
              />
            </div>
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-white/80 mb-2">Observații</label>
            <textarea
              v-model="manualBreakNote"
              placeholder="Adaugă observații despre pauză..."
              class="w-full rounded-lg border border-white/20 bg-white/20 px-4 py-3 text-white placeholder-white/50 focus:border-rose-400 focus:outline-none resize-none"
              rows="2"
            ></textarea>
          </div>
          
          <button
            @click="addManualBreakSession"
            class="btn btn-rose w-full"
            :disabled="!manualBreakStart || !manualBreakEnd"
          >
            Adaugă Pauză Individuală
          </button>
        </div>

        <!-- Quick Actions -->
        <div class="card-glass p-6">
          <h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Settings class="h-5 w-5 text-purple-400" />
            Acțiuni Rapide
          </h2>
          
          <div class="grid grid-cols-2 gap-4">
            <button
              @click="setCurrentTime('work')"
              class="btn btn-glass flex-col p-4"
            >
              <Clock class="h-6 w-6 mb-2" />
              <span class="text-sm">Folosește ora curentă pentru lucru</span>
            </button>
            <button
              @click="setCurrentTime('break')"
              class="btn btn-glass flex-col p-4"
            >
              <Pause class="h-6 w-6 mb-2" />
              <span class="text-sm">Folosește ora curentă pentru pauză</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Import/Export Page -->
    <div v-else-if="currentPage === 'import-export'" class="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 p-4 safe-top">
      <div class="flex items-center justify-between mb-6 pt-4">
        <button @click="navigateTo('main')" class="btn btn-primary p-3 rounded-full">
          <ArrowLeft class="h-5 w-5" />
        </button>
        <h1 class="text-2xl font-bold text-white">Import/Export</h1>
        <div></div>
      </div>
      
      <div class="space-y-6">
        <!-- Export Section -->
        <div class="card-glass p-6">
          <h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Download class="h-5 w-5 text-green-400" />
            Export Date
          </h2>
          <p class="text-white/70 text-sm mb-6">
            Toate datele tale (sesiuni, adrese, setări) vor fi descărcate ca fișier JSON.
          </p>
          <button
            @click="exportAllData"
            class="btn btn-emerald w-full"
          >
            Exportă toate datele
          </button>
          <button
            @click="exportToFilesIOS"
            class="btn btn-blue w-full mt-3"
            title="Salvează backup-ul în aplicația Files (iOS)"
          >
            Salvează în Files (iOS)
          </button>
        </div>
        
        <!-- Import Section -->
        <div class="card-glass p-6">
          <h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Upload class="h-5 w-5 text-blue-400" />
            Import Date
          </h2>
          <p class="text-white/70 text-sm mb-4">
            Lipește datele JSON aici pentru a încărca backup-ul.
          </p>
          <textarea
            v-model="importData"
            placeholder="Lipește datele JSON aici..."
            class="w-full rounded-lg border border-white/20 bg-white/20 px-4 py-3 text-white placeholder-white/50 focus:border-blue-400 focus:outline-none resize-none mb-4"
            rows="4"
          ></textarea>
          <button
            @click="importAllData"
            class="btn btn-blue w-full"
            :disabled="!importData.trim()"
          >
            Importă date
          </button>
          <div class="mt-3">
            <input
              ref="fileInputRef"
              type="file"
              accept=".json,application/json"
              class="hidden"
              @change="importFromFile"
            />
            <button
              @click="triggerFilePicker"
              class="btn btn-amber w-full"
            >
              Importă din fișier (Files)
            </button>
            <p class="text-xs text-white/50 mt-2">
              Alege un fișier backup JSON din Files (iOS/Android) pentru restaurare.
            </p>
          </div>
        </div>
        
        <!-- Backup Management -->
        <div class="card-glass p-6">
          <h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FolderOpen class="h-5 w-5 text-purple-400" />
            Gestionare Backup-uri
          </h2>
          
          <div class="space-y-4">
            <!-- Backup Folder Selection -->
            <div>
              <label class="block text-sm font-medium text-white/80 mb-2">Folder Backup</label>
              <div class="flex gap-2">
                <input
                  v-model="backupFolder"
                  type="text"
                  placeholder="Numele folderului pentru backup"
                  class="flex-1 rounded-lg border border-white/20 bg-white/20 px-4 py-3 text-white placeholder-white/50 focus:border-purple-400 focus:outline-none"
                />
                <button
                  @click="selectBackupFolder"
                  class="btn btn-purple px-4"
                >
                  Alege
                </button>
              </div>
              <p class="text-xs text-white/60 mt-1">
                Folder curent: {{ backupFolder || 'TimeTracker' }}
              </p>
            </div>
            
            <!-- Backup Actions -->
            <div class="grid grid-cols-2 gap-3">
              <button
                @click="loadBackupFiles"
                class="btn btn-purple flex items-center justify-center gap-2"
              >
                <RefreshCw class="h-4 w-4" />
                Încarcă Backup-uri
              </button>
              <button
                @click="createManualBackup"
                class="btn btn-green flex items-center justify-center gap-2"
              >
                <Save class="h-4 w-4" />
                Backup Manual
              </button>
            </div>
            
            <!-- Backup Files List -->
            <div v-if="backupFiles.length > 0" class="space-y-2">
              <h3 class="text-md font-medium text-white/80">Backup-uri disponibile:</h3>
              <div class="max-h-40 overflow-y-auto space-y-2">
                <div 
                  v-for="file in backupFiles" 
                  :key="file.name"
                  class="flex items-center justify-between bg-white/10 rounded-lg p-3"
                >
                  <div class="flex-1">
                    <div class="text-sm text-white/80">{{ file.name }}</div>
                    <div class="text-xs text-white/60">
                      {{ new Date(file.modificationTime).toLocaleString('ro-RO') }}
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <button
                      @click="restoreBackup(file.name)"
                      class="btn btn-blue p-2 rounded-full"
                      title="Restaurează"
                    >
                      <RotateCcw class="h-4 w-4" />
                    </button>
                    <button
                      @click="downloadBackup(file.name)"
                      class="btn btn-emerald p-2 rounded-full"
                      title="Descarcă"
                    >
                      <Download class="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Settings Page -->
    <SettingsPage v-else-if="currentPage === 'settings'" @navigate="navigateTo" />

    <!-- Changelog Page -->
    <div v-else-if="currentPage === 'changelog'" class="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 p-4 safe-top">
      <div class="flex items-center justify-between mb-6 pt-4">
        <button @click="navigateTo('settings')" class="btn btn-primary p-3 rounded-full">
          <ArrowLeft class="h-5 w-5" />
        </button>
        <h1 class="text-2xl font-bold text-white">Changelog</h1>
        <div class="text-sm text-white/60">v{{ appVersion }}</div>
      </div>
      
      <div class="space-y-6">
        <div v-for="version in changelog" :key="version.version" class="card-glass p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold text-white">Versiunea {{ version.version }}</h2>
            <span class="text-sm text-white/60">{{ version.date }}</span>
          </div>
          
          <div class="space-y-2">
            <div v-for="change in version.changes" :key="change" class="flex items-start gap-3">
              <div class="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
              <p class="text-white/80 text-sm">{{ change }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
