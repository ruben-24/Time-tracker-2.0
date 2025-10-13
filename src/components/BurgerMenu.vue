<script setup lang="ts">
import { ref } from 'vue'
import { Menu, X, MapPin, History, Download, Settings, DollarSign, Power, Plus } from 'lucide-vue-next'

const emit = defineEmits<{
  navigate: [page: string]
}>()

const isOpen = ref(false)

const toggleMenu = () => {
  isOpen.value = !isOpen.value
}

const closeMenu = () => {
  isOpen.value = false
}

const navigateTo = (page: string) => {
  emit('navigate', page)
  closeMenu()
}

const closeApp = () => {
  if (confirm('Sigur vrei să închizi aplicația?')) {
    // In a real app, this would close the app
    window.close()
  }
  closeMenu()
}

const menuItems = [
  { icon: Plus, label: 'Adăugare Manuală', page: 'manual' },
  { icon: History, label: 'Istoric Sesiuni', page: 'history' },
  { icon: MapPin, label: 'Adrese Extra', page: 'addresses' },
  { icon: DollarSign, label: 'Rapoarte Financiare', page: 'financial' },
  { icon: Download, label: 'Import/Export', page: 'import-export' },
  { icon: Settings, label: 'Setări', page: 'settings' },
]
</script>

<template>
  <div class="relative">
    <!-- Burger Button -->
    <button 
      @click="toggleMenu"
      class="btn btn-primary p-3 rounded-full"
    >
      <Menu v-if="!isOpen" class="h-6 w-6" />
      <X v-else class="h-6 w-6" />
    </button>

    <!-- Overlay -->
    <div 
      v-if="isOpen" 
      @click="closeMenu"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
    ></div>

    <!-- Menu Panel -->
    <div 
      v-if="isOpen"
      class="fixed top-0 right-0 h-full w-80 bg-white/20 backdrop-blur-xl border-l border-white/30 z-50 transform transition-transform duration-300 ease-in-out"
    >
      <div class="p-6">
        <!-- Header -->
        <div class="flex items-center justify-between mb-8">
          <h2 class="text-xl font-bold text-white">Meniu</h2>
          <button @click="closeMenu" class="text-white/70 hover:text-white">
            <X class="h-6 w-6" />
          </button>
        </div>

        <!-- Menu Items -->
        <nav class="space-y-4">
          <button
            v-for="item in menuItems"
            :key="item.page"
            @click="navigateTo(item.page)"
            class="w-full flex items-center gap-4 p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200 text-white"
          >
            <component :is="item.icon" class="h-6 w-6" />
            <span class="font-medium">{{ item.label }}</span>
          </button>
        </nav>

        <!-- Close App Button -->
        <div class="mt-8 pt-6 border-t border-white/20">
          <button
            @click="closeApp"
            class="w-full flex items-center gap-4 p-4 rounded-xl bg-red-500/20 hover:bg-red-500/30 transition-all duration-200 text-red-400 border border-red-400/50"
          >
            <Power class="h-6 w-6" />
            <span class="font-medium">Închide Aplicația</span>
          </button>
          
          <p class="text-white/60 text-sm text-center mt-4">
            Time Tracker Pro v2.2.0
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Additional styles if needed */
</style>