<script setup lang="ts">
import { ref, watch } from 'vue'
import { useTimerStore } from '../stores/timerStore'

const timer = useTimerStore()
const custom = ref<string>(timer.customAddress ?? '')
const showCustomSection = ref<boolean>(!!timer.customAddress)

// const hasCustomAddress = computed(() => !!timer.customAddress)

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
</script>

<template>
  <div class="space-y-4">
    <div>
      <label class="mb-2 block text-sm font-medium text-white/80">Adresa standard</label>
      <input disabled :value="timer.defaultAddress" class="w-full cursor-not-allowed rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white/70" />
    </div>
    
    <div v-if="!showCustomSection" class="text-center">
      <button @click="addCustomAddress" class="btn btn-emerald text-sm">
        <i class="fas fa-plus mr-2"></i>
        Adaugă adresă personalizată
      </button>
    </div>
    
    <div v-if="showCustomSection" class="glass-enhanced rounded-xl p-4 space-y-3">
      <div class="flex items-center justify-between">
        <label class="text-sm font-medium text-white">Adresa personalizată</label>
        <button @click="removeCustomAddress" class="text-red-400 hover:text-red-300 text-sm">
          <i class="fas fa-trash"></i>
        </button>
      </div>
      <input 
        v-model="custom" 
        placeholder="Introduceți o adresă personalizată..." 
        class="w-full rounded-lg border border-white/20 bg-white/20 px-3 py-2 text-white placeholder-white/50 focus:border-blue-400 focus:outline-none" 
      />
      <p class="text-xs text-white/60">Această adresă va fi folosită pentru sesiunile noi</p>
    </div>
  </div>
</template>
