<script setup lang="ts">
import { ref, watch } from 'vue'
import { useTimerStore } from '../stores/timerStore'
import { useLanguageStore } from '../stores/languageStore'

const timer = useTimerStore()
const language = useLanguageStore()
const custom = ref<string>(timer.customAddress ?? '')
const showCustomSection = ref<boolean>(!!timer.customAddress)

watch(custom, (v) => {
  timer.setCustomAddress(v)
})

const addCustomAddress = () => {
  showCustomSection.value = true
}

const removeCustomAddress = () => {
  timer.setCustomAddress(null)
  custom.value = ''
  showCustomSection.value = false
}

const useDefaultAddress = () => {
  timer.setCustomAddress(null)
  custom.value = ''
  showCustomSection.value = false
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <label class="mb-2 block text-sm font-medium text-white/80">{{ language.t('standardAddress') }}</label>
      <input disabled :value="timer.defaultAddress" class="w-full cursor-not-allowed rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white/70" />
    </div>
    
    <div v-if="!showCustomSection" class="text-center">
      <button @click="addCustomAddress" class="btn btn-emerald text-sm">
        <i class="fas fa-plus mr-2"></i>
        {{ language.t('addCustomAddress') }}
      </button>
    </div>
    
    <div v-if="showCustomSection" class="glass-enhanced rounded-xl p-4 space-y-3">
      <div class="flex items-center justify-between">
        <label class="text-sm font-medium text-white">{{ language.t('customAddress') }}</label>
        <div class="flex gap-2">
          <button @click="useDefaultAddress" class="text-blue-400 hover:text-blue-300 text-sm">
            <i class="fas fa-undo mr-1"></i>{{ language.t('default') }}
          </button>
          <button @click="removeCustomAddress" class="text-red-400 hover:text-red-300 text-sm">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      <input 
        v-model="custom" 
        :placeholder="language.t('customAddressPlaceholder')" 
        class="w-full rounded-lg border border-white/20 bg-white/20 px-3 py-2 text-white placeholder-white/50 focus:border-blue-400 focus:outline-none" 
      />
      <p class="text-xs text-white/60">{{ language.t('customAddressNotice') }}</p>
    </div>
  </div>
</template>