import { defineStore } from 'pinia'
import { Preferences } from '@capacitor/preferences'

export type SessionType = 'work' | 'break' | 'cigarette'

export interface Session {
  id: string
  type: SessionType
  startedAt: number
  endedAt: number | null
  manual: boolean
  note?: string
  address?: string
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

export const useTimerStore = defineStore('timer', {
  state: (): TimerState => ({
    activeType: null,
    activeStartedAt: null,
    sessions: [],
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
      // Use session-specific work time
      if (s.activeType === 'work' && s.activeStartedAt) {
        const currentTime = Date.now() - s.activeStartedAt
        return s.sessionWorkMs + Math.max(0, currentTime - s.totalPausedMs)
      }
      return s.sessionWorkMs
    },
    totalBreakMs: (s): number => {
      // Use session-specific break time
      if (s.activeType === 'break' && s.activeStartedAt) {
        return s.sessionBreakMs + (Date.now() - s.activeStartedAt)
      }
      // Add paused time to break time if we're paused
      if (s.activeType !== null && s.pausedAt !== null) {
        return s.sessionBreakMs + (Date.now() - s.pausedAt)
      }
      return s.sessionBreakMs
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
    async load() {
      const { value } = await Preferences.get({ key: STORAGE_KEY })
      if (!value) return
      try {
        const parsed = JSON.parse(value) as TimerState
        this.$patch(parsed)
      } catch {
        // ignore corrupted state
      }
    },
    async persist() {
      const copy: TimerState = {
        activeType: this.activeType,
        activeStartedAt: this.activeStartedAt,
        sessions: this.sessions,
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
      await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(copy) })
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
        // Start break timer (independent)
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
      const sessionType: SessionType = breakDurationMinutes < 5 ? 'cigarette' : 'break'
      
      // Update session totals
      if (sessionType === 'cigarette') {
        this.sessionCigaretteMs += breakDuration
      } else {
        this.sessionBreakMs += breakDuration
      }
      
      // Always save to sessions (both break and cigarette)
      const session: Session = {
        id: this.breakSessionId || crypto.randomUUID(),
        type: sessionType,
        startedAt: this.breakStartedAt,
        endedAt: now,
        manual: false,
        note: undefined,
        address: this.currentAddress,
      }
      this.sessions.unshift(session)
      
      // Reset break state
      this.breakStartedAt = null
      this.breakSessionId = null
      void this.persist()
    },
    resumeWork() {
      // If we're in break mode, resume work and pause break timer
      if (this.pausedAt && this.breakStartedAt) {
        // Add current break time to total
        const now = Date.now()
        const currentBreakDuration = now - this.breakStartedAt
        this.totalBreakTimeMs += currentBreakDuration
        
        // Resume work from where we left off
        this.pausedAt = null
        // Pause break timer (don't reset it, just stop counting)
        this.breakStartedAt = null
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
      
      if (this.activeType === 'work') {
        // For work sessions, calculate actual work time (excluding pauses)
        const totalTime = now - this.activeStartedAt
        let pausedTime = this.totalPausedMs
        
        // If we're currently paused, add current pause time
        if (this.isPaused && this.pausedAt) {
          pausedTime += now - this.pausedAt
        }
        
        actualDuration = Math.max(0, totalTime - pausedTime)
        this.sessionWorkMs += actualDuration
        
        // Create work session
        const session: Session = {
          id: this.currentSessionId || crypto.randomUUID(),
          type: 'work',
          startedAt: this.activeStartedAt,
          endedAt: this.activeStartedAt + actualDuration,
          manual: false,
          note,
          address: this.currentAddress,
        }
        this.sessions.unshift(session)
      }
      
      // End any active break session
      if (this.breakStartedAt) {
        this.endBreakSession()
      }
      
      // Reset all state
      this.activeType = null
      this.activeStartedAt = null
      this.currentSessionId = null
      this.pausedAt = null
      this.totalPausedMs = 0
      this.breakStartedAt = null
      this.breakSessionId = null
      this.totalBreakTimeMs = 0
      this.sessionWorkMs = 0
      this.sessionBreakMs = 0
      this.sessionCigaretteMs = 0
      void this.persist()
    },
    addManualSession(type: SessionType, startedAt: number, endedAt: number, note?: string) {
      if (endedAt <= startedAt) return
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
        state: {
          sessions: this.sessions,
          defaultAddress: this.defaultAddress,
          customAddress: this.customAddress,
          extraAddresses: this.extraAddresses,
          selectedAddressId: this.selectedAddressId,
        }
      }
      return JSON.stringify(payload, null, 2)
    },
    async importData(json: string) {
      const parsed = JSON.parse(json)
      if (parsed?.state?.sessions) this.sessions = parsed.state.sessions
      if (parsed?.state?.defaultAddress) this.defaultAddress = parsed.state.defaultAddress
      this.customAddress = parsed?.state?.customAddress ?? null
      this.extraAddresses = parsed?.state?.extraAddresses ?? []
      this.selectedAddressId = parsed?.state?.selectedAddressId ?? null
      void this.persist()
    }
  }
})
