<template>
  <div class="grid gap-6" :class="gridClasses">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  cols?: 1 | 2 | 3 | 4
}

const props = withDefaults(defineProps<Props>(), {
  cols: 2,
})

const gridClasses = computed(() => {
  const colsMap = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }
  return colsMap[props.cols]
})
</script>
