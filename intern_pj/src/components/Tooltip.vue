<template>
  <div class="relative group inline-block">
    <slot />

    <div
      :class="[
        'absolute top-1/2 -translate-y-1/2 left-full bg-[#682DB5] text-white text-sm rounded-r-sm shadow-lg py-3 text-center whitespace-nowrap z-50',
        'opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-150',
        rail ? 'w-64' : 'w-64'
      ]"
    >
      {{ text }}
    </div>
  </div>
</template>

<script setup>
defineProps({
  text: {
    type: String,
    required: true,
  },
  rail: {
    type: Boolean,
    default: true,
  },
})
</script>
