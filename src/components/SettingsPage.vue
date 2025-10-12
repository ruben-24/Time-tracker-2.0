<script setup lang="ts">
import { ref } from 'vue'
import { useTimerStore } from '../stores/timerStore'
import { useFinancialStore } from '../stores/financialStore'
import { ArrowLeft, Settings, Clock, DollarSign, MapPin, Bell, Trash2, Download, Upload } from 'lucide-vue-next'

const emit = defineEmits<{
  navigate: [page: string]
}>()

const timer = useTimerStore()
const financial = useFinancialStore()

// Settings state
const showDeleteConfirm = ref(false)
const showExportConfirm = ref(false)
const showImportConfirm = ref(false)
const importData = ref('')

// Theme settings (for future use)
// const isDarkMode = ref(true) // Default to dark mode

// Notification settings
const notificationsEnabled = ref(true)
const breakReminders = ref(true)
const workReminders = ref(false)

// Timer settings
const autoStartBreak = ref(false)
const breakDuration = ref(15) // minutes
const workSessionGoal = ref(8) // hours

// Financial settings
const hourlyRate = ref(financial.hourlyRate)
const weeklyHours = ref(financial.weeklyHours)
const taxClass = ref(financial.taxClass)

// Address settings
const defaultAddress = ref(timer.defaultAddress)

const updateFinancialSettings = () => {
  financial.updateSettings({
    hourlyRate: hourlyRate.value,
    weeklyHours: weeklyHours.value,
    taxClass: taxClass.value
  })
}

const updateDefaultAddress = () => {
  timer.defaultAddress = defaultAddress.value
  timer.persist()
}

const exportAllData = () => {
  const data = timer.exportData()
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `time-tracker-backup-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  showExportConfirm.value = false
}

const importAllData = () => {
  try {
    timer.importData(importData.value)
    showImportConfirm.value = false
    importData.value = ''
    alert('Datele au fost importate cu succes!')
  } catch (error) {
    alert('Eroare la importarea datelor. Verifică formatul fișierului.')
  }
}

const deleteAllData = () => {
  if (confirm('Sigur vrei să ștergi TOATE datele? Această acțiune nu poate fi anulată!')) {
    timer.sessions = []
    timer.extraAddresses = []
    timer.selectedAddressId = null
    timer.persist()
    showDeleteConfirm.value = false
    alert('Toate datele au fost șterse!')
  }
}

// const closeApp = () => {
//   if (confirm('Sigur vrei să închizi aplicația?')) {
//     // In a real app, this would close the app
//     window.close()
//   }
// }
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 p-4 safe-top">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6 pt-4">
      <button @click="emit('navigate', 'main')" class="btn btn-primary p-3 rounded-full">
        <ArrowLeft class="h-5 w-5" />
      </button>
      <h1 class="text-2xl font-bold text-white">Setări</h1>
      <div></div>
    </div>

    <div class="space-y-6">
      <!-- Timer Settings -->
      <div class="card-glass p-6">
        <div class="flex items-center gap-3 mb-4">
          <Clock class="h-6 w-6 text-blue-400" />
          <h2 class="text-lg font-semibold text-white">Setări Timer</h2>
        </div>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-white/80 mb-2">
              Durata pauzei (minute)
            </label>
            <input
              v-model="breakDuration"
              type="number"
              min="5"
              max="60"
              class="w-full rounded-lg border border-white/20 bg-white/20 px-4 py-3 text-white focus:border-blue-400 focus:outline-none"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-white/80 mb-2">
              Obiectiv sesiune de lucru (ore)
            </label>
            <input
              v-model="workSessionGoal"
              type="number"
              min="1"
              max="12"
              class="w-full rounded-lg border border-white/20 bg-white/20 px-4 py-3 text-white focus:border-blue-400 focus:outline-none"
            />
          </div>
          
          <div class="flex items-center justify-between">
            <span class="text-white/80">Pornire automată pauză</span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                v-model="autoStartBreak"
                type="checkbox"
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      <!-- Financial Settings -->
      <div class="card-glass p-6">
        <div class="flex items-center gap-3 mb-4">
          <DollarSign class="h-6 w-6 text-green-400" />
          <h2 class="text-lg font-semibold text-white">Setări Financiare</h2>
        </div>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-white/80 mb-2">
              Tarif orar (€/h)
            </label>
            <input
              v-model="hourlyRate"
              @blur="updateFinancialSettings"
              type="number"
              step="0.1"
              min="0"
              class="w-full rounded-lg border border-white/20 bg-white/20 px-4 py-3 text-white focus:border-green-400 focus:outline-none"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-white/80 mb-2">
              Ore pe săptămână
            </label>
            <input
              v-model="weeklyHours"
              @blur="updateFinancialSettings"
              type="number"
              min="1"
              max="80"
              class="w-full rounded-lg border border-white/20 bg-white/20 px-4 py-3 text-white focus:border-green-400 focus:outline-none"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-white/80 mb-2">
              Clasa fiscală
            </label>
            <select
              v-model="taxClass"
              @change="updateFinancialSettings"
              class="w-full rounded-lg border border-white/20 bg-white/20 px-4 py-3 text-white focus:border-green-400 focus:outline-none"
            >
              <option value="1">Clasa 1</option>
              <option value="2">Clasa 2</option>
              <option value="3">Clasa 3</option>
              <option value="4">Clasa 4</option>
              <option value="5">Clasa 5</option>
              <option value="6">Clasa 6</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Address Settings -->
      <div class="card-glass p-6">
        <div class="flex items-center gap-3 mb-4">
          <MapPin class="h-6 w-6 text-orange-400" />
          <h2 class="text-lg font-semibold text-white">Adresa Default</h2>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-white/80 mb-2">
            Adresa implicită
          </label>
          <textarea
            v-model="defaultAddress"
            @blur="updateDefaultAddress"
            placeholder="Introduceți adresa default..."
            class="w-full rounded-lg border border-white/20 bg-white/20 px-4 py-3 text-white placeholder-white/50 focus:border-orange-400 focus:outline-none resize-none"
            rows="3"
          ></textarea>
        </div>
      </div>

      <!-- Notifications -->
      <div class="card-glass p-6">
        <div class="flex items-center gap-3 mb-4">
          <Bell class="h-6 w-6 text-purple-400" />
          <h2 class="text-lg font-semibold text-white">Notificări</h2>
        </div>
        
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-white/80">Notificări active</span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                v-model="notificationsEnabled"
                type="checkbox"
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
          
          <div class="flex items-center justify-between">
            <span class="text-white/80">Memento pauză</span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                v-model="breakReminders"
                type="checkbox"
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
          
          <div class="flex items-center justify-between">
            <span class="text-white/80">Memento lucru</span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                v-model="workReminders"
                type="checkbox"
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </div>
      </div>

      <!-- Data Management -->
      <div class="card-glass p-6">
        <div class="flex items-center gap-3 mb-4">
          <Settings class="h-6 w-6 text-gray-400" />
          <h2 class="text-lg font-semibold text-white">Gestionare Date</h2>
        </div>
        
        <div class="space-y-3">
          <button
            @click="showExportConfirm = true"
            class="w-full flex items-center gap-3 p-3 rounded-lg bg-green-500/20 border border-green-400/50 text-green-400 hover:bg-green-500/30 transition-colors"
          >
            <Download class="h-5 w-5" />
            <span>Exportă toate datele</span>
          </button>
          
          <button
            @click="showImportConfirm = true"
            class="w-full flex items-center gap-3 p-3 rounded-lg bg-blue-500/20 border border-blue-400/50 text-blue-400 hover:bg-blue-500/30 transition-colors"
          >
            <Upload class="h-5 w-5" />
            <span>Importă date</span>
          </button>
          
          <button
            @click="showDeleteConfirm = true"
            class="w-full flex items-center gap-3 p-3 rounded-lg bg-red-500/20 border border-red-400/50 text-red-400 hover:bg-red-500/30 transition-colors"
          >
            <Trash2 class="h-5 w-5" />
            <span>Șterge toate datele</span>
          </button>
        </div>
      </div>

      <!-- App Info -->
      <div class="card-glass p-6">
        <div class="text-center">
          <h3 class="text-lg font-semibold text-white mb-2">Time Tracker Pro</h3>
          <p class="text-white/70 text-sm">Versiunea 2.0.0</p>
          <p class="text-white/60 text-xs mt-2">Dezvoltat cu ❤️ pentru productivitate</p>
        </div>
      </div>
    </div>

    <!-- Export Confirmation Modal -->
    <div v-if="showExportConfirm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="card-glass p-6 max-w-sm w-full">
        <h3 class="text-lg font-semibold text-white mb-4">Export Date</h3>
        <p class="text-white/70 text-sm mb-6">
          Toate datele tale (sesiuni, adrese, setări) vor fi descărcate ca fișier JSON.
        </p>
        <div class="flex gap-3">
          <button
            @click="exportAllData"
            class="btn btn-emerald flex-1"
          >
            Exportă
          </button>
          <button
            @click="showExportConfirm = false"
            class="btn btn-rose flex-1"
          >
            Anulează
          </button>
        </div>
      </div>
    </div>

    <!-- Import Confirmation Modal -->
    <div v-if="showImportConfirm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="card-glass p-6 max-w-sm w-full">
        <h3 class="text-lg font-semibold text-white mb-4">Import Date</h3>
        <p class="text-white/70 text-sm mb-4">
          Lipește conținutul fișierului JSON exportat anterior.
        </p>
        <textarea
          v-model="importData"
          placeholder="Lipește datele JSON aici..."
          class="w-full rounded-lg border border-white/20 bg-white/20 px-4 py-3 text-white placeholder-white/50 focus:border-blue-400 focus:outline-none resize-none mb-4"
          rows="4"
        ></textarea>
        <div class="flex gap-3">
          <button
            @click="importAllData"
            class="btn btn-emerald flex-1"
          >
            Importă
          </button>
          <button
            @click="showImportConfirm = false"
            class="btn btn-rose flex-1"
          >
            Anulează
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="card-glass p-6 max-w-sm w-full">
        <h3 class="text-lg font-semibold text-white mb-4">Șterge Toate Datele</h3>
        <p class="text-white/70 text-sm mb-6">
          ⚠️ Această acțiune va șterge toate sesiunile, adresele și setările. Nu poate fi anulată!
        </p>
        <div class="flex gap-3">
          <button
            @click="deleteAllData"
            class="btn btn-rose flex-1"
          >
            Șterge Tot
          </button>
          <button
            @click="showDeleteConfirm = false"
            class="btn btn-primary flex-1"
          >
            Anulează
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Additional styles if needed */
</style>