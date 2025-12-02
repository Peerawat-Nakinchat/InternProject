<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      >
        <div class="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden animate-dialogPop">
          
          <div class="flex items-center justify-between px-6 py-4 bg-linear-to-r from-[#1C244B] to-[#682DB5] text-white">
            <h2 class="text-lg font-semibold">{{ title || "ยืนยันการทำรายการ" }}</h2>
            <button 
              @click="close" 
              :disabled="isLoading" 
              class="text-white/70 hover:text-white transition-colors disabled:opacity-0"
            >
              <i class="mdi mdi-close text-xl"></i>
            </button>
          </div>

          <div class="px-6 py-6 text-center text-gray-700 leading-relaxed min-h-[180px] flex flex-col justify-center items-center">
            
            <div v-if="isLoading" class="animate-fade-in w-full flex justify-center">
              <LoadingMessage 
                :title="loadingTitle || 'กำลังดำเนินการ...'" 
                subtitle="กรุณารอสักครู่" 
              />
            </div>

            <div v-else class="w-full">
              <div class="mx-auto w-16 h-16 rounded-full bg-[#682DB5]/10 text-[#682DB5] flex items-center justify-center mb-4">
                <i :class="['mdi', icon || 'mdi-alert-circle-outline']" class="text-4xl"></i>
              </div>
              <p v-if="message" class="text-lg">{{ message }}</p>
              <slot v-else></slot>
            </div>

          </div>

          <div class="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
            <button
              @click="cancel"
              :disabled="isLoading"
              class="px-4 py-2 text-sm rounded-lg border bg-white hover:bg-gray-100 text-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ cancelText || "ยกเลิก" }}
            </button>

            <button
              @click="handleConfirm"
              :disabled="isLoading"
              class="px-5 py-2 text-sm rounded-lg bg-[#682DB5] hover:bg-[#5a1fa5] text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>{{ confirmText || "ยืนยัน" }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, defineProps, defineEmits, computed } from "vue";
// ✅ Import เข้ามาชื่อ LoadingMessage
import LoadingMessage from "./loading/LoadingMessage.vue";

const props = defineProps({
  modelValue: Boolean,
  title: String,
  message: String,
  confirmText: String,
  cancelText: String,
  icon: String,
  action: { type: Function, default: null },
  loadingTitle: { type: String, default: "กำลังประมวลผล..." }
});

const emit = defineEmits(["update:modelValue", "confirm", "cancel"]);

const internalLoading = ref(false);
const isLoading = computed(() => internalLoading.value);

const close = () => {
  if (!internalLoading.value) {
    emit("update:modelValue", false);
  }
};

const cancel = () => {
  if (!internalLoading.value) {
    emit("cancel");
    close();
  }
};

const handleConfirm = async () => {
  if (props.action) {
    try {
      internalLoading.value = true; 
      await props.action();         
      emit("confirm");              
      close();                      
    } catch (error) {
      console.error("Action failed:", error);
    } finally {
      internalLoading.value = false;
    }
  } else {
    emit("confirm");
  }
};
</script>

<style scoped>
.dialog-fade-enter-active, .dialog-fade-leave-active { transition: opacity 0.5s ease; }
.dialog-fade-enter-from, .dialog-fade-leave-to { opacity: 0; }

@keyframes dialogPop {
  0% { transform: scale(0.92); opacity: 0; }
  60% { transform: scale(1.03); opacity: 1; }
  100% { transform: scale(1); }
}
.animate-dialogPop { animation: dialogPop 0.5s ease-out; }

.animate-fade-in {
  animation: fadeIn 0.3s ease-in;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>