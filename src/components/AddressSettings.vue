<script setup lang="ts">
import { ref, watch } from 'vue'
import { useTimerStore } from '../stores/timerStore'

const timer = useTimerStore()
const custom = ref<string>(timer.customAddress ?? '')

watch(custom, (v) => {
  timer.setCustomAddress(v)
})
</script>

<template>
  <div class="space-y-3">
    <div>
      <label class="mb-1 block text-sm font-medium">Adresa standard</label>
      <input disabled :value="timer.defaultAddress" class="w-full cursor-not-allowed rounded-lg border bg-gray-50 px-3 py-2" />
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium">Adresa personalizată</label>
      <input v-model="custom" placeholder="Introduceți o adresă" class="w-full rounded-lg border px-3 py-2" />
    </div>
  </div>
</template>
