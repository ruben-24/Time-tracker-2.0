<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useTimerStore } from '../stores/timerStore'
import { useFinancialStore } from '../stores/financialStore'
import { useThemeStore } from '../stores/themeStore'
import { useLanguageStore, type Language } from '../stores/languageStore'
import { ArrowLeft, Settings, Clock, MapPin, Bell, Trash2, Palette, Brush, Sparkles, Eye, Zap } from 'lucide-vue-next'

const emit = defineEmits<{
  navigate: [page: string]
}>()
defineProps<{ appVersion: string }>()

const timer = useTimerStore()
const financial = useFinancialStore()
const theme = useThemeStore()
const language = useLanguageStore()

const showDeleteConfirm = ref(false)
const selectedLanguage = ref<Language>('ro')

const notificationsEnabled = ref(true)
const breakReminders = ref(true)
const workReminders = ref(false)

const autoStartBreak = ref(false)
const breakDuration = ref(15)
const workSessionGoal = ref(8)

const hourlyRate = ref(financial.hourlyRate)
const weeklyHours = ref(financial.weeklyHours)
const taxClass = ref(financial.taxClass)

const defaultAddress = ref(timer.defaultAddress)

const customBackgroundColor = ref(theme.settings.backgroundColors.primary)
const customButtonColor = ref(theme.settings.buttonColors.primary)

const selectedBgPreset = ref<string>('')
const selectedBtnPreset = ref<string>('')

const syncSelectedPresets = () => {
  const bg = theme.backgroundPresets.find(p =>
    p.colors.primary === theme.settings.backgroundColors.primary &&
    p.colors.secondary === theme.settings.backgroundColors.secondary &&
    p.colors.accent === theme.settings.backgroundColors.accent &&
    p.style === (theme.settings.backgroundStyle as any)
  )
  selectedBgPreset.value = bg ? bg.name : ''

  const bp = theme.buttonPresets.find(p =>
    p.colors.primary === theme.settings.buttonColors.primary &&
    p.colors.secondary === theme.settings.buttonColors.secondary &&
    p.colors.accent === theme.settings.buttonColors.accent &&
    p.style === (theme.settings.buttonStyle as any)
  )
  selectedBtnPreset.value = bp ? bp.name : ''
}

onMounted(async () => {
  theme.load()
  await language.loadLanguage()
  selectedLanguage.value = language.currentLanguage
  syncSelectedPresets()
  
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
  if (newValue < 0) {
    hourlyRate.value = 0
    return
  }
  if (newValue > 1000) {
    hourlyRate.value = 1000
    return
  }
  
  financial.updateSettings({
    hourlyRate: newValue,
    weeklyHours: financial.weeklyHours,
    taxClass: financial.taxClass
  })
})

watch(weeklyHours, (newValue) => {
  if (newValue < 1) {
    weeklyHours.value = 1
    return
  }
  if (newValue > 80) {
    weeklyHours.value = 80
    return
  }
  
  financial.updateSettings({
    hourlyRate: financial.hourlyRate,
    weeklyHours: newValue,
    taxClass: financial.taxClass
  })
})

watch(taxClass, (newValue) => {
  if (newValue < 1) {
    taxClass.value = 1
    return
  }
  if (newValue > 6) {
    taxClass.value = 6
    return
  }
  
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

watch(selectedLanguage, (newLang) => {
  language.setLanguage(newLang)
})

const updateDefaultAddress = () => {
  timer.defaultAddress = defaultAddress.value
  timer.persist()
}

const deleteAllData = () => {
  if (confirm(language.t('warning') + ': ' + language.t('changelog'))) {
    timer.sessions = []
    timer.extraAddresses = []
    timer.selectedAddressId = null
    timer.persist()
    showDeleteConfirm.value = false
    alert(language.t('success'))
  }
}

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
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 p-4 safe-top">
    <div class="flex items-center justify-between mb-6 pt-4">
      <button @click="emit('navigate', 'main')" class="btn btn-primary p-3 rounded-full">
        <ArrowLeft class="h-5 w-5" />
      </button>
      <h1 class="text-2xl font-bold text-white">{{ language.t('settings') }}</h1>
      <div></div>
    </div>

    <div class="space-y-6">
      <div class="card-glass p-6">
        <div class="flex items-center gap-3 mb-4">
          <Settings class="h-6 w-6 text-cyan-400" />
          <h2 class="text-lg font-semibold text-white">{{ language.t('language') }}</h2>
        </div>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-white/80 mb-2">{{ language.t('language') }}</label>
            <select 
              v-model="selectedLanguage"
              class="w-full rounded-lg border border-white/20 bg-white/20 px-4 py-3 text-white focus:border-cyan-400 focus:outline-none"
            >
              <option value="ro">{{ language.t('romanian') }}</option>
              <option value="en">{{ language.t('english') }}</option>
              <option value="de">{{ language.t('german') }}</option>
            </select>
          </div>
        </div>
      </div>

      <div class="card-glass p-6">
        <div class="flex items-center gap-3 mb-4">
          <Palette class="h-6 w-6 text-pink-400" />
          <h2 class="text-lg font-semibold text-white">{{ language.t('theme') }}</h2>
        </div>
        
        <div class="space-y-6">
          <div>
            <h3 class="text-md font-medium text-white/80 mb-3 flex items-center gap-2">
              <Eye class="h-4 w-4" />
              {{ language.t('presetBackground') }}
            </h3>
            <select
              v-model="selectedBgPreset"
              @change="() => { const p = theme.backgroundPresets.find(x => x.name === selectedBgPreset); if (p) applyBackgroundPreset(p) }"
              class="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white focus:border-pink-400 focus:outline-none"
            >
              <option value="" disabled>{{ language.t('selectPreset') }}</option>
              <option v-for="preset in theme.backgroundPresets" :key="preset.name" :value="preset.name">
                {{ preset.name }}
              </option>
            </select>
          </div>

          <div>
            <h3 class="text-md font-medium text-white/80 mb-3 flex items-center gap-2">
              <Brush class="h-4 w-4" />
              {{ language.t('presetButtons') }}
            </h3>
            <select
              v-model="selectedBtnPreset"
              @change="() => { const p = theme.buttonPresets.find(x => x.name === selectedBtnPreset); if (p) applyButtonPreset(p) }"
              class="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white focus:border-cyan-400 focus:outline-none"
            >
              <option value="" disabled>{{ language.t('selectPreset') }}</option>
              <option v-for="preset in theme.buttonPresets" :key="preset.name" :value="preset.name">
                {{ preset.name }}
              </option>
            </select>
          </div>

          <div>
            <h3 class="text-md font-medium text-white/80 mb-3 flex items-center gap-2">
              <Sparkles class="h-4 w-4" />
              {{ language.t('customColors') }}
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-white/70 mb-2">{{ language.t('backgroundColorLabel') }}</label>
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
                <label class="block text-sm text-white/70 mb-2">{{ language.t('buttonColorLabel') }}</label>
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

          <div>
            <h3 class="text-md font-medium text-white/80 mb-3 flex items-center gap-2">
              <Zap class="h-4 w-4" />
              {{ language.t('visualEffects') }}
            </h3>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-white/80">{{ language.t('animationsLabel') }}</span>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    v-model="theme.settings.animations"
                    @change="theme.updateSettings({ animations: theme.settings.animations })"
                    type="checkbox"
                    class="sr-only peer"
                  />
                  <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div class="flex items-center justify-between">
                <span class="text-white/80">{{ language.t('particlesLabel') }}</span>
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
                <span class="text-white/80">{{ language.t('glassEffectLabel') }}</span>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    v-model="theme.settings.glassEffect"
                    @change="theme.updateSettings({ glassEffect: theme.settings.glassEffect })"
                    type="checkbox"
                    class="sr-only peer"
                  />
                  <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
            </div>
          </div>

          <div class="pt-4 border-t border-white/20">
            <button
              @click="resetTheme"
              class="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-red-500/20 border border-red-400/50 text-red-400 hover:bg-red-500/30 transition-colors"
            >
              <Settings class="h-4 w-4" />
              <span>{{ language.t('resetToDefaults') }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="card-glass p-6">
        <div class="flex items-center gap-3 mb-4">
          <Clock class="h-6 w-6 text-blue-400" />
          <h2 class="text-lg font-semibold text-white">{{ language.t('timerSettingsTitle') }}</h2>
        </div>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-white/80 mb-2">
              {{ language.t('breakDurationLabel') }}
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
              {{ language.t('workSessionGoalLabel') }}
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
            <span class="text-white/80">{{ language.t('autoStartBreak') }}</span>
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

      <div class="card-glass p-6">
        <div class="flex items-center gap-3 mb-4">
          <MapPin class="h-6 w-6 text-orange-400" />
          <h2 class="text-lg font-semibold text-white">{{ language.t('addresses') }}</h2>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-white/80 mb-2">
            {{ language.t('defaultAddressLabel') }}
          </label>
          <textarea
            v-model="defaultAddress"
            @blur="updateDefaultAddress"
            :placeholder="language.t('defaultAddressPlaceholder')"
            class="w-full rounded-lg border border-white/20 bg-white/20 px-4 py-3 text-white placeholder-white/50 focus:border-orange-400 focus:outline-none resize-none"
            rows="3"
          ></textarea>
        </div>
      </div>

      <div class="card-glass p-6">
        <div class="flex items-center gap-3 mb-4">
          <Bell class="h-6 w-6 text-purple-400" />
          <h2 class="text-lg font-semibold text-white">{{ language.t('notifications') }}</h2>
        </div>
        
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-white/80">{{ language.t('notifications') }}</span>
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
            <span class="text-white/80">{{ language.t('breakReminders') }}</span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                v-model="breakReminders"
                type="checkbox"
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
            </label>
          </div>
          
          <div class="flex items-center justify-between">
            <span class="text-white/80">{{ language.t('workReminders') }}</span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                v-model="workReminders"
                type="checkbox"
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div class="card-glass p-6">
        <div class="flex items-center gap-3 mb-4">
          <Settings class="h-6 w-6 text-gray-400" />
          <h2 class="text-lg font-semibold text-white">{{ language.t('importExport') }}</h2>
        </div>
        
        <div class="space-y-3">
          <button
            @click="showDeleteConfirm = true"
            class="w-full flex items-center gap-3 p-3 rounded-lg bg-red-500/20 border border-red-400/50 text-red-400 hover:bg-red-500/30 transition-colors"
          >
            <Trash2 class="h-5 w-5" />
            <span>{{ language.t('deleteAllDataButton') }}</span>
          </button>
        </div>
      </div>

      <div class="card-glass p-6">
        <div class="text-center">
          <h3 class="text-lg font-semibold text-white mb-2">ChronoFlux</h3>
          <p class="text-white/70 text-sm">{{ language.t('version') }}: {{ appVersion }}</p>
          <p class="text-white/60 text-xs mt-2">{{ language.t('developedWith') }}</p>
          <div class="mt-4 flex justify-center gap-4">
            <button @click="emit('navigate', 'changelog')" class="btn btn-glass btn-rounded px-4 py-2 text-xs">
              {{ language.t('changelog') }}
            </button>
            <button class="btn btn-glass btn-rounded px-4 py-2 text-xs">
              {{ language.t('supportButton') }}
            </button>
            <button class="btn btn-glass btn-rounded px-4 py-2 text-xs">
              {{ language.t('rateAppButton') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="card-glass p-6 max-w-sm w-full">
        <h3 class="text-lg font-semibold text-white mb-4">{{ language.t('deleteAllData') }}</h3>
        <p class="text-white/70 text-sm mb-6">
          {{ language.t('deleteAllDataConfirmationText') }}
        </p>
        <div class="flex gap-3">
          <button
            @click="deleteAllData"
            class="btn btn-rose flex-1"
          >
            {{ language.t('deleteEverythingButton') }}
          </button>
          <button
            @click="showDeleteConfirm = false"
            class="btn btn-primary flex-1"
          >
            {{ language.t('cancelButton') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>