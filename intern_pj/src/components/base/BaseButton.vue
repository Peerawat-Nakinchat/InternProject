<template>
  <button
    v-bind="$attrs"
    :class="[
      'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed',
      variantClass,
      $attrs.class || '',
    ]"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  variant?: 'primary' | 'ghost'
}>()

const variantClass = computed(() => {
  switch (props.variant) {
    case 'ghost':
      return 'border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 focus:ring-slate-400'
    case 'primary':
    default:
      return 'bg-sky-600 text-white hover:bg-sky-700 focus:ring-sky-500'
  }
})
</script>
