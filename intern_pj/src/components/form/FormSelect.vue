<template>
  <div class="space-y-2">
    <label v-if="label" class="block text-sm font-semibold text-slate-700">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <div class="relative">
      <select
        :value="modelValue"
        :disabled="disabled"
        :class="selectClasses"
        @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option v-for="opt in options" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <i
        class="mdi mdi-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      ></i>
    </div>
    <p v-if="error" class="text-red-500 text-xs flex items-center gap-1">
      <i class="mdi mdi-alert-circle"></i>
      {{ error }}
    </p>
    <p v-if="hint && !error" class="text-slate-400 text-xs">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface SelectOption {
  value: string | number
  label: string
}

interface Props {
  modelValue: string | number
  options: SelectOption[]
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  hint?: string
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  placeholder: '',
  required: false,
  disabled: false,
  error: '',
  hint: '',
})

defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const selectClasses = computed(() => {
  const base =
    'w-full px-4 py-3 rounded-xl transition-all duration-200 appearance-none cursor-pointer'

  if (props.disabled) {
    return `${base} bg-slate-50 border border-slate-200 text-slate-600 cursor-not-allowed`
  }

  if (props.error) {
    return `${base} bg-white border border-red-500 text-slate-800 focus:ring-2 focus:ring-red-500 focus:border-transparent`
  }

  return `${base} bg-white border border-slate-200 text-slate-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent hover:border-slate-300`
})
</script>
