<template>
  <div class="space-y-2">
    <label v-if="label" class="block text-sm font-semibold text-slate-700">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <div class="relative">
      <textarea
        :value="modelValue"
        :disabled="disabled"
        :placeholder="placeholder"
        :rows="rows"
        :class="textareaClasses"
        @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
        @blur="$emit('blur')"
      ></textarea>
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
  modelValue: string
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  rows?: number
  error?: string
  hint?: string
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  placeholder: '',
  required: false,
  disabled: false,
  rows: 4,
  error: '',
  hint: '',
})

defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'blur'): void
}>()

const textareaClasses = computed(() => {
  const base = 'w-full px-4 py-3 rounded-xl transition-all duration-200 min-h-[120px] resize-none'

  if (props.disabled) {
    return `${base} bg-slate-50 border border-slate-200 text-slate-600 cursor-not-allowed`
  }

  if (props.error) {
    return `${base} bg-white border border-red-500 text-slate-800 focus:ring-2 focus:ring-red-500 focus:border-transparent`
  }

  return `${base} bg-white border border-slate-200 text-slate-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent hover:border-slate-300`
})
</script>
