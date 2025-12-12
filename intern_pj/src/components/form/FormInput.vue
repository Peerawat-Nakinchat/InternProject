<template>
  <div class="space-y-2">
    <label v-if="label" class="block text-sm font-semibold text-slate-700">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <div class="relative">
      <input
        :value="modelValue"
        :type="type"
        :disabled="disabled"
        :placeholder="placeholder"
        :maxlength="maxlength"
        :class="inputClasses"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @blur="$emit('blur')"
      />
      <i
        v-if="icon"
        :class="[icon, iconClasses]"
        class="absolute right-3 top-1/2 -translate-y-1/2"
      ></i>
      <i
        v-if="loading"
        class="mdi mdi-loading mdi-spin absolute right-3 top-1/2 -translate-y-1/2 text-purple-500"
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

interface Props {
  modelValue: string | number
  label?: string
  type?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  maxlength?: number
  icon?: string
  error?: string
  hint?: string
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  type: 'text',
  placeholder: '',
  required: false,
  disabled: false,
  maxlength: undefined,
  icon: '',
  error: '',
  hint: '',
  loading: false,
})

defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'blur'): void
}>()

const inputClasses = computed(() => {
  const base = 'w-full px-4 py-3 rounded-xl transition-all duration-200'

  if (props.disabled) {
    return `${base} bg-slate-50 border border-slate-200 text-slate-600 cursor-not-allowed`
  }

  if (props.error) {
    return `${base} bg-white border border-red-500 text-slate-800 focus:ring-2 focus:ring-red-500 focus:border-transparent`
  }

  return `${base} bg-white border border-slate-200 text-slate-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent hover:border-slate-300`
})

const iconClasses = computed(() => {
  if (props.error) return 'text-red-500'
  return 'text-slate-400'
})
</script>
