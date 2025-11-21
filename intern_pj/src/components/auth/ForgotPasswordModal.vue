<template>
  <!-- Overlay -->
  <div
    v-if="open"
    class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
    @click.self="close"
  >
    <!-- Modal -->
    <div class="relative w-full max-w-md rounded-2xl bg-white backdrop-blur-lg border border-white/30 shadow-xl animate-fadeIn overflow-hidden">
      
      <!-- Header -->
      <div class="flex justify-between items-center px-6 py-4 bg-linear-to-r from-purple-600 to-purple-400 text-white">
        <h2 class="text-xl font-semibold flex items-center gap-2">
          <i class="mdi mdi-lock-alert-outline text-2xl text-white"></i>
          ลืมรหัสผ่าน
        </h2>

        <button @click="close" class="text-white hover:text-red-700 transition-all">
          ✕
        </button>
      </div>

      <!-- Body -->
      <div class="px-6 py-5">
        <p class="text-sm text-gray-800 mb-4">
          กรุณากรอกอีเมลที่ใช้ลงทะเบียน ระบบจะส่งลิงก์สำหรับเปลี่ยนรหัสผ่านให้คุณ
        </p>

        <!-- Input -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-900 mb-1">อีเมล</label>
          <input
            v-model="email"
            type="email"
            placeholder="example@mail.com"
            :disabled="loading"
            class="w-full px-4 py-2 rounded-md border border-gray-400 bg-white/30 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <!-- Alerts -->
        <div v-if="message" class="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm mb-2 flex items-start gap-2">
          <i class="mdi mdi-check-circle text-lg mt-0.5"></i>
          <span>{{ message }}</span>
        </div>
        
        <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-2 flex items-start gap-2">
          <i class="mdi mdi-alert-circle text-lg mt-0.5"></i>
          <span>{{ error }}</span>
        </div>

        <!-- Actions -->
        <div class="mt-6 flex justify-end gap-3">
          <button
            v-if="!loading"
            @click="close"
            class="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all"
          >
            ยกเลิก
          </button>
          
          <button
            @click="submit"
            :disabled="loading || !email"
            class="px-5 py-2.5 rounded-lg bg-linear-to-r from-purple-600 to-purple-500 
                   text-white font-medium shadow-md hover:brightness-110 
                   transition-all flex items-center justify-center gap-2
                   disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i v-if="loading" class="mdi mdi-loading mdi-spin text-lg"></i>
            <i v-else class="mdi mdi-send text-lg"></i>
            <span>{{ loading ? 'กำลังส่ง...' : 'ส่ง' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import axios from "@/utils/axios";

const props = defineProps({
  open: Boolean,
});

const emits = defineEmits(["close", "sent"]);

const email = ref("");
const message = ref("");
const error = ref("");
const loading = ref(false);

// Reset state เมื่อเปิด/ปิด modal
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    email.value = "";
    message.value = "";
    error.value = "";
    loading.value = false;
  }
});

const close = () => {
  if (!loading.value) {
    emits("close");
  }
};

const submit = async () => {
  if (!email.value || loading.value) return;

  message.value = "";
  error.value = "";
  loading.value = true;

  try {
    console.log('📤 Sending forgot password request for:', email.value);
    
    // ⚠️ axios interceptor คืน response.data อยู่แล้ว
    const data = await axios.post("/auth/forgot-password", { 
      email: email.value 
    });
    
    console.log('✅ Response received:', data);

    if (data.success) {
      message.value = data.message || "ส่งอีเมลรีเซ็ตรหัสผ่านเรียบร้อยแล้ว";
      emits("sent", email.value);
      
      // ปิด modal อัตโนมัติหลัง 3 วินาที
      setTimeout(() => {
        if (props.open) {
          close();
        }
      }, 3000);
    } else {
      error.value = data.error || "เกิดข้อผิดพลาด";
    }
  } catch (err) {
    console.error('❌ Forgot password error:', err);
    error.value = err.message || "เกิดข้อผิดพลาดในการส่งอีเมล";
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeIn {
  animation: fadeIn 0.25s ease-out;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
.mdi-spin {
  animation: spin 1s linear infinite;
}
</style>