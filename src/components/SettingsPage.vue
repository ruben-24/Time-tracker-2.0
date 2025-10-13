<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useTimerStore } from '../stores/timerStore'
import { useFinancialStore } from '../stores/financialStore'
import { useThemeStore } from '../stores/themeStore'
import { ArrowLeft, Settings, Clock, DollarSign, MapPin, Bell, Trash2, Palette, Brush, Sparkles, Eye, Zap } from 'lucide-vue-next'

const emit = defineEmits<{
  navigate: [page: string]
}>()

const timer = useTimerStore()
const financial = useFinancialStore()
const theme = useThemeStore()

// Settings state
const showDeleteConfirm = ref(false)

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

// Theme settings
const customBackgroundColor = ref(theme.settings.backgroundColors.primary)
const customButtonColor = ref(theme.settings.buttonColors.primary)

onMounted(() => {
  theme.load()
  
  // Load saved settings
  const savedNotifications = localStorage.getItem('notificationsEnabled')
  if (savedNotifications !== null) {
    notificationsEnabled.value = savedNotifications === 'true'
  }
  
  const savedBreakReminders = localStorage.getItem('breakReminders')
  if (savedBreakReminders !== null) {
    breakReminders.value = savedBreakReminders === 'true'
  }
  
  const savedWorkReminders = localStorage.getItem('workReminders')
  if (savedWorkReminders !== null) {
    workReminders.value = savedWorkReminders === 'true'
  }
  
  const savedAutoStartBreak = localStorage.getItem('autoStartBreak')
  if (savedAutoStartBreak !== null) {
    autoStartBreak.value = savedAutoStartBreak === 'true'
  }
  
  const savedBreakDuration = localStorage.getItem('breakDuration')
  if (savedBreakDuration !== null) {
    breakDuration.value = parseInt(savedBreakDuration)
  }
  
  const savedWorkSessionGoal = localStorage.getItem('workSessionGoal')
  if (savedWorkSessionGoal !== null) {
    workSessionGoal.value = parseInt(savedWorkSessionGoal)
  }
})

// Auto-save watchers
watch(notificationsEnabled, (newValue) => {
  localStorage.setItem('notificationsEnabled', newValue.toString())
})

watch(breakReminders, (newValue) => {
  localStorage.setItem('breakReminders', newValue.toString())
})

watch(workReminders, (newValue) => {
  localStorage.setItem('workReminders', newValue.toString())
})

watch(autoStartBreak, (newValue) => {
  localStorage.setItem('autoStartBreak', newValue.toString())
})

watch(breakDuration, (newValue) => {
  localStorage.setItem('breakDuration', newValue.toString())
})

watch(workSessionGoal, (newValue) => {
  localStorage.setItem('workSessionGoal', newValue.toString())
})

watch(hourlyRate, (newValue) => {
  financial.updateSettings({
    hourlyRate: newValue,
    weeklyHours: financial.weeklyHours,
    taxClass: financial.taxClass
  })
})

watch(weeklyHours, (newValue) => {
  financial.updateSettings({
    hourlyRate: financial.hourlyRate,
    weeklyHours: newValue,
    taxClass: financial.taxClass
  })
})

watch(taxClass, (newValue) => {
  financial.updateSettings({
    hourlyRate: financial.hourlyRate,
    weeklyHours: financial.weeklyHours,
    taxClass: newValue
  })
})

watch(defaultAddress, (newValue) => {
  timer.updateDefaultAddress(newValue)
})

watch(customBackgroundColor, (newValue) => {
  theme.updateSettings({
    ...theme.settings,
    backgroundColors: {
      ...theme.settings.backgroundColors,
      primary: newValue
    }
  })
})

watch(customButtonColor, (newValue) => {
  theme.updateSettings({
    ...theme.settings,
    buttonColors: {
      ...theme.settings.buttonColors,
      primary: newValue
    }
  })
})

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


// Theme functions
const applyBackgroundPreset = (preset: any) => {
  theme.applyBackgroundPreset(preset)
  customBackgroundColor.value = preset.colors.primary
}

const applyButtonPreset = (preset: any) => {
  theme.applyButtonPreset(preset)
  customButtonColor.value = preset.colors.primary
}

const updateCustomBackground = () => {
  theme.updateSettings({
    backgroundColors: {
      ...theme.settings.backgroundColors,
      primary: customBackgroundColor.value
    }
  })
}

const updateCustomButton = () => {
  theme.updateSettings({
    buttonColors: {
      ...theme.settings.buttonColors,
      primary: customButtonColor.value
    }
  })
}

const resetTheme = () => {
  theme.reset()
  customBackgroundColor.value = theme.settings.backgroundColors.primary
  customButtonColor.value = theme.settings.buttonColors.primary
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
      <!-- Theme Customization -->
      <div class="card-glass p-6">
        <div class="flex items-center gap-3 mb-4">
          <Palette class="h-6 w-6 text-pink-400" />
          <h2 class="text-lg font-semibold text-white">Personalizare Temă</h2>
        </div>
        
        <div class="space-y-6">
          <!-- Background Presets -->
          <div>
            <h3 class="text-md font-medium text-white/80 mb-3 flex items-center gap-2">
              <Eye class="h-4 w-4" />
              Preset-uri Background
            </h3>
            <div class="grid grid-cols-2 gap-3">
              <button
                v-for="preset in theme.backgroundPresets"
                :key="preset.name"
                @click="applyBackgroundPreset(preset)"
                class="p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105"
                :class="theme.settings.backgroundColors.primary === preset.colors.primary ? 'border-pink-400 bg-pink-400/20' : 'border-white/20 bg-white/10 hover:border-white/40'"
              >
                <div class="flex items-center gap-2 mb-2">
                  <div 
                    class="w-4 h-4 rounded-full"
                    :style="{ backgroundColor: preset.colors.primary }"
                  ></div>
                  <div 
                    class="w-4 h-4 rounded-full"
                    :style="{ backgroundColor: preset.colors.secondary }"
                  ></div>
                  <div 
                    class="w-4 h-4 rounded-full"
                    :style="{ backgroundColor: preset.colors.accent }"
                  ></div>
                </div>
                <div class="text-xs text-white/70">{{ preset.name }}</div>
              </button>
            </div>
          </div>

          <!-- Button Presets -->
          <div>
            <h3 class="text-md font-medium text-white/80 mb-3 flex items-center gap-2">
              <Brush class="h-4 w-4" />
              Preset-uri Butoane
            </h3>
            <div class="grid grid-cols-2 gap-3">
              <button
                v-for="preset in theme.buttonPresets"
                :key="preset.name"
                @click="applyButtonPreset(preset)"
                class="p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105"
                :class="theme.settings.buttonColors.primary === preset.colors.primary ? 'border-cyan-400 bg-cyan-400/20' : 'border-white/20 bg-white/10 hover:border-white/40'"
              >
                <div class="flex items-center gap-2 mb-2">
                  <div 
                    class="w-4 h-4 rounded-full"
                    :style="{ backgroundColor: preset.colors.primary }"
                  ></div>
                  <div 
                    class="w-4 h-4 rounded-full"
                    :style="{ backgroundColor: preset.colors.secondary }"
                  ></div>
                  <div 
                    class="w-4 h-4 rounded-full"
                    :style="{ backgroundColor: preset.colors.accent }"
                  ></div>
                </div>
                <div class="text-xs text-white/70">{{ preset.name }}</div>
              </button>
            </div>
          </div>

          <!-- Custom Colors -->
          <div>
            <h3 class="text-md font-medium text-white/80 mb-3 flex items-center gap-2">
              <Sparkles class="h-4 w-4" />
              Culori Personalizate
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-white/70 mb-2">Background Principal</label>
                <div class="flex gap-2">
                  <input
                    v-model="customBackgroundColor"
                    @change="updateCustomBackground"
                    type="color"
                    class="w-12 h-10 rounded-lg border border-white/20 cursor-pointer"
                  />
                  <input
                    v-model="customBackgroundColor"
                    @change="updateCustomBackground"
                    type="text"
                    class="flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white text-sm"
                    placeholder="#0f0f23"
                  />
                </div>
              </div>
              <div>
                <label class="block text-sm text-white/70 mb-2">Butoane Principale</label>
                <div class="flex gap-2">
                  <input
                    v-model="customButtonColor"
                    @change="updateCustomButton"
                    type="color"
                    class="w-12 h-10 rounded-lg border border-white/20 cursor-pointer"
                  />
                  <input
                    v-model="customButtonColor"
                    @change="updateCustomButton"
                    type="text"
                    class="flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white text-sm"
                    placeholder="#3b82f6"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Visual Effects -->
          <div>
            <h3 class="text-md font-medium text-white/80 mb-3 flex items-center gap-2">
              <Zap class="h-4 w-4" />
              Efecte Vizuale
            </h3>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-white/80">Animații</span>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    v-model="theme.settings.animations"
                    @change="theme.updateSettings({ animations: theme.settings.animations })"
                    type="checkbox"
                    class="sr-only peer"
                  />
                  <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
              
              <div class="flex items-center justify-between">
                <span class="text-white/80">Particule flotante</span>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    v-model="theme.settings.particles"
                    @change="theme.updateSettings({ particles: theme.settings.particles })"
                    type="checkbox"
                    class="sr-only peer"
                  />
                  <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
              
              <div class="flex items-center justify-between">
                <span class="text-white/80">Efect glass</span>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    v-model="theme.settings.glassEffect"
                    @change="theme.updateSettings({ glassEffect: theme.settings.glassEffect })"
                    type="checkbox"
                    class="sr-only peer"
                  />
                  <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>
          </div>

          <!-- Reset Theme -->
          <div class="pt-4 border-t border-white/20">
            <button
              @click="resetTheme"
              class="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-red-500/20 border border-red-400/50 text-red-400 hover:bg-red-500/30 transition-colors"
            >
              <Settings class="h-4 w-4" />
              <span>Resetează la setările implicite</span>
            </button>
          </div>
        </div>
      </div>

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
            @click="showDeleteConfirm = true"
            class="w-full flex items-center gap-3 p-3 rounded-lg bg-red-500/20 border border-red-400/50 text-red-400 hover:bg-red-500/30 transition-colors"
          >
            <Trash2 class="h-5 w-5" />
            <span>Șterge toate datele</span>
          </button>
        </div>
      </div>


      <!-- Essential Settings -->
      <div class="card-glass p-6">
        <div class="flex items-center gap-3 mb-4">
          <Settings class="h-6 w-6 text-indigo-400" />
          <h2 class="text-lg font-semibold text-white">Setări Esențiale</h2>
        </div>
        
        <div class="space-y-4">
          <!-- Language -->
          <div>
            <label class="block text-sm font-medium text-white/80 mb-2">Limbă</label>
            <select class="w-full rounded-lg border border-white/20 bg-white/20 px-4 py-3 text-white focus:border-indigo-400 focus:outline-none">
              <option value="ro">Română</option>
              <option value="en">English</option>
            </select>
          </div>
          
          <!-- Time Format -->
          <div>
            <label class="block text-sm font-medium text-white/80 mb-2">Format Timp</label>
            <select class="w-full rounded-lg border border-white/20 bg-white/20 px-4 py-3 text-white focus:border-indigo-400 focus:outline-none">
              <option value="24h">24 ore (HH:MM)</option>
              <option value="12h">12 ore (AM/PM)</option>
            </select>
          </div>
          
          <!-- Date Format -->
          <div>
            <label class="block text-sm font-medium text-white/80 mb-2">Format Dată</label>
            <select class="w-full rounded-lg border border-white/20 bg-white/20 px-4 py-3 text-white focus:border-indigo-400 focus:outline-none">
              <option value="dd/mm/yyyy">DD/MM/YYYY</option>
              <option value="mm/dd/yyyy">MM/DD/YYYY</option>
              <option value="yyyy-mm-dd">YYYY-MM-DD</option>
            </select>
          </div>
          
          <!-- Auto-save Interval -->
          <div>
            <label class="block text-sm font-medium text-white/80 mb-2">Interval Auto-save (secunde)</label>
            <input 
              type="number" 
              min="5" 
              max="300" 
              value="30"
              class="w-full rounded-lg border border-white/20 bg-white/20 px-4 py-3 text-white focus:border-indigo-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <!-- Notification Settings -->
      <div class="card-glass p-6">
        <div class="flex items-center gap-3 mb-4">
          <Bell class="h-6 w-6 text-yellow-400" />
          <h2 class="text-lg font-semibold text-white">Setări Notificări</h2>
        </div>
        
        <div class="space-y-4">
          <!-- Push Notifications -->
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-md font-medium text-white/80">Notificări Push</h3>
              <p class="text-sm text-white/60">Primește notificări despre pauze</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" class="sr-only peer" checked />
              <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
            </label>
          </div>
          
          <!-- Break Reminders -->
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-md font-medium text-white/80">Memento Pauze</h3>
              <p class="text-sm text-white/60">Notificări pentru pauze regulate</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" class="sr-only peer" />
              <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
            </label>
          </div>
          
          <!-- Sound Notifications -->
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-md font-medium text-white/80">Sunete Notificări</h3>
              <p class="text-sm text-white/60">Activează sunete pentru notificări</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" class="sr-only peer" checked />
              <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
            </label>
          </div>
        </div>
      </div>

      <!-- Advanced Settings -->
      <div class="card-glass p-6">
        <div class="flex items-center gap-3 mb-4">
          <Settings class="h-6 w-6 text-indigo-400" />
          <h2 class="text-lg font-semibold text-white">Setări Avansate</h2>
        </div>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-white/80 mb-2">
              Interval de actualizare (secunde)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value="1"
              class="w-full rounded-lg border border-white/20 bg-white/20 px-4 py-3 text-white focus:border-indigo-400 focus:outline-none"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-white/80 mb-2">
              Limita de sesiuni în istoric
            </label>
            <input
              type="number"
              min="50"
              max="1000"
              value="500"
              class="w-full rounded-lg border border-white/20 bg-white/20 px-4 py-3 text-white focus:border-indigo-400 focus:outline-none"
            />
          </div>
          
          <div class="flex items-center justify-between">
            <span class="text-white/80">Mod întunecat permanent</span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
          
          <div class="flex items-center justify-between">
            <span class="text-white/80">Auto-save la fiecare minut</span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
          
          <div class="flex items-center justify-between">
            <span class="text-white/80">Vibrații la notificări</span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>
      </div>

      <!-- Performance Settings -->
      <div class="card-glass p-6">
        <div class="flex items-center gap-3 mb-4">
          <Zap class="h-6 w-6 text-yellow-400" />
          <h2 class="text-lg font-semibold text-white">Setări Performanță</h2>
        </div>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-white/80 mb-2">
              Calitatea animațiilor
            </label>
            <select class="w-full rounded-lg border border-white/20 bg-white/20 px-4 py-3 text-white focus:border-yellow-400 focus:outline-none">
              <option value="high">Înaltă (60fps)</option>
              <option value="medium" selected>Medie (30fps)</option>
              <option value="low">Scăzută (15fps)</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-white/80 mb-2">
              Cache pentru date (MB)
            </label>
            <input
              type="number"
              min="10"
              max="100"
              value="50"
              class="w-full rounded-lg border border-white/20 bg-white/20 px-4 py-3 text-white focus:border-yellow-400 focus:outline-none"
            />
          </div>
          
          <div class="flex items-center justify-between">
            <span class="text-white/80">Optimizare baterie</span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
            </label>
          </div>
        </div>
      </div>

      <!-- App Info -->
      <div class="card-glass p-6">
        <div class="text-center">
          <h3 class="text-lg font-semibold text-white mb-2">Time Tracker Pro</h3>
          <p class="text-white/70 text-sm">Versiunea 2.1.0</p>
          <p class="text-white/60 text-xs mt-2">Dezvoltat cu ❤️ pentru productivitate</p>
          <div class="mt-4 flex justify-center gap-4">
            <button @click="emit('navigate', 'changelog')" class="btn btn-glass btn-rounded px-4 py-2 text-xs">
              Changelog
            </button>
            <button class="btn btn-glass btn-rounded px-4 py-2 text-xs">
              Support
            </button>
            <button class="btn btn-glass btn-rounded px-4 py-2 text-xs">
              Rate App
            </button>
          </div>
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