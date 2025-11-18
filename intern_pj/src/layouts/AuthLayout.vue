<template>
  <div class="min-h-screen flex items-center justify-center bg-primary-50">
    <div class="flex-1 h-full max-w-5xl mx-auto overflow-hidden bg-white rounded-lg shadow-xl">
      <div class="flex flex-col overflow-y-auto md:flex-row">
        <div class="h-32 md:h-auto md:w-1/2">
          <img
            aria-hidden="true"
            class="object-cover w-full h-full"
            :src="imageSrc"
            :alt="props.variant"
          />
        </div>
        <div class="hidden md:block w-px bg-neutral-300"></div>
        <div class="flex items-center justify-center p-6 sm:p-12 md:w-1/2">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  variant?: 'Login' | 'Regis' | 'Company'
}>()

const imageSrc = computed(() => {
  switch (props.variant) {
    case 'Company':
      return new URL('@/assets/images/Company2.jpg', import.meta.url).href
    case 'Regis':
      return new URL('@/assets/images/LoginERP.png', import.meta.url).href
    case 'Login':
    default:
      return new URL('@/assets/images/LoginERP.png', import.meta.url).href
  }
})
</script>
