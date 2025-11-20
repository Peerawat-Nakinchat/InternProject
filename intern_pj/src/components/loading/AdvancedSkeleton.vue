<template>
  <div class="space-y-2 animate-pulse">
    <div
      v-for="(row, index) in rows"
      :key="index"
      :class="row.class"
      :style="{ width: row.width, height: row.height }"
    ></div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  rows: {
    type: Array as () => { width: string; height: string; class: string }[],
    required: true,
  },
})
</script>
