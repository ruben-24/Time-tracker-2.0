<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useTimerStore } from '../stores/timerStore'
import { MapPin, ChevronDown } from 'lucide-vue-next'

const timer = useTimerStore()
const isOpen = ref(false)
const dropdownRef = ref<HTMLElement>()

const allAddresses = computed(() => {
  const addresses = [
    { id: 'default', name: 'Adresa Default', address: timer.defaultAddress }
  ]
  
  if (timer.customAddress) {
    addresses.push({ id: 'custom', name: 'Adresa Personalizată', address: timer.customAddress })
  }
  
  addresses.push(...timer.extraAddresses)
  
  return addresses
})

const selectedAddress = computed(() => {
  if (timer.selectedAddressId) {
    return allAddresses.value.find(addr => addr.id === timer.selectedAddressId)
  }
  return allAddresses.value[0] // Default address
})

const selectAddress = (addressId: string | null) => {
  timer.selectAddress(addressId)
  isOpen.value = false
}

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="relative" ref="dropdownRef">
    <div 
      @click="toggleDropdown"
      class="flex items-center gap-2 p-3 rounded-lg bg-white/10 border border-white/20 cursor-pointer hover:bg-white/15 transition-colors"
    >
      <MapPin class="h-4 w-4 text-blue-400 flex-shrink-0" />
      <div class="flex-1 min-w-0">
        <div class="text-xs text-white/70 font-medium">Adresa curentă</div>
        <div class="text-sm text-white truncate">{{ selectedAddress?.name || 'Adresa Default' }}</div>
        <div class="text-xs text-white/60 truncate">{{ selectedAddress?.address }}</div>
      </div>
      <ChevronDown 
        :class="['h-4 w-4 text-white/60 flex-shrink-0 transition-transform', isOpen ? 'rotate-180' : '']" 
      />
    </div>
    
    <!-- Dropdown -->
    <div 
      v-if="isOpen"
      class="absolute top-full left-0 right-0 mt-1 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-white/20 z-50 max-h-60 overflow-y-auto"
    >
      <div class="p-2">
        <div 
          v-for="address in allAddresses" 
          :key="address.id"
          @click="selectAddress(address.id)"
          :class="[
            'p-3 rounded-lg cursor-pointer transition-colors',
            selectedAddress?.id === address.id 
              ? 'bg-blue-500/20 border border-blue-400/50' 
              : 'hover:bg-white/20'
          ]"
        >
          <div class="font-medium text-gray-800">{{ address.name }}</div>
          <div class="text-sm text-gray-600 truncate">{{ address.address }}</div>
        </div>
        
        <div class="border-t border-gray-200 my-2"></div>
        
        <div 
          @click="selectAddress(null)"
          :class="[
            'p-3 rounded-lg cursor-pointer transition-colors',
            !timer.selectedAddressId 
              ? 'bg-blue-500/20 border border-blue-400/50' 
              : 'hover:bg-white/20'
          ]"
        >
          <div class="font-medium text-gray-800">Adresa Default</div>
          <div class="text-sm text-gray-600">{{ timer.defaultAddress }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Additional styles if needed */
</style>