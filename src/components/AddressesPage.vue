<script setup lang="ts">
import { useLanguageStore } from '../stores/languageStore'
const language = useLanguageStore()
import { ref } from 'vue'
import { useTimerStore } from '../stores/timerStore'
import { ArrowLeft, Plus, Trash2, Edit3, MapPin } from 'lucide-vue-next'

const emit = defineEmits<{
  navigate: [page: string]
}>()

const timer = useTimerStore()
const showAddForm = ref(false)
const newAddress = ref('')
const newAddressName = ref('')
const editingAddress = ref<string | null>(null)

const addAddress = () => {
  if (newAddress.value.trim() && newAddressName.value.trim()) {
    timer.addExtraAddress(newAddressName.value, newAddress.value)
    newAddress.value = ''
    newAddressName.value = ''
    showAddForm.value = false
  }
}

const deleteAddress = (id: string) => {
  if (confirm(language.t('confirmDeleteAddress'))) {
    timer.deleteExtraAddress(id)
  }
}

const editAddress = (address: any) => {
  editingAddress.value = address.id
  newAddress.value = address.address
  newAddressName.value = address.name
  showAddForm.value = true
}

const saveEdit = () => {
  if (editingAddress.value && newAddress.value.trim() && newAddressName.value.trim()) {
    timer.updateExtraAddress(editingAddress.value, newAddressName.value, newAddress.value)
    editingAddress.value = null
    newAddress.value = ''
    newAddressName.value = ''
    showAddForm.value = false
  }
}

const cancelEdit = () => {
  editingAddress.value = null
  newAddress.value = ''
  newAddressName.value = ''
  showAddForm.value = false
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 p-4 safe-top">
    <div class="flex items-center justify-between mb-6 pt-4">
      <button @click="emit('navigate', 'main')" class="btn btn-primary p-3 rounded-full">
        <ArrowLeft class="h-5 w-5" />
      </button>
      <h1 class="text-2xl font-bold text-white">{{ language.t('addresses') }}</h1>
      <button 
        @click="showAddForm = true"
        class="btn btn-emerald p-3 rounded-full"
      >
        <Plus class="h-5 w-5" />
      </button>
    </div>

    <div v-if="showAddForm" class="card-glass p-6 mb-6">
      <h3 class="text-lg font-semibold text-white mb-4">
        {{ editingAddress ? language.t('editAddress') : language.t('addNewAddress') }}
      </h3>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-white/80 mb-2">
            {{ language.t('addressNameLabel') }}
          </label>
          <input
            v-model="newAddressName"
            :placeholder="language.t('addressNamePlaceholder')"
            class="w-full rounded-lg border border-white/20 bg-white/20 px-4 py-3 text-white placeholder-white/50 focus:border-blue-400 focus:outline-none"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-white/80 mb-2">
            {{ language.t('addressLabel') }}
          </label>
          <textarea
            v-model="newAddress"
            :placeholder="language.t('addressPlaceholder')"
            class="w-full rounded-lg border border-white/20 bg-white/20 px-4 py-3 text-white placeholder-white/50 focus:border-blue-400 focus:outline-none resize-none"
            rows="3"
          ></textarea>
        </div>
        
        <div class="flex gap-3">
          <button 
            @click="editingAddress ? saveEdit() : addAddress()"
            class="btn btn-primary flex-1"
          >
            {{ editingAddress ? language.t('save') : language.t('add') }}
          </button>
          <button 
            @click="cancelEdit"
            class="btn btn-rose flex-1"
          >
            {{ language.t('cancel') }}
          </button>
        </div>
      </div>
    </div>

    <div class="space-y-4">
      <div 
        v-for="address in timer.extraAddresses" 
        :key="address.id"
        class="card-glass p-5"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h4 class="font-semibold text-white mb-2">{{ address.name }}</h4>
            <p class="text-white/70 text-sm leading-relaxed">{{ address.address }}</p>
          </div>
          
          <div class="flex gap-2 ml-4">
            <button 
              @click="editAddress(address)"
              class="p-2 text-blue-400 hover:text-blue-300 rounded-lg hover:bg-white/10"
            >
              <Edit3 class="h-4 w-4" />
            </button>
            <button 
              @click="deleteAddress(address.id)"
              class="p-2 text-red-400 hover:text-red-300 rounded-lg hover:bg-white/10"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="timer.extraAddresses.length === 0" class="text-center py-12">
      <div class="text-white/50 mb-4">
        <MapPin class="h-16 w-16 mx-auto mb-4" />
        <p class="text-lg">{{ language.t('noSessions') }}</p>
        <p class="text-sm">{{ language.t('addresses') }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>