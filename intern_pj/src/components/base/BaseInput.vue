<template>
  <div class="space-y-1">
    <label v-if="label" class="block text-xs font-medium text-neutral-700">
      {{ label }}
    </label>

    <input
      v-bind="$attrs"
      :type="type"
      v-model="innerValue"
      class="w-full rounded-md border px-3 py-2 text-sm border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 placeholder:text-slate-400"
    />
    <p v-if="error" class="text-xs text-red-500">
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue?: string
  label?: string
  error?: string | null
  type?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const innerValue = computed({
  get: () => props.modelValue ?? '',
  set: (val: string) => emit('update:modelValue', val),
})
</script>
