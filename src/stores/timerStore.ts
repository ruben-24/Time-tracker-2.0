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
    totalWorkMs: (s): number => s.sessions
      .filter(x => x.type === 'work')
      .reduce((acc, x) => acc + ((x.endedAt ?? Date.now()) - x.startedAt), 0),
    totalBreakMs: (s): number => s.sessions
      .filter(x => x.type === 'break')
      .reduce((acc, x) => acc + ((x.endedAt ?? Date.now()) - x.startedAt), 0),
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
        this.pausedAt = Date.now()
        this.activeType = 'break'
        this.activeStartedAt = Date.now()
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
      // If we're in break mode, switch back to work
      if (this.activeType === 'break' && this.activeStartedAt) {
        this.activeType = 'work'
        this.pausedAt = null
        void this.persist()
        return
      }
      // If paused work, resume from where we left off
      if (this.isPaused && this.activeType === 'work') {
        this.totalPausedMs += Date.now() - this.pausedAt!
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
      // const totalTime = now - this.activeStartedAt
      // const actualWorkTime = totalTime - this.totalPausedMs
      
      const session: Session = {
        id: this.currentSessionId || crypto.randomUUID(),
        type: this.activeType,
        startedAt: this.activeStartedAt,
        endedAt: now,
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
