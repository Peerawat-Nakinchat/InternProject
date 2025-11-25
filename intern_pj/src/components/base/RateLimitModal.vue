// src/components/base/RateLimitModal.vue
<template>
  <Teleport to="body">
    <transition name="fade-overlay">
      <div
        v-show="show"
        class="fixed inset-0 w-full h-full bg-black/50 backdrop-blur-sm flex items-center justify-center z-9999"
        @click.self="close"
      >
        <transition name="fade-modal-up">
          <div
            v-if="show"
            class="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center text-center"
          >
            <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <i class="mdi mdi-alert-circle-outline text-4xl text-red-600"></i>
            </div>
            <h3 class="text-2xl font-bold text-white mb-2">Rate limit exceeded</h3>
            <p class="text-white mb-6">คุณส่งคำขอมากเกินไป โปรดลองอีกครั้ง{{ minutesMessage }}.</p>
            <button
              @click="close"
              class="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </transition>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{ minutes?: number }>()
const emit = defineEmits(['close'])

const show = ref(true)

const minutesMessage = computed(() => {
  if (props.minutes && props.minutes > 0) {
    const mins = Math.ceil(props.minutes / 60)
    return ` in ${mins} minute${mins > 1 ? 's' : ''}`
  }
  return ''
})

const close = () => {
  show.value = false
  emit('close')
}

watch(
  () => props.minutes,
  () => {
    // reset visibility when minutes prop changes
    show.value = true
  },
)
</script>

<style scoped>
/* Overlay Fade */
.fade-overlay-enter-active,
.fade-overlay-leave-active {
  transition: opacity 0.3s ease;
}
.fade-overlay-enter-from,
.fade-overlay-leave-to {
  opacity: 0;
}
/* Modal Fade Up */
.fade-modal-up-enter-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}
.fade-modal-up-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}
.fade-modal-up-enter-from,
.fade-modal-up-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.98);
}
</style>
