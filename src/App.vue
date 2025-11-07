<script setup lang="ts">
import { onMounted, ref, computed, onBeforeUnmount, watch } from 'vue'
import { useTimerStore } from './stores/timerStore'
import { useThemeStore } from './stores/themeStore'
import TimerControls from './components/TimerControls.vue'
import BurgerMenu from './components/BurgerMenu.vue'
import HistoryPage from './components/HistoryPage.vue'
import AddressesPage from './components/AddressesPage.vue'
import FinancialInfo from './components/FinancialInfo.vue'
import OvertimePage from './components/OvertimePage.vue'
import AddressSelector from './components/AddressSelector.vue'
import SettingsPage from './components/SettingsPage.vue'
import { formatDuration } from './utils/format'
import { setupBackgroundHandlers } from './utils/background'
import { setupLockScreenControls, showWorkingNotification, showBreakNotification, clearLockScreenNotification } from './utils/liveActivities'
import { checkForOtaUpdate, applyOtaUpdate, rollbackOtaUpdate, hasOtaSupport, markOtaSuccessful } from './utils/ota'
import { Preferences } from '@capacitor/preferences'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { ArrowLeft, Clock, Pause, Settings, X, Download, Upload, FolderOpen, RefreshCw, Save, RotateCcw } from 'lucide-vue-next'

const timer = useTimerStore()
const theme = useThemeStore()
const now = ref(Date.now())
const currentPage = ref('main')
const pageHistory = ref<string[]>([])
let ticker: number | undefined

// Count of all breaks (standalone + in-session)
const totalBreakCount = computed(() => {
  const standalone = timer.sessions.filter(s => s.type === 'break' || s.type === 'cigarette').length
  const inSession = timer.sessions
    .filter(s => s.type === 'work' && Array.isArray((s as any).breaks))
    .reduce((acc, s: any) => acc + ((s.breaks?.length) || 0), 0)
  return standalone + inSession
})

// App version (default from build-time, can be overridden by OTA)
// @ts-ignore - injected by Vite
const DEFAULT_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.0.0'
const appVersion = ref(DEFAULT_VERSION)
const latestVersion = ref<string | null>(null)
const updateManifestUrl = 'https://time-tracker-e36f1.web.app/updates/stable/manifest.json'
const isUpdateAvailable = ref(false)
const canUseOta = ref(false)

// Manual entry variables
const todayIso = new Date().toISOString()
const todayDate = todayIso.slice(0, 10)

const manualWorkDate = ref<string>(todayDate)
const manualWorkStartTime = ref<string>('09:00')
const manualWorkMode = ref<'duration' | 'end'>('duration')
const manualWorkDurationHours = ref<number>(8)
const manualWorkDurationMinutes = ref<number>(0)
const manualWorkEndDate = ref<string>(todayDate)
const manualWorkEndTime = ref<string>('17:00')
const manualWorkNote = ref('')

const sessionBreakDate = ref<string>(todayDate)
const sessionBreakStartTime = ref<string>('12:00')
const sessionBreakMode = ref<'duration' | 'end'>('duration')
const sessionBreakDurationMinutes = ref<number>(30)
const sessionBreakEndDate = ref<string>(todayDate)
const sessionBreakEndTime = ref<string>('12:30')
const sessionBreakNote = ref('')

const standaloneBreakDate = ref<string>(todayDate)
const standaloneBreakStartTime = ref<string>('12:00')
const standaloneBreakMode = ref<'duration' | 'end'>('duration')
const standaloneBreakDurationMinutes = ref<number>(15)
const standaloneBreakEndDate = ref<string>(todayDate)
const standaloneBreakEndTime = ref<string>('12:15')
const standaloneBreakNote = ref('')

// Multiple breaks management
const manualBreaks = ref<Array<{
  id: string
  start: number
  end: number
  note: string
}>>([])

const MS_PER_MINUTE = 60_000

function combineDateTime(date: string, time: string): number {
  if (!date || !time) return NaN
  const [yearStr, monthStr, dayStr] = date.split('-')
  const [hourStr, minuteStr = '0', secondStr = '0'] = time.split(':')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)
  const hours = Number(hourStr)
  const minutes = Number(minuteStr)
  const seconds = Number(secondStr)
  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    Number.isNaN(seconds)
  ) {
    return NaN
  }
  const dt = new Date(year, month - 1, day, hours, minutes, seconds, 0)
  return dt.getTime()
}

function formatDateTimeDisplay(timestamp: number | null | undefined): string {
  if (!timestamp || Number.isNaN(timestamp)) return '-'
  try {
    return new Date(timestamp).toLocaleString('ro-RO')
  } catch {
    return '-'
  }
}

function clampMinutes(value: number, max = Infinity) {
  if (!Number.isFinite(value)) return 0
  const clamped = Math.max(0, value)
  if (Number.isFinite(max)) {
    return Math.min(clamped, max)
  }
  return clamped
}

function sanitizeTimeInput(raw: string): string {
  if (!raw) return ''
  const digitsOnly = raw.replace(/[^\d]/g, '').slice(0, 4)
  if (digitsOnly.length <= 2) return digitsOnly
  const hours = digitsOnly.slice(0, 2)
  const minutes = digitsOnly.slice(2)
  if (!minutes.length) return `${hours}:`
  return `${hours}:${minutes}`
}

const manualWorkDurationTotalMinutes = computed(() => {
  const hours = Number.isFinite(manualWorkDurationHours.value) ? manualWorkDurationHours.value : 0
  const minutes = Number.isFinite(manualWorkDurationMinutes.value) ? manualWorkDurationMinutes.value : 0
  return clampMinutes(hours * 60 + minutes)
})

const manualWorkStartTimestamp = computed(() => {
  const ts = combineDateTime(manualWorkDate.value, manualWorkStartTime.value)
  return Number.isNaN(ts) ? null : ts
})

const manualWorkEndTimestamp = computed(() => {
  const startTs = manualWorkStartTimestamp.value
  if (startTs === null) return null
  if (manualWorkMode.value === 'duration') {
    const totalMinutes = manualWorkDurationTotalMinutes.value
    if (totalMinutes <= 0) return null
    return startTs + totalMinutes * MS_PER_MINUTE
  }
  const endTs = combineDateTime(manualWorkEndDate.value, manualWorkEndTime.value)
  if (Number.isNaN(endTs)) return null
  return endTs
})

const manualWorkDurationMs = computed(() => {
  const startTs = manualWorkStartTimestamp.value
  const endTs = manualWorkEndTimestamp.value
  if (startTs === null || endTs === null || endTs <= startTs) return 0
  return endTs - startTs
})

const manualWorkSummary = computed(() => {
  const startLabel = formatDateTimeDisplay(manualWorkStartTimestamp.value)
  const endLabel = formatDateTimeDisplay(manualWorkEndTimestamp.value)
  const durationLabel = manualWorkDurationMs.value > 0 ? formatDuration(manualWorkDurationMs.value) : '-'
  const breaksTotal = manualBreaks.value.reduce((acc, item) => acc + Math.max(0, item.end - item.start), 0)
  const breaksLabel = breaksTotal > 0 ? formatDuration(breaksTotal) : '0s'
  return {
    startLabel,
    endLabel,
    durationLabel,
    breaksLabel
  }
})

const canCreateIntegratedSession = computed(() => {
  const start = manualWorkStartTimestamp.value
  const end = manualWorkEndTimestamp.value
  if (start === null || end === null) return false
  if (end <= start) return false
  if (start > Date.now()) return false
  const totalBreakTime = manualBreaks.value.reduce((total, item) => total + Math.max(0, item.end - item.start), 0)
  const totalTime = end - start
  return totalTime - totalBreakTime > 0
})

const canCreateOngoingSession = computed(() => {
  const start = manualWorkStartTimestamp.value
  if (start === null) return false
  return start <= Date.now()
})

const canAddSessionBreak = computed(() => {
  const start = combineDateTime(sessionBreakDate.value, sessionBreakStartTime.value)
  if (Number.isNaN(start)) return false
  let end: number
  if (sessionBreakMode.value === 'duration') {
    const duration = clampMinutes(sessionBreakDurationMinutes.value)
    if (duration <= 0) return false
    end = start + duration * MS_PER_MINUTE
  } else {
    const endTs = combineDateTime(sessionBreakEndDate.value, sessionBreakEndTime.value)
    if (Number.isNaN(endTs)) return false
    end = endTs
  }
  return end > start
})

const canAddStandaloneBreakEntry = computed(() => {
  const start = combineDateTime(standaloneBreakDate.value, standaloneBreakStartTime.value)
  if (Number.isNaN(start)) return false
  let end: number
  if (standaloneBreakMode.value === 'duration') {
    const duration = clampMinutes(standaloneBreakDurationMinutes.value)
    if (duration <= 0) return false
    end = start + duration * MS_PER_MINUTE
  } else {
    const endTs = combineDateTime(standaloneBreakEndDate.value, standaloneBreakEndTime.value)
    if (Number.isNaN(endTs)) return false
    end = endTs
  }
  return end > start
})

function splitMinutes(totalMinutes: number) {
  const clamped = Math.max(0, Math.round(totalMinutes))
  return {
    hours: Math.floor(clamped / 60),
    minutes: clamped % 60
  }
}

const adjustWorkDuration = (deltaMinutes: number) => {
  const total = manualWorkDurationTotalMinutes.value + deltaMinutes
  const { hours, minutes } = splitMinutes(total)
  manualWorkDurationHours.value = hours
  manualWorkDurationMinutes.value = minutes
}

const adjustSessionBreakDuration = (deltaMinutes: number) => {
  const total = clampMinutes(sessionBreakDurationMinutes.value + deltaMinutes)
  sessionBreakDurationMinutes.value = total
}

const adjustStandaloneBreakDuration = (deltaMinutes: number) => {
  const total = clampMinutes(standaloneBreakDurationMinutes.value + deltaMinutes)
  standaloneBreakDurationMinutes.value = total
}

const timeRefs = [
  manualWorkStartTime,
  manualWorkEndTime,
  sessionBreakStartTime,
  sessionBreakEndTime,
  standaloneBreakStartTime,
  standaloneBreakEndTime,
]

timeRefs.forEach(refValue => {
  watch(refValue, (value) => {
    const sanitized = sanitizeTimeInput(value)
    if (sanitized !== value) {
      refValue.value = sanitized
    }
  })
})

watch(manualWorkDate, (newVal, oldVal) => {
  if (manualWorkMode.value === 'duration') {
    manualWorkEndDate.value = newVal
  } else if (manualWorkEndDate.value === oldVal) {
    manualWorkEndDate.value = newVal
  }
})

watch(manualWorkMode, (mode) => {
  if (mode === 'end') {
    if (!manualWorkEndDate.value) manualWorkEndDate.value = manualWorkDate.value
    if (!manualWorkEndTime.value) manualWorkEndTime.value = manualWorkStartTime.value
  } else {
    manualWorkEndDate.value = manualWorkDate.value
  }
})

watch(sessionBreakDate, (newVal, oldVal) => {
  if (sessionBreakMode.value === 'end' && sessionBreakEndDate.value === oldVal) {
    sessionBreakEndDate.value = newVal
  }
})

watch(sessionBreakMode, (mode) => {
  if (mode === 'end') {
    if (!sessionBreakEndDate.value) sessionBreakEndDate.value = sessionBreakDate.value
    if (!sessionBreakEndTime.value) sessionBreakEndTime.value = sessionBreakStartTime.value
  }
})

watch(standaloneBreakDate, (newVal, oldVal) => {
  if (standaloneBreakMode.value === 'end' && standaloneBreakEndDate.value === oldVal) {
    standaloneBreakEndDate.value = newVal
  }
})

watch(standaloneBreakMode, (mode) => {
  if (mode === 'end') {
    if (!standaloneBreakEndDate.value) standaloneBreakEndDate.value = standaloneBreakDate.value
    if (!standaloneBreakEndTime.value) standaloneBreakEndTime.value = standaloneBreakStartTime.value
  }
})

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
    // Notify OTA system that app started successfully (avoid rollback)
    try { await markOtaSuccessful() } catch {}
    // Setup Lock Screen controls (PAUSE/RESUME/END)
    try {
      await setupLockScreenControls((actionId) => {
        if (actionId === 'PAUSE') timer.startBreak()
        else if (actionId === 'RESUME') timer.resumeWork()
        else if (actionId === 'END') timer.endCurrent()
      })
    } catch {}
    const savedSettings = localStorage.getItem('backupSettings')
    if (savedSettings) {
      const settings = JSON.parse(savedSettings)
      backupFolder.value = settings.customFolder || 'TimeTracker'
    }
    
    // Use stored app version if present (set after successful OTA)
    try {
      const pref = await Preferences.get({ key: 'app_version' })
      if (pref.value) appVersion.value = pref.value
    } catch {}
    // If no version was loaded from Preferences, try localStorage
    if (appVersion.value === DEFAULT_VERSION) {
      try {
        const stored = localStorage.getItem('app_version')
        if (stored) appVersion.value = stored
      } catch {}
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

// Apply AMOLED theme (pure black) to body when selected
const isAmoled = computed(() => {
  const s = theme.settings
  const solid = s.backgroundStyle === 'solid'
  const p = (s.backgroundColors.primary || '').toLowerCase()
  const se = (s.backgroundColors.secondary || '').toLowerCase()
  const a = (s.backgroundColors.accent || '').toLowerCase()
  return solid && p === '#000000' && se === '#000000' && a === '#000000'
})

watch(isAmoled, (enabled) => {
  try { document.body.classList.toggle('theme-amoled', !!enabled) } catch {}
}, { immediate: true })

// Watch for button color changes
watch(() => theme.settings.buttonColors, (newColors) => {
  const root = document.documentElement
  root.style.setProperty('--btn-primary', newColors.primary)
  root.style.setProperty('--btn-secondary', newColors.secondary)
  root.style.setProperty('--btn-accent', newColors.accent)
}, { deep: true, immediate: true })

onBeforeUnmount(() => {
  if (ticker) window.clearInterval(ticker)
  try { document.body.classList.remove('theme-amoled') } catch {}
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

// Update Lock Screen notification as state changes
watch(() => ({ activeType: timer.activeType, pausedAt: timer.pausedAt, breakStartedAt: timer.breakStartedAt, t: now.value }), async () => {
  try {
    if (timer.activeType === 'work' && !timer.isPaused) {
      const minutes = Math.floor(elapsed.value / 60000)
      await showWorkingNotification(`${minutes} min lucrate`)
    } else if (timer.pausedAt && timer.breakStartedAt) {
      const breakMs = Date.now() - (timer.breakStartedAt || Date.now())
      const minutes = Math.floor(breakMs / 60000)
      await showBreakNotification(`${minutes} min pauză`)
    } else {
      await clearLockScreenNotification()
    }
  } catch {}
}, { deep: true })

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
  if (page && page !== currentPage.value) {
    pageHistory.value.push(currentPage.value)
  }
  currentPage.value = page
}

const goBack = () => {
  if (pageHistory.value.length > 0) {
    const prev = pageHistory.value.pop() as string
    currentPage.value = prev
  } else if (currentPage.value !== 'main') {
    currentPage.value = 'main'
  }
}

let touchStartX = 0
let touchStartY = 0
let touchStartTime = 0
let touchActive = false

const handleTouchStart = (e: TouchEvent) => {
  if (currentPage.value === 'main') return
  const t = e.touches && e.touches.length > 0 ? e.touches[0] : null
  if (!t) return
  touchStartX = t.clientX
  touchStartY = t.clientY
  touchStartTime = Date.now()
  touchActive = true
}

const handleTouchEnd = (e: TouchEvent) => {
  if (!touchActive || currentPage.value === 'main') return
  const t = e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0] : null
  if (!t) return
  const dx = t.clientX - touchStartX
  const dy = Math.abs(t.clientY - touchStartY)
  const dt = Date.now() - touchStartTime
  touchActive = false
  const startedOnLeftHalf = touchStartX <= window.innerWidth * 0.6
  const isSwipeRight = dx > 70 && dy < 80 && dt < 800
  if (startedOnLeftHalf && isSwipeRight) {
    goBack()
  }
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
    version: appVersion.value,
    date: '2024-12-19',
    changes: [
      'Mutare calcul financiar din pagina principală în burger menu',
      'Adăugare 12 culori noi pentru butoane (Ocean Blue, Cherry Pink, Lime Green, etc.)',
      'Îmbunătățire organizare interfață - pagina principală mai curată',
      'Rapoarte financiare accesibile din meniul principal',
      `Actualizare versiune la ${appVersion.value}`
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
  if (!standaloneBreakDate.value || !standaloneBreakStartTime.value) {
    alert('Te rog selectează data și ora de început pentru pauză!')
    return
  }

  const startTime = combineDateTime(standaloneBreakDate.value, standaloneBreakStartTime.value)
  if (Number.isNaN(startTime)) {
    alert('Timpul de început este invalid. Verifică formatul!')
    return
  }

  let endTime: number | null = null
  if (standaloneBreakMode.value === 'duration') {
    const durationMinutes = clampMinutes(standaloneBreakDurationMinutes.value)
    if (durationMinutes <= 0) {
      alert('Durata pauzei trebuie să fie mai mare decât 0 minute!')
      return
    }
    endTime = startTime + durationMinutes * MS_PER_MINUTE
  } else {
    if (!standaloneBreakEndDate.value || !standaloneBreakEndTime.value) {
      alert('Te rog completează data și ora de sfârșit!')
      return
    }
    endTime = combineDateTime(standaloneBreakEndDate.value, standaloneBreakEndTime.value)
    if (Number.isNaN(endTime)) {
      alert('Timpul de sfârșit este invalid!')
      return
    }
  }

  if (endTime === null || endTime <= startTime) {
    alert('Sfârșitul pauzei trebuie să fie după început!')
    return
  }

  // Check if there's an active work session
  if (timer.activeType === 'work' && timer.activeStartedAt) {
    alert('Există o sesiune de lucru activă! Pauzele se adaugă automat în sesiunea activă. Folosește butonul "Pauză" din timer.')
    return
  }

  const durationMs = endTime - startTime
  const breakType = durationMs < 5 * MS_PER_MINUTE ? 'cigarette' : 'break'

  timer.addManualSession(
    breakType as 'break' | 'cigarette',
    startTime,
    endTime,
    standaloneBreakNote.value.trim() || undefined
  )

  // Reset form (keep date for faster multiple entries)
  standaloneBreakStartTime.value = '12:00'
  if (standaloneBreakMode.value === 'duration') {
    standaloneBreakDurationMinutes.value = 15
  } else {
    standaloneBreakEndDate.value = standaloneBreakDate.value
    standaloneBreakEndTime.value = '12:15'
  }
  standaloneBreakNote.value = ''

  const breakTypeLabel = breakType === 'cigarette' ? 'pauză țigară' : 'pauză'
  alert(`Sesiunea de ${breakTypeLabel} a fost adăugată cu succes!`)
}

// Multiple breaks management
const addBreakToSession = () => {
  if (!sessionBreakDate.value || !sessionBreakStartTime.value) {
    alert('Selectează data și ora de început pentru pauză!')
    return
  }

  const startTime = combineDateTime(sessionBreakDate.value, sessionBreakStartTime.value)
  if (Number.isNaN(startTime)) {
    alert('Ora de început este invalidă!')
    return
  }

  let endTime: number | null = null
  if (sessionBreakMode.value === 'duration') {
    const durationMinutes = clampMinutes(sessionBreakDurationMinutes.value)
    if (durationMinutes <= 0) {
      alert('Durata pauzei trebuie să fie mai mare decât 0 minute!')
      return
    }
    endTime = startTime + durationMinutes * MS_PER_MINUTE
  } else {
    if (!sessionBreakEndDate.value || !sessionBreakEndTime.value) {
      alert('Te rog completează data și ora de sfârșit ale pauzei!')
      return
    }
    endTime = combineDateTime(sessionBreakEndDate.value, sessionBreakEndTime.value)
    if (Number.isNaN(endTime)) {
      alert('Ora de sfârșit este invalidă!')
      return
    }
  }

  if (endTime === null || endTime <= startTime) {
    alert('Timpul de sfârșit trebuie să fie după timpul de început!')
    return
  }

  manualBreaks.value.push({
    id: crypto.randomUUID(),
    start: startTime,
    end: endTime,
    note: sessionBreakNote.value.trim()
  })

  // Clear break form (keep defaults)
  sessionBreakStartTime.value = '12:00'
  if (sessionBreakMode.value === 'duration') {
    sessionBreakDurationMinutes.value = 30
  } else {
    sessionBreakEndDate.value = sessionBreakDate.value
    sessionBreakEndTime.value = '12:30'
  }
  sessionBreakNote.value = ''
  
  alert('Pauza a fost adăugată la sesiunea manuală!')
}

const removeBreak = (breakId: string) => {
  manualBreaks.value = manualBreaks.value.filter(b => b.id !== breakId)
}

const addIntegratedWorkSession = () => {
  if (!manualWorkDate.value || !manualWorkStartTime.value) {
    alert('Te rog completează data și ora de început!')
    return
  }

  const startTime = manualWorkStartTimestamp.value
  if (startTime === null) {
    alert('Timpul de început este invalid!')
    return
  }

  if (startTime > Date.now()) {
    alert('Timpul de început nu poate fi în viitor!')
    return
  }

  let endTime = manualWorkEndTimestamp.value
  if (endTime === null) {
    alert('Te rog completează o durată sau un timp de sfârșit valid!')
    return
  }

  if (endTime <= startTime) {
    alert('Timpul de sfârșit trebuie să fie după timpul de început!')
    return
  }

  const totalBreakTime = manualBreaks.value.reduce((total, breakItem) => {
    return total + Math.max(0, breakItem.end - breakItem.start)
  }, 0)

  const totalTime = endTime - startTime
  const workTime = totalTime - totalBreakTime
  if (workTime <= 0) {
    alert('Timpul de lucru nu poate fi negativ! Verifică pauzele.')
    return
  }

  const note = manualWorkNote.value.trim() || undefined

  if (manualBreaks.value.length > 0) {
    const breaks = manualBreaks.value.map(b => ({
      start: b.start,
      end: b.end
    }))
    timer.addManualWorkWithBreaks(startTime, breaks, endTime, note)
  } else {
    timer.addManualSession('work', startTime, endTime, note)
  }

  // Clear forms (keep date for convenience)
  manualWorkStartTime.value = '09:00'
  manualWorkMode.value = 'duration'
  manualWorkDurationHours.value = 8
  manualWorkDurationMinutes.value = 0
  manualWorkEndDate.value = manualWorkDate.value
  manualWorkEndTime.value = '17:00'
  manualWorkNote.value = ''
  manualBreaks.value = []

  alert(`Sesiunea integrată a fost adăugată! Timp lucru: ${formatDuration(workTime)}, Pauze: ${formatDuration(totalBreakTime)}`)
}

const addOngoingWorkSession = () => {
  if (!manualWorkDate.value || !manualWorkStartTime.value) {
    alert('Te rog completează data și ora de început!')
    return
  }

  const startTime = manualWorkStartTimestamp.value
  if (startTime === null) {
    alert('Timpul de început este invalid!')
    return
  }

  if (startTime > Date.now()) {
    alert('Timpul de început nu poate fi în viitor!')
    return
  }

  timer.addManualSession('work', startTime, null, manualWorkNote.value.trim() || undefined)
  
  manualWorkStartTime.value = '09:00'
  manualWorkNote.value = ''
  manualWorkMode.value = 'duration'
  manualWorkDurationHours.value = 8
  manualWorkDurationMinutes.value = 0
  manualWorkEndDate.value = manualWorkDate.value
  manualWorkEndTime.value = '17:00'
  manualBreaks.value = []
  
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
    alert('Backup salvat în Files → On My iPhone → ChronoFlux → TimeTracker')
  } catch (error) {
    console.error('Export to Files error:', error)
    alert('Eroare la salvarea în Files. Încearcă din nou.')
  }
}

// Export with folder selection (iOS/Android) via native Share sheet
const exportChooseLocation = async () => {
  try {
    const data = timer.exportData()
    const now = new Date()
    const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`
    const filename = `time-tracker-export-${stamp}.json`

    if (Capacitor.isNativePlatform()) {
      // If Share plugin is unavailable (OTA build without native plugin), fallback to saving in Files
      if (!Capacitor.isPluginAvailable('Share')) {
        await timer.saveToFile(timer.$state)
        alert('Share indisponibil. Am salvat backup în Files → On My iPhone → ChronoFlux → TimeTracker')
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
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Export choose location error:', error)
    try {
      // As a last resort on native, save to Files default folder
      if (Capacitor.isNativePlatform()) {
        await timer.saveToFile(timer.$state)
        alert('Nu s-a putut deschide Share. Backup salvat în Files → On My iPhone → ChronoFlux → TimeTracker')
        return
      }
    } catch {}
    alert('Eroare la exportul cu selectarea locației. Încearcă din nou.')
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

// Quick template: add 8h vacation session with note "Concediu"
const addVacationTemplate = () => {
  try {
    const nowTs = Date.now()
    const eightHours = 8 * 60 * 60 * 1000
    const start = nowTs - eightHours
    timer.addManualSession('work', start, nowTs, 'Concediu')
    alert('Șablon "Concediu" (8h) a fost adăugat!')
  } catch (e) {
    console.error('Vacation template error:', e)
    alert('Nu s-a putut adăuga șablonul Concediu.')
  }
}

// Vacation range template: create 8h sessions for multiple days
const vacationStart = ref('') // YYYY-MM-DD
const vacationEnd = ref('')   // YYYY-MM-DD

const addVacationRange = () => {
  if (!vacationStart.value || !vacationEnd.value) {
    alert('Selectează data de început și sfârșit!')
    return
  }
  const startDate = new Date(vacationStart.value + 'T00:00:00')
  const endDate = new Date(vacationEnd.value + 'T00:00:00')
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    alert('Date invalide!')
    return
  }
  if (endDate < startDate) {
    alert('Data de sfârșit trebuie să fie după data de început!')
    return
  }
  let current = new Date(startDate)
  let created = 0
  while (current <= endDate) {
    // 09:00 - 17:00 local time
    const dayStart = new Date(current)
    dayStart.setHours(9, 0, 0, 0)
    const dayEnd = new Date(current)
    dayEnd.setHours(17, 0, 0, 0)
    timer.addManualSession('work', dayStart.getTime(), dayEnd.getTime(), 'Concediu')
    created++
    // next day
    current.setDate(current.getDate() + 1)
  }
  alert(`Au fost adăugate ${created} zile de concediu (8h/zi).`)
  // Reset selection
  vacationStart.value = ''
  vacationEnd.value = ''
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
  const isoDate = now.toISOString()
  const datePart = isoDate.slice(0, 10)
  const timePart = isoDate.slice(11, 16)

  if (type === 'work') {
    manualWorkDate.value = datePart
    manualWorkStartTime.value = timePart
    if (manualWorkMode.value === 'end') {
      manualWorkEndDate.value = datePart
      manualWorkEndTime.value = timePart
    }
  } else {
    sessionBreakDate.value = datePart
    sessionBreakStartTime.value = timePart
    standaloneBreakDate.value = datePart
    standaloneBreakStartTime.value = timePart
    if (sessionBreakMode.value === 'end') {
      sessionBreakEndDate.value = datePart
      sessionBreakEndTime.value = timePart
    }
    if (standaloneBreakMode.value === 'end') {
      standaloneBreakEndDate.value = datePart
      standaloneBreakEndTime.value = timePart
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
  <div class="relative min-h-dvh" :class="{ 'floating-particles': theme.settings.particles }" @touchstart.passive="handleTouchStart" @touchend.passive="handleTouchEnd">
    <div class="hero-gradient" />
    
    <!-- Main Page -->
    <div v-if="currentPage === 'main'" class="mx-auto max-w-[430px] px-4 pb-36 safe-top">
      <!-- Header with Burger Menu -->
      <header class="mb-8 flex items-center justify-between">
        <div class="flex-1">
          <h1 class="text-3xl font-bold tracking-tight mb-1" :class="theme.settings.textStyle === 'rainbow' ? 'text-gradient-rainbow' : theme.settings.textStyle === 'glow' ? 'text-gradient-glow' : 'text-gradient'">ChronoFlux</h1>
          <p class="text-sm text-white/80 font-medium">Simplu. Rapid. Precis. v{{ appVersion }}</p>
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
          <BurgerMenu @navigate="navigateTo" :appVersion="appVersion" />
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

      <!-- Floating Timer Controls - Only buttons, no glass container -->
      <div class="fixed inset-x-0 bottom-0 z-30 safe-bottom">
        <div class="mx-auto max-w-[430px] px-4 pb-4">
          <TimerControls />
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

    <!-- Overtime Page -->
    <OvertimePage v-else-if="currentPage === 'overtime'" @navigate="navigateTo" />


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

              <div class="grid gap-3 sm:grid-cols-2">
              <div>
                  <label class="block text-xs font-semibold text-white/70 mb-2 uppercase tracking-wide">Data sesiune</label>
                <input
                  v-model="manualWorkDate"
                  type="date"
                    class="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none"
                />
              </div>
              <div>
                  <label class="block text-xs font-semibold text-white/70 mb-2 uppercase tracking-wide">Ora început</label>
                <input
                  v-model="manualWorkStartTime"
                    type="text"
                    inputmode="numeric"
                    maxlength="5"
                    placeholder="HH:MM"
                    class="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none"
                />
              </div>
            </div>

            <div class="mt-4">
                <label class="block text-xs font-semibold text-white/70 mb-2 uppercase tracking-wide">Completare timp</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  @click="manualWorkMode = 'duration'"
                  class="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium transition"
                  :class="manualWorkMode === 'duration' ? 'bg-blue-500/20 border-blue-400/60 text-white shadow-lg' : 'bg-white/10 text-white/70 hover:bg-white/15'"
                >
                  Durată (ore + minute)
                </button>
                <button
                  type="button"
                  @click="manualWorkMode = 'end'"
                  class="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium transition"
                  :class="manualWorkMode === 'end' ? 'bg-blue-500/20 border-blue-400/60 text-white shadow-lg' : 'bg-white/10 text-white/70 hover:bg-white/15'"
                >
                  Sfârșit specific
                </button>
              </div>
            </div>

              <div v-if="manualWorkMode === 'duration'" class="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                  <label class="block text-xs font-semibold text-white/70 mb-2 uppercase tracking-wide">Durată (ore)</label>
                <input
                  v-model.number="manualWorkDurationHours"
                  type="number"
                  min="0"
                    class="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none"
                />
              </div>
              <div>
                  <label class="block text-xs font-semibold text-white/70 mb-2 uppercase tracking-wide">Durată (minute)</label>
                <input
                  v-model.number="manualWorkDurationMinutes"
                  type="number"
                  min="0"
                  max="59"
                  step="5"
                    class="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none"
                />
              </div>
              <div class="sm:col-span-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  class="btn btn-glass px-3 py-2 text-xs"
                  @click="adjustWorkDuration(15)"
                >
                  +15 min
                </button>
                <button
                  type="button"
                  class="btn btn-glass px-3 py-2 text-xs"
                  @click="adjustWorkDuration(30)"
                >
                  +30 min
                </button>
                <button
                  type="button"
                  class="btn btn-glass px-3 py-2 text-xs"
                  @click="adjustWorkDuration(60)"
                >
                  +1 oră
                </button>
                <button
                  type="button"
                  class="btn btn-glass px-3 py-2 text-xs"
                  @click="adjustWorkDuration(-15)"
                >
                  -15 min
                </button>
              </div>
            </div>

              <div v-else class="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                  <label class="block text-xs font-semibold text-white/70 mb-2 uppercase tracking-wide">Data sfârșit</label>
                <input
                  v-model="manualWorkEndDate"
                  type="date"
                    class="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none"
                />
              </div>
              <div>
                  <label class="block text-xs font-semibold text-white/70 mb-2 uppercase tracking-wide">Ora sfârșit</label>
                <input
                  v-model="manualWorkEndTime"
                    type="text"
                    inputmode="numeric"
                    maxlength="5"
                    placeholder="HH:MM"
                    class="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none"
                />
              </div>
            </div>

              <div class="mt-4 grid gap-3 sm:grid-cols-2">
                <div class="rounded-lg bg-white/10 p-4 text-xs text-white/70 space-y-1">
                  <div class="text-sm font-semibold text-white">Rezumat sesiune</div>
                <div>Început: <span class="text-white/90">{{ manualWorkSummary.startLabel }}</span></div>
                <div>Sfârșit: <span class="text-white/90">{{ manualWorkSummary.endLabel }}</span></div>
                <div>Durată lucru: <span class="text-white/90">{{ manualWorkSummary.durationLabel }}</span></div>
                <div>Pauze atașate: <span class="text-white/90">{{ manualBreaks.length }} ({{ manualWorkSummary.breaksLabel }})</span></div>
              </div>
              <div>
                  <label class="block text-xs font-semibold text-white/70 mb-2 uppercase tracking-wide">Observații sesiune</label>
                <textarea
                  v-model="manualWorkNote"
                  placeholder="Adaugă observații despre sesiunea de lucru..."
                    class="h-full w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/50 focus:border-blue-400 focus:outline-none resize-none"
                  rows="3"
                ></textarea>
              </div>
            </div>

            <!-- Break Form -->
              <div class="mt-6 border-t border-white/20 pt-4">
                <h3 class="text-md font-medium text-white/80 mb-3 flex items-center gap-2">
                <Pause class="h-4 w-4 text-orange-400" />
                Adaugă Pauză în Sesiune
              </h3>

                <div class="grid gap-3 sm:grid-cols-2">
                <div>
                    <label class="block text-xs font-semibold text-white/70 mb-2 uppercase tracking-wide">Data pauză</label>
                  <input
                    v-model="sessionBreakDate"
                    type="date"
                      class="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-orange-400 focus:outline-none"
                  />
                </div>
                <div>
                    <label class="block text-xs font-semibold text-white/70 mb-2 uppercase tracking-wide">Ora început</label>
                  <input
                    v-model="sessionBreakStartTime"
                      type="text"
                      inputmode="numeric"
                      maxlength="5"
                      placeholder="HH:MM"
                      class="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-orange-400 focus:outline-none"
                  />
                </div>
              </div>

              <div class="mt-3">
                  <label class="block text-xs font-semibold text-white/70 mb-2 uppercase tracking-wide">Durată sau sfârșit</label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    @click="sessionBreakMode = 'duration'"
                    class="rounded-lg border border-white/20 px-4 py-2 text-xs font-medium transition"
                    :class="sessionBreakMode === 'duration' ? 'bg-orange-500/20 border-orange-400/60 text-white shadow-lg' : 'bg-white/10 text-white/70 hover:bg-white/15'"
                  >
                    Durată (minute)
                  </button>
                  <button
                    type="button"
                    @click="sessionBreakMode = 'end'"
                    class="rounded-lg border border-white/20 px-4 py-2 text-xs font-medium transition"
                    :class="sessionBreakMode === 'end' ? 'bg-orange-500/20 border-orange-400/60 text-white shadow-lg' : 'bg-white/10 text-white/70 hover:bg-white/15'"
                  >
                    Timp sfârșit
                  </button>
                </div>
              </div>

              <div v-if="sessionBreakMode === 'duration'" class="mt-3">
                  <label class="block text-xs font-semibold text-white/70 mb-2 uppercase tracking-wide">Durată pauză (minute)</label>
                <div class="flex items-center gap-3">
                  <input
                    v-model.number="sessionBreakDurationMinutes"
                    type="number"
                    min="1"
                      class="w-32 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-orange-400 focus:outline-none"
                  />
                  <div class="flex items-center gap-2">
                    <button type="button" class="btn btn-glass px-3 py-2 text-xs" @click="adjustSessionBreakDuration(5)">+5</button>
                    <button type="button" class="btn btn-glass px-3 py-2 text-xs" @click="adjustSessionBreakDuration(10)">+10</button>
                    <button type="button" class="btn btn-glass px-3 py-2 text-xs" @click="adjustSessionBreakDuration(15)">+15</button>
                  </div>
                </div>
              </div>
                <div v-else class="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                    <label class="block text-xs font-semibold text-white/70 mb-2 uppercase tracking-wide">Data sfârșit pauză</label>
                  <input
                    v-model="sessionBreakEndDate"
                    type="date"
                      class="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-orange-400 focus:outline-none"
                  />
                </div>
                <div>
                    <label class="block text-xs font-semibold text-white/70 mb-2 uppercase tracking-wide">Ora sfârșit pauză</label>
                  <input
                    v-model="sessionBreakEndTime"
                      type="text"
                      inputmode="numeric"
                      maxlength="5"
                      placeholder="HH:MM"
                      class="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-orange-400 focus:outline-none"
                  />
                </div>
              </div>

              <div class="mt-3">
                <label class="block text-xs font-semibold text-white/70 mb-2 uppercase tracking-wide">Observații pauză</label>
                <textarea
                  v-model="sessionBreakNote"
                  placeholder="Ex: Pauză masă sau pauză scurtă"
                  class="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/50 focus:border-orange-400 focus:outline-none resize-none"
                  rows="2"
                ></textarea>
              </div>

              <button
                @click="addBreakToSession"
                class="btn btn-amber mt-4 w-full"
                :disabled="!canAddSessionBreak"
              >
                Adaugă pauză la sesiune
              </button>
            </div>

            <!-- Breaks List -->
            <div v-if="manualBreaks.length > 0" class="mt-5 space-y-2">
              <h3 class="text-md font-medium text-white/80 mb-2">Pauze adăugate</h3>
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
                    Durată: {{ formatDuration(breakItem.end - breakItem.start) }}
                    <span v-if="breakItem.end - breakItem.start < 5 * MS_PER_MINUTE" class="text-yellow-400 ml-2">
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
                  title="Șterge pauza"
                >
                  <X class="h-4 w-4" />
                </button>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                @click="addIntegratedWorkSession"
                class="btn btn-primary flex-1"
                :disabled="!canCreateIntegratedSession"
              >
                Adaugă sesiune completă
              </button>
              <button
                @click="addOngoingWorkSession"
                class="btn btn-glass flex-1"
                :disabled="!canCreateOngoingSession"
              >
                Adaugă sesiune în curs
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

            <div class="grid gap-3 sm:grid-cols-2">
            <div>
                <label class="block text-xs font-semibold text-white/70 mb-2 uppercase tracking-wide">Data pauză</label>
              <input
                v-model="standaloneBreakDate"
                type="date"
                  class="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-rose-400 focus:outline-none"
              />
            </div>
            <div>
                <label class="block text-xs font-semibold text-white/70 mb-2 uppercase tracking-wide">Ora început</label>
              <input
                v-model="standaloneBreakStartTime"
                  type="text"
                  inputmode="numeric"
                  maxlength="5"
                  placeholder="HH:MM"
                  class="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-rose-400 focus:outline-none"
              />
            </div>
          </div>

          <div class="mt-3">
            <label class="block text-xs font-semibold text-white/70 mb-2 uppercase tracking-wide">Durată sau sfârșit</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                @click="standaloneBreakMode = 'duration'"
                class="rounded-lg border border-white/20 px-4 py-2 text-xs font-medium transition"
                :class="standaloneBreakMode === 'duration' ? 'bg-rose-500/20 border-rose-400/60 text-white shadow-lg' : 'bg-white/10 text-white/70 hover:bg-white/15'"
              >
                Durată (minute)
              </button>
              <button
                type="button"
                @click="standaloneBreakMode = 'end'"
                class="rounded-lg border border-white/20 px-4 py-2 text-xs font-medium transition"
                :class="standaloneBreakMode === 'end' ? 'bg-rose-500/20 border-rose-400/60 text-white shadow-lg' : 'bg-white/10 text-white/70 hover:bg-white/15'"
              >
                Timp sfârșit
              </button>
            </div>
          </div>

          <div v-if="standaloneBreakMode === 'duration'" class="mt-3 flex items-center gap-3">
            <input
              v-model.number="standaloneBreakDurationMinutes"
              type="number"
              min="1"
                class="w-32 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-rose-400 focus:outline-none"
            />
            <div class="flex items-center gap-2">
              <button type="button" class="btn btn-glass px-3 py-2 text-xs" @click="adjustStandaloneBreakDuration(5)">+5</button>
              <button type="button" class="btn btn-glass px-3 py-2 text-xs" @click="adjustStandaloneBreakDuration(10)">+10</button>
              <button type="button" class="btn btn-glass px-3 py-2 text-xs" @click="adjustStandaloneBreakDuration(15)">+15</button>
            </div>
          </div>
            <div v-else class="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
                <label class="block text-xs font-semibold text-white/70 mb-2 uppercase tracking-wide">Data sfârșit</label>
              <input
                v-model="standaloneBreakEndDate"
                type="date"
                  class="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-rose-400 focus:outline-none"
              />
            </div>
            <div>
                <label class="block text-xs font-semibold text-white/70 mb-2 uppercase tracking-wide">Ora sfârșit</label>
              <input
                v-model="standaloneBreakEndTime"
                  type="text"
                  inputmode="numeric"
                  maxlength="5"
                  placeholder="HH:MM"
                  class="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-rose-400 focus:outline-none"
              />
            </div>
          </div>

          <div class="mt-4">
              <label class="block text-xs font-semibold text-white/70 mb-2 uppercase tracking-wide">Observații pauză</label>
            <textarea
              v-model="standaloneBreakNote"
              placeholder="Adaugă observații despre pauză..."
                class="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/50 focus:border-rose-400 focus:outline-none resize-none"
              rows="2"
            ></textarea>
          </div>

          <button
            @click="addManualBreakSession"
            class="btn btn-rose mt-4 w-full"
            :disabled="!canAddStandaloneBreakEntry"
          >
            Adaugă pauză individuală
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

          <div class="mt-4">
            <button @click="addVacationTemplate" class="btn btn-emerald w-full p-4">
              Adaugă Șablon: Concediu (8h)
            </button>
          </div>

          <!-- Vacation range creator -->
          <div class="mt-4">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm text-white/80 mb-2">Concediu de la</label>
                <input
                  v-model="vacationStart"
                  type="date"
                  class="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white text-sm focus:border-purple-400 focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-sm text-white/80 mb-2">până la</label>
                <input
                  v-model="vacationEnd"
                  type="date"
                  class="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white text-sm focus:border-purple-400 focus:outline-none"
                />
              </div>
            </div>
            <button
              class="btn btn-purple w-full mt-3"
              :disabled="!vacationStart || !vacationEnd"
              @click="addVacationRange"
            >
              Adaugă Concediu (8h/zi) pentru interval
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
          <button
            @click="exportChooseLocation"
            class="btn btn-purple w-full mt-3"
            title="Alege locația la salvare (iOS/Android)"
          >
            Salvează ca fișier… (Alege locația)
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
    <SettingsPage v-else-if="currentPage === 'settings'" @navigate="navigateTo" :appVersion="appVersion" />

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
