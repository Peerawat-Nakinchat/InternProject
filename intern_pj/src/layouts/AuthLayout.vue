<template>
  <div class=" flex items-center justify-center bg-primary-50 gap-6 p-4">
    <div class="flex-1  max-w-5xl mx-auto  bg-white rounded-lg shadow-xl">
      <div class="flex flex-col overflow-y-visible md:flex-row">
        <div class="h-32 md:h-auto md:w-1/2 overflow-hidden rounded-t-lg md:rounded-l-lg md:rounded-tr-none">
          <img
            aria-hidden="true"
            class="object-cover w-full h-full"
            :src="imageSrc"
            :alt="props.variant"
          />
        </div>
        <div class="hidden md:block w-px bg-neutral-300"></div>
        <div class="flex items-center justify-center p-6 sm:p-12 md:w-1/2 ">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  variant?: 'Login' | 'Regis' | 'Company' | 'Invite'
}>()

const imageSrc = computed(() => {
  switch (props.variant) {
    case 'Invite':
      return new URL('@/assets/images/Company.jpg', import.meta.url).href
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
