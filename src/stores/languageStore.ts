import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type Language = 'ro' | 'en' | 'de'

const translations = {
  ro: {
    chronoFlux: 'ChronoFlux',
    subtitle: 'Simplu. Rapid. Precis.',
    working: 'Lucru',
    onBreak: 'Pauză',
    paused: 'Pauză',
    inactive: 'Inactiv',
    start: 'Pornit',
    pause: 'Pauză',
    resume: 'Reluare',
    end: 'Sfârşit',
    startBreak: 'Pauză',
    manualEntry: 'Adăugare Manuală',
    history: 'Istoric Sesiuni',
    addresses: 'Adrese Extra',
    financial: 'Rapoarte Financiare',
    overtime: 'Ore Suplimentare',
    importExport: 'Import/Export',
    settings: 'Setări',
    closeApp: 'Închide Aplicația',
    language: 'Limbă',
    romanian: 'Română',
    english: 'Engleză',
    german: 'Germană',
    theme: 'Temă',
    notifications: 'Notificări',
    breakReminders: 'Notificări pauze',
    workReminders: 'Notificări de lucru',
    autoStartBreak: 'Porniți pauza automat',
    breakDuration: 'Durată pauză (minute)',
    autoStartWork: 'Porniți lucrul automat',
    resetToDefaults: 'Resetare la setări implicite',
    appInfo: 'Informații aplicație',
    version: 'Versiune',
    developedWith: 'Dezvoltat cu ❤️ pentru productivitate',
    manualWork: 'Adăugare manuală - Sesiune de lucru',
    manualBreak: 'Adăugare manuală - Pauză',
    workDate: 'Data sesiunii',
    startTime: 'Ora de început',
    endTime: 'Ora de sfârşit',
    duration: 'Durată',
    durationMode: 'Mod durată',
    endMode: 'Mod sfârşit',
    note: 'Notă (opțional)',
    addManualWork: 'Adăugare sesiune de lucru',
    addManualBreak: 'Adăugare pauză',
    successAdded: 'Sesiune adăugată cu succes!',
    invalidDate: 'Te rog selectează o dată validă!',
    invalidTime: 'Te rog selectează o oră validă!',
    selectStartTime: 'Te rog selectează ora de început!',
    selectEndTime: 'Te rog selectează ora de sfârşit!',
    financialReports: 'Rapoarte Financiare',
    totalEarned: 'Total câştigat',
    hourlyRate: 'Tarif orar',
    overtimeHours: 'Ore suplimentare',
    overtimeRate: 'Tarif ore suplimentare',
    sessionHistory: 'Istoric sesiuni',
    noSessions: 'Nu sunt sesiuni',
    changelog: 'Changelog',
    date: 'Dată',
    changes: 'Modificări',
    error: 'Eroare',
    success: 'Succes',
    warning: 'Avertizare'
  },
  en: {
    chronoFlux: 'ChronoFlux',
    subtitle: 'Simple. Fast. Accurate.',
    working: 'Working',
    onBreak: 'Break',
    paused: 'Paused',
    inactive: 'Inactive',
    start: 'Start',
    pause: 'Pause',
    resume: 'Resume',
    end: 'End',
    startBreak: 'Break',
    manualEntry: 'Manual Entry',
    history: 'Session History',
    addresses: 'Extra Addresses',
    financial: 'Financial Reports',
    overtime: 'Overtime Hours',
    importExport: 'Import/Export',
    settings: 'Settings',
    closeApp: 'Close App',
    language: 'Language',
    romanian: 'Romanian',
    english: 'English',
    german: 'German',
    theme: 'Theme',
    notifications: 'Notifications',
    breakReminders: 'Break Reminders',
    workReminders: 'Work Reminders',
    autoStartBreak: 'Auto-start break',
    breakDuration: 'Break Duration (minutes)',
    autoStartWork: 'Auto-start work',
    resetToDefaults: 'Reset to Defaults',
    appInfo: 'App Information',
    version: 'Version',
    developedWith: 'Developed with ❤️ for productivity',
    manualWork: 'Manual Entry - Work Session',
    manualBreak: 'Manual Entry - Break',
    workDate: 'Session Date',
    startTime: 'Start Time',
    endTime: 'End Time',
    duration: 'Duration',
    durationMode: 'Duration Mode',
    endMode: 'End Time Mode',
    note: 'Note (optional)',
    addManualWork: 'Add Work Session',
    addManualBreak: 'Add Break',
    successAdded: 'Session added successfully!',
    invalidDate: 'Please select a valid date!',
    invalidTime: 'Please select a valid time!',
    selectStartTime: 'Please select a start time!',
    selectEndTime: 'Please select an end time!',
    financialReports: 'Financial Reports',
    totalEarned: 'Total Earned',
    hourlyRate: 'Hourly Rate',
    overtimeHours: 'Overtime Hours',
    overtimeRate: 'Overtime Rate',
    sessionHistory: 'Session History',
    noSessions: 'No sessions',
    changelog: 'Changelog',
    date: 'Date',
    changes: 'Changes',
    error: 'Error',
    success: 'Success',
    warning: 'Warning'
  },
  de: {
    chronoFlux: 'ChronoFlux',
    subtitle: 'Einfach. Schnell. Präzise.',
    working: 'Arbeitet',
    onBreak: 'Pause',
    paused: 'Pausiert',
    inactive: 'Inaktiv',
    start: 'Starten',
    pause: 'Pause',
    resume: 'Fortsetzen',
    end: 'Beenden',
    startBreak: 'Pause',
    manualEntry: 'Manuelle Eingabe',
    history: 'Sitzungsverlauf',
    addresses: 'Zusätzliche Adressen',
    financial: 'Finanzberichte',
    overtime: 'Überstunden',
    importExport: 'Import/Export',
    settings: 'Einstellungen',
    closeApp: 'App beenden',
    language: 'Sprache',
    romanian: 'Rumänisch',
    english: 'Englisch',
    german: 'Deutsch',
    theme: 'Design',
    notifications: 'Benachrichtigungen',
    breakReminders: 'Pausenerinnerungen',
    workReminders: 'Arbeitserinnerungen',
    autoStartBreak: 'Pause automatisch starten',
    breakDuration: 'Pausendauer (Minuten)',
    autoStartWork: 'Arbeit automatisch starten',
    resetToDefaults: 'Auf Standard zurücksetzen',
    appInfo: 'App-Informationen',
    version: 'Version',
    developedWith: 'Entwickelt mit ❤️ für Produktivität',
    manualWork: 'Manuelle Eingabe - Arbeitssitzung',
    manualBreak: 'Manuelle Eingabe - Pause',
    workDate: 'Sitzungsdatum',
    startTime: 'Startzeit',
    endTime: 'Endzeit',
    duration: 'Dauer',
    durationMode: 'Dauermodus',
    endMode: 'Endzeitsmodus',
    note: 'Notiz (optional)',
    addManualWork: 'Arbeitssitzung hinzufügen',
    addManualBreak: 'Pause hinzufügen',
    successAdded: 'Sitzung erfolgreich hinzugefügt!',
    invalidDate: 'Bitte wählen Sie ein gültiges Datum!',
    invalidTime: 'Bitte wählen Sie eine gültige Zeit!',
    selectStartTime: 'Bitte wählen Sie eine Startzeit!',
    selectEndTime: 'Bitte wählen Sie eine Endzeit!',
    financialReports: 'Finanzberichte',
    totalEarned: 'Gesamteinkommen',
    hourlyRate: 'Stundensatz',
    overtimeHours: 'Überstunden',
    overtimeRate: 'Überstundensatz',
    sessionHistory: 'Sitzungsverlauf',
    noSessions: 'Keine Sitzungen',
    changelog: 'Changelog',
    date: 'Datum',
    changes: 'Änderungen',
    error: 'Fehler',
    success: 'Erfolg',
    warning: 'Warnung'
  }
}

export const useLanguageStore = defineStore('language', () => {
  const currentLanguage = ref<Language>('ro')
  
  const loadLanguage = async () => {
    try {
      const { Preferences } = await import('@capacitor/preferences')
      const result = await Preferences.get({ key: 'language' })
      if (result.value && (result.value === 'ro' || result.value === 'en' || result.value === 'de')) {
        currentLanguage.value = result.value as Language
      }
    } catch {
      const saved = localStorage.getItem('language')
      if (saved && (saved === 'ro' || saved === 'en' || saved === 'de')) {
        currentLanguage.value = saved as Language
      }
    }
  }
  
  const saveLanguage = async (lang: Language) => {
    currentLanguage.value = lang
    try {
      const { Preferences } = await import('@capacitor/preferences')
      await Preferences.set({ key: 'language', value: lang })
    } catch {
      localStorage.setItem('language', lang)
    }
  }
  
  const setLanguage = (lang: Language) => {
    saveLanguage(lang)
  }
  
  const t = (key: keyof typeof translations.ro): string => {
    return translations[currentLanguage.value][key as keyof typeof translations[Language]] || key
  }
  
  const locale = computed(() => {
    return currentLanguage.value
  })
  
  return {
    currentLanguage,
    loadLanguage,
    setLanguage,
    t,
    locale
  }
})