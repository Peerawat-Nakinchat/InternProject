<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
    <div class="max-w-4xl mx-auto">
      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center h-64">
        <div class="text-center">
          <div
            class="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"
          ></div>
          <p class="text-slate-500">กำลังโหลดข้อมูล...</p>
        </div>
      </div>

      <!-- Main Card -->
      <div v-else class="bg-white rounded-2xl shadow-xl overflow-hidden">
        <!-- Card Header with Gradient -->
        <div class="bg-gradient-to-r from-[#1C244B] to-[#682DB5] px-8 py-6">
          <div class="flex items-center gap-4">
            <!-- Back Button -->
            <button
              @click="$emit('back')"
              class="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-all duration-200"
            >
              <i class="mdi mdi-arrow-left text-xl text-white"></i>
            </button>
            <div class="flex-1">
              <h2 class="text-xl font-bold text-white">{{ title }}</h2>
              <p v-if="subtitle" class="text-purple-200 text-sm">{{ subtitle }}</p>
            </div>
            <!-- Submit Button -->
            <button
              v-if="!viewMode"
              type="button"
              :disabled="saving || disabled"
              @click="$emit('submit')"
              class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 text-white font-medium hover:from-purple-500 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-purple-500/30 flex items-center gap-2"
            >
              <i v-if="saving" class="mdi mdi-loading mdi-spin"></i>
              <i v-else :class="submitIcon"></i>
              {{ saving ? 'กำลังบันทึก...' : submitText }}
            </button>
          </div>
        </div>

        <!-- Form Content -->
        <form @submit.prevent="$emit('submit')" class="p-8 space-y-6">
          <slot></slot>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Props
interface Props {
  title: string
  subtitle?: string
  loading?: boolean
  saving?: boolean
  disabled?: boolean
  viewMode?: boolean
  submitText?: string
  submitIcon?: string
}

withDefaults(defineProps<Props>(), {
  subtitle: '',
  loading: false,
  saving: false,
  disabled: false,
  viewMode: false,
  submitText: 'บันทึก',
  submitIcon: 'mdi mdi-content-save',
})

// Emits
defineEmits<{
  (e: 'back'): void
  (e: 'submit'): void
}>()
</script>
