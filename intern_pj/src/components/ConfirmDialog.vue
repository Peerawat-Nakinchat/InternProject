<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-9999 flex items-center justify-center 
               bg-black/40 backdrop-blur-sm"
      >
        <div
          class="relative w-full max-w-md bg-white rounded-2xl shadow-xl 
                 border border-gray-200 overflow-hidden animate-dialogPop"
        >
          <!-- Header -->
          <div
            class="flex items-center justify-between px-6 py-4
                   bg-linear-to-r from-[#1C244B] to-[#682DB5] text-white"
          >
            <h2 class="text-lg font-semibold">
              {{ title || "ยืนยันการทำรายการ" }}
            </h2>

            <!-- Close Button -->
            <button
              @click="close"
              :disabled="loading"
              class="text-white/70 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5"
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="px-6 py-6 text-center text-gray-700 leading-relaxed">
            <!-- Icon (Dynamic MDI) -->
            <div
              class="mx-auto w-16 h-16 rounded-full 
                     bg-[#682DB5]/10 text-[#682DB5] flex items-center justify-center mb-4"
            >
              <i
                :class="['mdi', icon]"
                class="text-4xl"
              ></i>
            </div>

            <p v-if="message">
              {{ message }}
            </p>

            <slot v-else></slot>
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
            <button
              @click="cancel"
              :disabled="loading"
              class="px-4 py-2 text-sm rounded-lg border bg-white hover:bg-gray-100
                     text-gray-700 transition"
            >
              {{ cancelText || "ยกเลิก" }}
            </button>

            <button
              @click="confirm"
              :disabled="loading"
              class="px-5 py-2 text-sm rounded-lg
                     bg-[#682DB5] hover:bg-[#5a1fa5]
                     text-white shadow-sm transition-all 
                     disabled:opacity-50"
            >
              <span v-if="!loading">{{ confirmText || "ยืนยัน" }}</span>
              <span v-else>กำลังดำเนินการ...</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { defineProps, defineEmits } from "vue";

defineProps({
  modelValue: Boolean,
  title: String,
  message: String,
  confirmText: String,
  cancelText: String,
  loading: Boolean,
  icon: {
    type: String
  },
});

const emit = defineEmits(["update:modelValue", "confirm", "cancel"]);

const close = () => emit("update:modelValue", false);
const confirm = () => emit("confirm");
const cancel = () => {
  emit("cancel");
  close();
};
</script>

<style scoped>
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.25s ease;
}
.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

@keyframes dialogPop {
  0% {
    transform: scale(0.92);
    opacity: 0;
  }
  60% {
    transform: scale(1.03);
    opacity: 1;
  }
  100% {
    transform: scale(1);
  }
}
.animate-dialogPop {
  animation: dialogPop 0.25s ease-out;
}
</style>