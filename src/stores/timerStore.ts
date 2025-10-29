import { defineStore } from 'pinia'
import { Preferences } from '@capacitor/preferences'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Capacitor } from '@capacitor/core'

export type SessionType = 'work' | 'break' | 'cigarette'

export interface Session {
  id: string
  type: SessionType
  startedAt: number
  endedAt: number | null
  manual: boolean
  note?: string
  address?: string
  breaks?: WorkBreak[]
}

export interface WorkBreak {
  id: string
  type: 'break' | 'cigarette'
  startedAt: number
  endedAt: number
  duration: number
}

export interface ExtraAddress {
  id: string
  name: string
  address: string
}

export interface TimerState {
  activeType: SessionType | null
  activeStartedAt: number | null
  sessions: Session[]
  currentWorkBreaks: WorkBreak[]
  defaultAddress: string
  customAddress: string | null
  extraAddresses: ExtraAddress[]
  selectedAddressId: string | null
  currentSessionId: string | null
  pausedAt: number | null
  totalPausedMs: number
  // Break timer (independent from work)
  breakStartedAt: number | null
  breakSessionId: string | null
  totalBreakTimeMs: number // Total break time accumulated
  // Session-specific totals (reset with each new session)
  sessionWorkMs: number
  sessionBreakMs: number
  sessionCigaretteMs: number
}

const STORAGE_KEY = 'tt2_state_v1'
const DATA_FILE = 'time-tracker-data.json'
const BACKUP_DIR = 'TimeTracker'

// Get backup directory from settings
const getBackupDirectory = () => {
  const settings = localStorage.getItem('backupSettings')
  if (settings) {
    const parsed = JSON.parse(settings)
    return parsed.customFolder || BACKUP_DIR
  }
  return BACKUP_DIR
}

export const useTimerStore = defineStore('timer', {
  state: (): TimerState => ({
    activeType: null,
    activeStartedAt: null,
    sessions: [],
    currentWorkBreaks: [],
    defaultAddress: 'Wasserburger str 15a,83119,Obing',
    customAddress: null,
    extraAddresses: [],
    selectedAddressId: null,
    currentSessionId: null,
    pausedAt: null,
    totalPausedMs: 0,
    breakStartedAt: null,
    breakSessionId: null,
    totalBreakTimeMs: 0,
    sessionWorkMs: 0,
    sessionBreakMs: 0,
    sessionCigaretteMs: 0,
  }),
  getters: {
    isRunning: (s): boolean => s.activeType !== null && s.pausedAt === null,
    isPaused: (s): boolean => s.activeType !== null && s.pausedAt !== null,
    isOnBreak: (s): boolean => s.pausedAt !== null && s.breakStartedAt !== null,
    totalWorkMs: (s): number => {
      if (s.activeType === 'work' && s.activeStartedAt) {
        const currentTime = Date.now() - s.activeStartedAt
        let pausedTime = s.totalPausedMs
        
        // Add current pause time if currently paused (includes breaks)
        if (s.activeType !== null && s.pausedAt !== null) {
          pausedTime += Date.now() - s.pausedAt
        }
        
        return s.sessionWorkMs + Math.max(0, currentTime - pausedTime)
      }
      return s.sessionWorkMs
    },
    totalBreakMs: (s): number => {
      // Show total break time accumulated in the current session,
      // including the ongoing break (if any)
      let total = s.totalBreakTimeMs
      if (s.pausedAt !== null && s.breakStartedAt !== null) {
        total += Date.now() - s.breakStartedAt
      }
      return total
    },
    totalCigaretteMs: (s): number => {
      // Use session-specific cigarette time
      return s.sessionCigaretteMs
    },
    currentAddress(): string {
      if (this.selectedAddressId) {
        const extraAddress = this.extraAddresses.find(addr => addr.id === this.selectedAddressId)
        if (extraAddress) return extraAddress.address
      }
      return this.customAddress ?? this.defaultAddress
    },
  },
  actions: {
    updateSession(sessionId: string, updates: Partial<Session>) {
      const idx = this.sessions.findIndex(s => s.id === sessionId)
      if (idx === -1) return false
      const current = this.sessions[idx]!
      // Avoid overriding id with possibly undefined from Partial
      type SessionUpdate = Omit<Partial<Session>, 'id'>
      const { id: _omitId, ...rest } = (updates || {}) as SessionUpdate & { id?: string }
      // Validate time bounds against prospective values
      const newStartedAt = (rest.startedAt as number | undefined) ?? current.startedAt
      const newEndedAt = (rest.endedAt as number | null | undefined) ?? current.endedAt
      if (newEndedAt !== null && newEndedAt !== undefined && newEndedAt <= newStartedAt) {
        throw new Error('Sfârșitul trebuie să fie după început')
      }

      // Normalize breaks if provided
      if (updates.breaks) {
        const normalized: WorkBreak[] = (updates.breaks || []).map(b => ({
          id: b.id || crypto.randomUUID(),
          type: b.type,
          startedAt: b.startedAt,
          endedAt: b.endedAt,
          duration: Math.max(0, (b.endedAt as number) - b.startedAt)
        }))
        current.breaks = normalized
      }

      // Apply scalar updates
      if (rest.type !== undefined) current.type = rest.type as SessionType
      if (rest.startedAt !== undefined) current.startedAt = rest.startedAt as number
      if (rest.endedAt !== undefined) current.endedAt = rest.endedAt as number | null
      if (rest.manual !== undefined) current.manual = rest.manual as boolean
      if (rest.note !== undefined) current.note = rest.note as string
      if (rest.address !== undefined) current.address = rest.address as string

      // Persist
      void this.persist()
      return true
    },
    async load() {
      try {
        // Try to load from file first
        const fileData = await this.loadFromFile()
        if (fileData) {
          this.$patch(fileData)
          return
        }
      } catch (error) {
        console.log('No file data found, trying preferences...', error instanceof Error ? error.message : 'Unknown error')
      }

      // Fallback to preferences
      try {
        const { value } = await Preferences.get({ key: STORAGE_KEY })
        if (!value) return
        
        const parsed = JSON.parse(value) as TimerState
        this.$patch(parsed)
        // Save to file for future use
        await this.saveToFile(parsed)
      } catch (error) {
        console.error('Failed to load from preferences:', error instanceof Error ? error.message : 'Unknown error')
        // Reset to default state on error
        this.$patch({
          activeType: null,
          activeStartedAt: null,
          sessions: [],
          currentWorkBreaks: [],
          defaultAddress: 'Munich',
          customAddress: null,
          extraAddresses: [],
          selectedAddressId: null,
          currentSessionId: null,
          pausedAt: null,
          totalPausedMs: 0,
          breakStartedAt: null,
          breakSessionId: null,
          totalBreakTimeMs: 0,
          sessionWorkMs: 0,
          sessionBreakMs: 0,
          sessionCigaretteMs: 0
        })
      }
    },
    async persist() {
      const copy: TimerState = {
        activeType: this.activeType,
        activeStartedAt: this.activeStartedAt,
        sessions: this.sessions,
        currentWorkBreaks: this.currentWorkBreaks,
        defaultAddress: this.defaultAddress,
        customAddress: this.customAddress,
        extraAddresses: this.extraAddresses,
        selectedAddressId: this.selectedAddressId,
        currentSessionId: this.currentSessionId,
        pausedAt: this.pausedAt,
        totalPausedMs: this.totalPausedMs,
        breakStartedAt: this.breakStartedAt,
        breakSessionId: this.breakSessionId,
        totalBreakTimeMs: this.totalBreakTimeMs,
        sessionWorkMs: this.sessionWorkMs,
        sessionBreakMs: this.sessionBreakMs,
        sessionCigaretteMs: this.sessionCigaretteMs,
      }
      
      // Save to both preferences and file
      try {
        await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(copy) })
        await this.saveToFile(copy)
      } catch (error) {
        console.error('Failed to persist data:', error instanceof Error ? error.message : 'Unknown error')
        throw new Error('Failed to save data')
      }
    },
    startWork() {
      // If there's an active session, end it first
      if (this.activeType && this.activeStartedAt) {
        this.endCurrent()
      }
      // Create new work session and reset session totals
      this.activeType = 'work'
      this.activeStartedAt = Date.now()
      this.currentSessionId = crypto.randomUUID()
      this.pausedAt = null
      this.totalPausedMs = 0
      this.breakStartedAt = null
      this.breakSessionId = null
      this.totalBreakTimeMs = 0
      this.currentWorkBreaks = []
      this.sessionWorkMs = 0
      this.sessionBreakMs = 0
      this.sessionCigaretteMs = 0
      void this.persist()
    },
    startBreak() {
      // If there's an active work session, pause it and start break timer
      if (this.activeType === 'work' && this.activeStartedAt && !this.pausedAt) {
        // Pause the work session
        this.pausedAt = Date.now()
        // Start new break timer
        this.breakStartedAt = Date.now()
        this.breakSessionId = crypto.randomUUID()
        void this.persist()
        return
      }
      // If we're already in break mode, do nothing
      if (this.pausedAt && this.breakStartedAt) {
        return
      }
      // If no active work session, can't start break
      if (!this.activeType || this.activeType !== 'work') {
        return
      }
    },
    endBreakSession() {
      if (!this.breakStartedAt) return
      
      const now = Date.now()
      const breakDuration = now - this.breakStartedAt
      const breakDurationMinutes = breakDuration / (1000 * 60)
      
      // If break is under 5 minutes, save as cigarette break
      const breakType = breakDurationMinutes < 5 ? 'cigarette' : 'break'
      
      // Update session totals
      if (breakType === 'cigarette') {
        this.sessionCigaretteMs += breakDuration
      } else {
        this.sessionBreakMs += breakDuration
      }
      
      // Add break to current work session breaks array (don't save as separate session)
      if (!this.currentWorkBreaks) {
        this.currentWorkBreaks = []
      }
      this.currentWorkBreaks.push({
        id: crypto.randomUUID(),
        type: breakType,
        startedAt: this.breakStartedAt,
        endedAt: now,
        duration: breakDuration
      })
      
      // Also add to the active work session if it exists
      if (this.activeType === 'work' && this.currentSessionId) {
        const activeSession = this.sessions.find(s => s.id === this.currentSessionId)
        if (activeSession) {
          if (!activeSession.breaks) {
            activeSession.breaks = []
          }
          activeSession.breaks.push({
            id: crypto.randomUUID(),
            type: breakType,
            startedAt: this.breakStartedAt,
            endedAt: now,
            duration: breakDuration
          })
        }
      }
      
      // Reset break state
      this.breakStartedAt = null
      this.breakSessionId = null
      void this.persist()
    },
    resumeWork() {
      // If we're in break mode, add break to current work session and resume work
      if (this.pausedAt && this.breakStartedAt) {
        // Add current break to total break time (don't save as separate session)
        const now = Date.now()
        const currentBreakDuration = now - this.breakStartedAt
        this.totalBreakTimeMs += currentBreakDuration
        
        // Add break to current work session breaks array
        const breakDurationMinutes = currentBreakDuration / (1000 * 60)
        const breakType = breakDurationMinutes < 5 ? 'cigarette' : 'break'
        if (breakType === 'cigarette') {
          this.sessionCigaretteMs += currentBreakDuration
        } else {
          this.sessionBreakMs += currentBreakDuration
        }
        
        // Store break info in current work session (not as separate session)
        if (!this.currentWorkBreaks) {
          this.currentWorkBreaks = []
        }
        this.currentWorkBreaks.push({
          id: crypto.randomUUID(),
          type: breakType,
          startedAt: this.breakStartedAt,
          endedAt: now,
          duration: currentBreakDuration
        })
        
        // Resume work from where we left off
        this.pausedAt = null
        this.breakStartedAt = null
        this.breakSessionId = null
        void this.persist()
        return
      }
      // If we're paused (work), resume
      if (this.isPaused && this.activeType === 'work') {
        if (this.pausedAt) {
          this.totalPausedMs += Date.now() - this.pausedAt
        }
        this.pausedAt = null
        void this.persist()
        return
      }
      // If no active session, start new work
      this.startWork()
    },
    endCurrent(note?: string) {
      if (!this.activeType || !this.activeStartedAt) return
      
      const now = Date.now()
      let actualDuration = 0
      
      // If a break is currently ongoing, finalize it first so it's persisted
      if (this.pausedAt !== null && this.breakStartedAt !== null) {
        const currentBreakDuration = now - this.breakStartedAt
        this.totalBreakTimeMs += currentBreakDuration
        const breakDurationMinutes = currentBreakDuration / (1000 * 60)
        const breakType = breakDurationMinutes < 5 ? 'cigarette' : 'break'
        if (breakType === 'cigarette') {
          this.sessionCigaretteMs += currentBreakDuration
        } else {
          this.sessionBreakMs += currentBreakDuration
        }
        if (!this.currentWorkBreaks) {
          this.currentWorkBreaks = []
        }
        this.currentWorkBreaks.push({
          id: crypto.randomUUID(),
          type: breakType,
          startedAt: this.breakStartedAt,
          endedAt: now,
          duration: currentBreakDuration
        })
      }
      
      if (this.activeType === 'work') {
        // For work sessions, calculate actual work time (excluding pauses)
        const totalTime = now - this.activeStartedAt
        let pausedTime = this.totalPausedMs
        
        // If we're currently paused, add current pause time (includes breaks)
        if (this.activeType !== null && this.pausedAt !== null) {
          pausedTime += now - this.pausedAt
        }
        
        actualDuration = Math.max(0, totalTime - pausedTime)
        this.sessionWorkMs += actualDuration
        
        // Create work session with breaks included
        const session: Session = {
          id: this.currentSessionId || crypto.randomUUID(),
          type: 'work',
          startedAt: this.activeStartedAt,
          endedAt: this.activeStartedAt + actualDuration,
          manual: false,
          note,
          address: this.currentAddress,
          breaks: this.currentWorkBreaks || []
        }
        this.sessions.unshift(session)
        
        // Don't create separate sessions for breaks - they're part of the work session
        // Breaks are stored in currentWorkBreaks and will be shown in session details
      }
      
      // Don't end break session separately - breaks are part of work session
      
      // Reset all state
      this.activeType = null
      this.activeStartedAt = null
      this.currentSessionId = null
      this.pausedAt = null
      this.totalPausedMs = 0
      this.breakStartedAt = null
      this.breakSessionId = null
      this.totalBreakTimeMs = 0
      this.currentWorkBreaks = []
      this.sessionWorkMs = 0
      this.sessionBreakMs = 0
      this.sessionCigaretteMs = 0
      void this.persist()
    },
    addManualSession(type: SessionType, startedAt: number, endedAt: number | null, note?: string) {
      if (endedAt && endedAt <= startedAt) return
      const session: Session = {
        id: crypto.randomUUID(),
        type,
        startedAt,
        endedAt,
        manual: true,
        note,
        address: this.currentAddress,
      }
      this.sessions.unshift(session)
      void this.persist()
    },

    // Utility: add manual work session with embedded breaks (net duration)
    addManualWorkWithBreaks(startedAt: number, breaks: Array<{ start: number, end: number }>, endedAt: number | null, note?: string) {
      const now = Date.now()
      const end = endedAt ?? now
      if (end <= startedAt) return

      // Store the actual timeline (gross): startedAt -> end, and embed breaks
      // Net time will be computed everywhere by subtracting these breaks
      const session: Session = {
        id: crypto.randomUUID(),
        type: 'work',
        startedAt,
        endedAt: end,
        manual: true,
        note,
        address: this.currentAddress,
        breaks: breaks.map(b => ({
          id: crypto.randomUUID(),
          type: 'break',
          startedAt: b.start,
          endedAt: b.end,
          duration: Math.max(0, b.end - b.start)
        }))
      }
      this.sessions.unshift(session)
      void this.persist()
    },
    updateDefaultAddress(newAddress: string) {
      this.defaultAddress = newAddress
      void this.persist()
    },
    
    // Clean up old break/cigarette sessions by moving them to work sessions
    cleanupOldBreakSessions() {
      const workSessions = this.sessions.filter(s => s.type === 'work')
      
      // Process each work session
      for (const workSession of workSessions) {
        if (!workSession.endedAt) continue
        
        // Find breaks linked to this work session
        const linkedBreaks = this.sessions.filter(s => 
          (s.type === 'break' || s.type === 'cigarette') &&
          s.note && s.note.includes(`Pauză din sesiunea ${workSession.id}`) &&
          s.startedAt >= workSession.startedAt &&
          s.endedAt && s.endedAt <= (workSession.endedAt || 0)
        )
        
        // Add breaks to this specific work session
        if (linkedBreaks.length > 0) {
          if (!workSession.breaks) {
            workSession.breaks = []
          }
          
          for (const breakSession of linkedBreaks) {
            workSession.breaks.push({
              id: breakSession.id,
              type: breakSession.type as 'break' | 'cigarette',
              startedAt: breakSession.startedAt,
              endedAt: breakSession.endedAt!,
              duration: breakSession.endedAt! - breakSession.startedAt
            })
          }
        }
      }
      
      // Remove all break and cigarette sessions (they're now in work sessions)
      this.sessions = this.sessions.filter(session => session.type === 'work')
      
      void this.persist()
    },
    setCustomAddress(addr: string | null) {
      this.customAddress = addr && addr.trim().length > 0 ? addr : null
      void this.persist()
    },
    addExtraAddress(name: string, address: string) {
      const newAddress: ExtraAddress = {
        id: crypto.randomUUID(),
        name: name.trim(),
        address: address.trim()
      }
      this.extraAddresses.push(newAddress)
      void this.persist()
    },
    updateExtraAddress(id: string, name: string, address: string) {
      const index = this.extraAddresses.findIndex(addr => addr.id === id)
      if (index !== -1) {
        this.extraAddresses[index] = {
          id,
          name: name.trim(),
          address: address.trim()
        }
        void this.persist()
      }
    },
    deleteExtraAddress(id: string) {
      this.extraAddresses = this.extraAddresses.filter(addr => addr.id !== id)
      if (this.selectedAddressId === id) {
        this.selectedAddressId = null
      }
      void this.persist()
    },
    selectAddress(addressId: string | null) {
      this.selectedAddressId = addressId
      void this.persist()
    },
    exportData(): string {
      const payload = {
        exportedAt: new Date().toISOString(),
        version: '2.0.0',
        state: {
          // Timer state
          activeType: this.activeType,
          activeStartedAt: this.activeStartedAt,
          currentSessionId: this.currentSessionId,
          pausedAt: this.pausedAt,
          totalPausedMs: this.totalPausedMs,
          breakStartedAt: this.breakStartedAt,
          breakSessionId: this.breakSessionId,
          totalBreakTimeMs: this.totalBreakTimeMs,
          sessionWorkMs: this.sessionWorkMs,
          sessionBreakMs: this.sessionBreakMs,
          sessionCigaretteMs: this.sessionCigaretteMs,
          // Address data
          defaultAddress: this.defaultAddress,
          customAddress: this.customAddress,
          extraAddresses: this.extraAddresses,
          selectedAddressId: this.selectedAddressId,
          // Sessions
          sessions: this.sessions,
        }
      }
      return JSON.stringify(payload, null, 2)
    },
    async importData(json: string) {
      try {
        const parsed = JSON.parse(json)
        
        // Accept both exported format { exportedAt, version, state: TimerState }
        // and raw TimerState saved from Filesystem backups
        const state = (parsed && typeof parsed === 'object' && 'state' in parsed)
          ? (parsed as any).state
          : parsed

        if (!state || typeof state !== 'object') {
          throw new Error('Format invalid: JSON necunoscut')
        }

        // Minimal validation for common fields (optional, tolerant to missing keys)
        if ('sessions' in state && !Array.isArray((state as any).sessions)) {
          throw new Error('Format invalid: câmpul sessions nu este listă')
        }

        // Import timer state
        if ((state as any).activeType !== undefined) this.activeType = (state as any).activeType
        if ((state as any).activeStartedAt !== undefined) this.activeStartedAt = (state as any).activeStartedAt
        if ((state as any).currentSessionId !== undefined) this.currentSessionId = (state as any).currentSessionId
        if ((state as any).pausedAt !== undefined) this.pausedAt = (state as any).pausedAt
        if ((state as any).totalPausedMs !== undefined) this.totalPausedMs = (state as any).totalPausedMs
        if ((state as any).breakStartedAt !== undefined) this.breakStartedAt = (state as any).breakStartedAt
        if ((state as any).breakSessionId !== undefined) this.breakSessionId = (state as any).breakSessionId
        if ((state as any).totalBreakTimeMs !== undefined) this.totalBreakTimeMs = (state as any).totalBreakTimeMs
        if ((state as any).sessionWorkMs !== undefined) this.sessionWorkMs = (state as any).sessionWorkMs
        if ((state as any).sessionBreakMs !== undefined) this.sessionBreakMs = (state as any).sessionBreakMs
        if ((state as any).sessionCigaretteMs !== undefined) this.sessionCigaretteMs = (state as any).sessionCigaretteMs
        
        // Import address data
        if ((state as any).defaultAddress !== undefined) this.defaultAddress = (state as any).defaultAddress
        if ((state as any).customAddress !== undefined) this.customAddress = (state as any).customAddress
        if ((state as any).extraAddresses !== undefined) this.extraAddresses = (state as any).extraAddresses
        if ((state as any).selectedAddressId !== undefined) this.selectedAddressId = (state as any).selectedAddressId
        
        // Import sessions
        if ((state as any).sessions !== undefined) this.sessions = (state as any).sessions
        
        // Save to storage
        await this.persist()
        
        return true
      } catch (error) {
        console.error('Import error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Eroare necunoscută'
        throw new Error(`Eroare la importarea datelor: ${errorMessage}`)
      }
    },

    // File system methods
    async saveToFile(data: TimerState) {
      try {
        const jsonData = JSON.stringify(data, null, 2)
        const backupDir = getBackupDirectory()
        
        // Create directory if it doesn't exist
        try {
          await Filesystem.mkdir({
            path: backupDir,
            directory: Directory.Documents,
            recursive: true
          })
        } catch (error) {
          // Directory might already exist, ignore error
        }

        // Save data file
        await Filesystem.writeFile({
          path: `${backupDir}/${DATA_FILE}`,
          data: jsonData,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        })

        // Create timestamped backup
        const timestamp = new Date().toISOString().split('T')[0]
        await Filesystem.writeFile({
          path: `${backupDir}/backup-${timestamp}.json`,
          data: jsonData,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        })

        // Also save to public Files location on Android (Download/<backupDir>) so user finds it in Files app
        try {
          const platform = Capacitor.getPlatform()
          if (platform === 'android') {
            // Ensure public Download/<backupDir> exists
            await Filesystem.mkdir({
              path: `Download/${backupDir}`,
              directory: Directory.ExternalStorage,
              recursive: true
            })

            // Write current data file
            await Filesystem.writeFile({
              path: `Download/${backupDir}/${DATA_FILE}`,
              data: jsonData,
              directory: Directory.ExternalStorage,
              encoding: Encoding.UTF8
            })

            // Write timestamped backup
            await Filesystem.writeFile({
              path: `Download/${backupDir}/backup-${timestamp}.json`,
              data: jsonData,
              directory: Directory.ExternalStorage,
              encoding: Encoding.UTF8
            })

            console.log('Data also saved to Android public Downloads folder')
          }
        } catch (error) {
          console.log('Saving to public Files location failed, continuing with local save only')
        }

        console.log('Data saved to file successfully')
      } catch (error) {
        console.error('Failed to save to file:', error)
      }
    },

    async loadFromFile() {
      try {
        const backupDir = getBackupDirectory()
        const result = await Filesystem.readFile({
          path: `${backupDir}/${DATA_FILE}`,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        })
        
        return JSON.parse(result.data as string) as TimerState
      } catch (error) {
        console.log('No data file found')
        return null
      }
    },

    async getBackupFiles() {
      try {
        const backupDir = getBackupDirectory()
        const platform = Capacitor.getPlatform()

        if (platform === 'android') {
          // Prefer public Downloads folder if available
          try {
            const publicResult = await Filesystem.readdir({
              path: `Download/${backupDir}`,
              directory: Directory.ExternalStorage
            })
            return publicResult.files
              .filter(file => file.name.endsWith('.json'))
              .sort((a, b) => b.name.localeCompare(a.name))
          } catch (e) {
            // Fallback to app Documents
          }
        }

        const result = await Filesystem.readdir({
          path: backupDir,
          directory: Directory.Documents
        })

        return result.files
          .filter(file => file.name.endsWith('.json'))
          .sort((a, b) => b.name.localeCompare(a.name))
      } catch (error) {
        console.error('Failed to list backup files:', error)
        return []
      }
    },

    async restoreFromBackup(filename: string) {
      try {
        const backupDir = getBackupDirectory()
        const platform = Capacitor.getPlatform()
        let fileData: string | null = null

        // Try public Downloads on Android first
        if (platform === 'android') {
          try {
            const publicRes = await Filesystem.readFile({
              path: `Download/${backupDir}/${filename}`,
              directory: Directory.ExternalStorage,
              encoding: Encoding.UTF8
            })
            fileData = publicRes.data as string
          } catch (e) {
            // Will fallback to app Documents
          }
        }

        if (!fileData) {
          const result = await Filesystem.readFile({
            path: `${backupDir}/${filename}`,
            directory: Directory.Documents,
            encoding: Encoding.UTF8
          })
          fileData = result.data as string
        }

        const data = JSON.parse(fileData) as TimerState
        this.$patch(data)
        await this.persist()

        return true
      } catch (error) {
        console.error('Failed to restore from backup:', error)
        const errorMessage = error instanceof Error ? error.message : 'Eroare necunoscută'
        throw new Error(`Eroare la restaurarea backup-ului: ${errorMessage}`)
      }
    }
  }
})
