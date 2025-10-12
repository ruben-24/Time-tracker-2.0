import { defineStore } from 'pinia'
import { Preferences } from '@capacitor/preferences'

export type SessionType = 'work' | 'break'

export interface Session {
  id: string
  type: SessionType
  startedAt: number
  endedAt: number | null
  manual: boolean
  note?: string
  address?: string
}

export interface TimerState {
  activeType: SessionType | null
  activeStartedAt: number | null
  sessions: Session[]
  defaultAddress: string
  customAddress: string | null
  currentSessionId: string | null
  pausedAt: number | null
  totalPausedMs: number
}

const STORAGE_KEY = 'tt2_state_v1'

export const useTimerStore = defineStore('timer', {
  state: (): TimerState => ({
    activeType: null,
    activeStartedAt: null,
    sessions: [],
    defaultAddress: 'Wasserburger str 15a,83119,Obing',
    customAddress: null,
    currentSessionId: null,
    pausedAt: null,
    totalPausedMs: 0,
  }),
  getters: {
    isRunning: (s): boolean => s.activeType !== null && s.pausedAt === null,
    isPaused: (s): boolean => s.activeType !== null && s.pausedAt !== null,
    totalWorkMs: (s): number => {
      const workSessions = s.sessions.filter(x => x.type === 'work')
      const workTime = workSessions.reduce((acc, x) => acc + ((x.endedAt ?? Date.now()) - x.startedAt), 0)
      // Add current work time if we're in work mode (running or paused)
      if (s.activeType === 'work' && s.activeStartedAt) {
        const currentTime = Date.now() - s.activeStartedAt
        return workTime + Math.max(0, currentTime - s.totalPausedMs)
      }
      return workTime
    },
    totalBreakMs: (s): number => {
      const breakSessions = s.sessions.filter(x => x.type === 'break')
      const breakTime = breakSessions.reduce((acc, x) => acc + ((x.endedAt ?? Date.now()) - x.startedAt), 0)
      // Add current break time if we're in break mode
      if (s.activeType === 'break' && s.activeStartedAt) {
        return breakTime + (Date.now() - s.activeStartedAt)
      }
      // Add paused time to break time if we're paused
      if (s.activeType !== null && s.pausedAt !== null) {
        return breakTime + (Date.now() - s.pausedAt)
      }
      return breakTime
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
        currentSessionId: this.currentSessionId,
        pausedAt: this.pausedAt,
        totalPausedMs: this.totalPausedMs,
      }
      await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(copy) })
    },
    currentAddress(): string {
      return this.customAddress ?? this.defaultAddress
    },
    startWork() {
      // If there's an active session, end it first
      if (this.activeType && this.activeStartedAt) {
        this.endCurrent()
      }
      // Create new work session
      this.activeType = 'work'
      this.activeStartedAt = Date.now()
      this.currentSessionId = crypto.randomUUID()
      this.pausedAt = null
      this.totalPausedMs = 0
      void this.persist()
    },
    startBreak() {
      // If there's an active work session, pause it and start break timer
      if (this.activeType === 'work' && this.activeStartedAt && !this.pausedAt) {
        // Pause the work session
        this.pausedAt = Date.now()
        void this.persist()
        return
      }
      // If no active session, start a new break session
      if (this.activeType && this.activeStartedAt) {
        this.endCurrent()
      }
      this.activeType = 'break'
      this.activeStartedAt = Date.now()
      this.currentSessionId = crypto.randomUUID()
      this.pausedAt = null
      this.totalPausedMs = 0
      void this.persist()
    },
    resumeWork() {
      // If we're paused (work or break), resume
      if (this.isPaused) {
        if (this.pausedAt) {
          this.totalPausedMs += Date.now() - this.pausedAt
        }
        this.pausedAt = null
        void this.persist()
        return
      }
      // If we're in break mode, switch back to work
      if (this.activeType === 'break' && this.activeStartedAt) {
        // Save break time and switch to work
        this.totalPausedMs += Date.now() - this.activeStartedAt
        this.activeType = 'work'
        this.activeStartedAt = Date.now()
        this.pausedAt = null
        void this.persist()
        return
      }
      // If no active session, start new work
      this.startWork()
    },
    endCurrent(note?: string) {
      if (!this.activeType || !this.activeStartedAt) return
      
      // Calculate actual work time (excluding pauses)
      const now = Date.now()
      let totalTime = now - this.activeStartedAt
      
      // If we're paused, add the pause time to totalPausedMs
      if (this.isPaused && this.pausedAt) {
        this.totalPausedMs += now - this.pausedAt
      }
      
      const actualWorkTime = Math.max(0, totalTime - this.totalPausedMs)
      
      // Create session with actual work time
      const session: Session = {
        id: this.currentSessionId || crypto.randomUUID(),
        type: this.activeType,
        startedAt: this.activeStartedAt,
        endedAt: this.activeStartedAt + actualWorkTime, // Use actual work time
        manual: false,
        note,
        address: this.currentAddress(),
      }
      this.sessions.unshift(session)
      
      // Reset state
      this.activeType = null
      this.activeStartedAt = null
      this.currentSessionId = null
      this.pausedAt = null
      this.totalPausedMs = 0
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
        address: this.currentAddress(),
      }
      this.sessions.unshift(session)
      void this.persist()
    },
    setCustomAddress(addr: string | null) {
      this.customAddress = addr && addr.trim().length > 0 ? addr : null
      void this.persist()
    },
    exportData(): string {
      const payload = {
        exportedAt: new Date().toISOString(),
        state: {
          sessions: this.sessions,
          defaultAddress: this.defaultAddress,
          customAddress: this.customAddress,
        }
      }
      return JSON.stringify(payload, null, 2)
    },
    async importData(json: string) {
      const parsed = JSON.parse(json)
      if (parsed?.state?.sessions) this.sessions = parsed.state.sessions
      if (parsed?.state?.defaultAddress) this.defaultAddress = parsed.state.defaultAddress
      this.customAddress = parsed?.state?.customAddress ?? null
      void this.persist()
    }
  }
})
