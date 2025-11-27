<template>
  <div v-if="open" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
    @click.self="handleClose">
    <div class="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fadeIn bg-white">
      <!-- Header -->
      <div class="bg-linear-to-r from-purple-600 to-purple-500 px-6 py-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-white flex items-center gap-2">
            <i class="mdi mdi-lock-reset text-2xl"></i>
            ตั้งรหัสผ่านใหม่
          </h2>
          <button @click="handleClose" class="text-white/80 hover:text-white text-xl transition">
            ✕
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="px-6 py-6 bg-white">
        <!-- Loading -->
        <div v-if="loading" class="text-center py-8">
          <div
            class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-200 border-t-purple-600 mb-3">
          </div>
          <p class="text-gray-600">กำลังตรวจสอบ Token...</p>
        </div>

        <!-- Invalid Token -->
        <div v-else-if="!tokenValid" class="text-center py-8">
          <i class="mdi mdi-alert-circle text-red-500 text-5xl mb-3"></i>
          <p class="text-red-600 font-medium mb-2">ลิงก์หมดอายุหรือไม่ถูกต้อง</p>
          <p class="text-gray-500 text-sm mb-6">
            กรุณาขอลิงก์รีเซ็ตรหัสผ่านใหม่อีกครั้ง
          </p>
          <button @click="handleClose" class="px-4 py-2 rounded-lg bg-gray-200 hover:bg-red-500 transition">
            ปิด
          </button>
        </div>

        <!-- Form -->
        <div v-else>
          <p class="text-md text-gray-600 mb-4">
            กรุณากรอกรหัสผ่านใหม่ที่ต้องการใช้
          </p>

          <!-- BaseInput: Password -->
          <div class="mb-2">
            <BaseInput v-model="password" label="รหัสผ่านใหม่" type="password" :error="passwordError" />
          </div>
          <!-- BaseInput: Confirm -->
          <BaseInput v-model="confirmPassword" type="password" label="ยืนยันรหัสผ่าน" :error="confirmError"
            @keyup.enter="submit" />

          <!-- Success -->
          <div v-if="message"
            class="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm mb-4 flex items-start gap-2">
            <i class="mdi mdi-check-circle text-lg mt-0.5"></i>
            <span>{{ message }}</span>
          </div>

          <!-- Error -->
          <div v-if="error"
            class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4 flex items-start gap-2">
            <i class="mdi mdi-alert-circle text-lg mt-0.5"></i>
            <span>{{ error }}</span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="bg-gray-50 px-6 py-4 flex gap-3 border-t">
        <button @click="handleClose"
          class="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 disabled:opacity-50"
          :disabled="submitting">
          ยกเลิก
        </button>

        <button @click="submit" :disabled="submitting || !password || !confirmPassword"
          class="flex-1 px-4 py-2.5 rounded-lg bg-linear-to-r from-purple-600 to-purple-500 text-white font-medium shadow-md hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2">
          <i v-if="submitting" class="mdi mdi-loading mdi-spin text-lg"></i>
          <i v-else class="mdi mdi-check text-lg"></i>
          <span>{{ submitting ? 'กำลังบันทึก...' : 'บันทึก' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>


<script setup>
import { ref, watch } from "vue";
import axios from "@/utils/axios";
import BaseInput from "@/components/base/BaseInput.vue";

const props = defineProps({
  open: Boolean,
  token: String,
});

const emits = defineEmits(["close", "reset-success"]);

const loading = ref(false);
const submitting = ref(false);
const tokenValid = ref(false);
const password = ref("");
const confirmPassword = ref("");
const message = ref("");
const error = ref("");

// ⭐ ตรวจสอบ token ทุกครั้งที่ modal เปิด
watch(
  () => [props.open, props.token],
  async ([isOpen, token]) => {
    if (!isOpen) return;

    // Reset state
    password.value = "";
    confirmPassword.value = "";
    message.value = "";
    error.value = "";
    tokenValid.value = false;

    if (!token) {
      console.error('❌ No token provided');
      return;
    }

    loading.value = true;

    try {
      console.log('🔍 Verifying token:', token);

      const response = await axios.get("/auth/verify-reset-token", {
        params: { token }
      });

      console.log('✅ Token verification response:', response);

      tokenValid.value = response.success === true && response.valid === true;

      if (!tokenValid.value) {
        console.warn('⚠️ Token is invalid');
      }
    } catch (err) {
      console.error('❌ Token verification failed:', err);
      tokenValid.value = false;
      error.value = err.message || "ไม่สามารถตรวจสอบ Token ได้";
    } finally {
      loading.value = false;
    }
  },
  { immediate: true }
);

const handleClose = () => {
  if (!submitting.value) {
    emits("close");
  }
};

// ⭐ Submit reset password
const submit = async () => {
  if (!tokenValid.value || submitting.value) return;

  message.value = "";
  error.value = "";

  // Validate
  if (!password.value || !confirmPassword.value) {
    error.value = "กรุณากรอกรหัสผ่านให้ครบถ้วน";
    return;
  }

  if (password.value.length < 6) {
    error.value = "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
    return;
  }

  if (password.value !== confirmPassword.value) {
    error.value = "รหัสผ่านไม่ตรงกัน";
    return;
  }

  submitting.value = true;

  try {
    console.log('📤 Submitting password reset...');

    const response = await axios.post("/auth/reset-password", {
      token: props.token,
      password: password.value,
    });

    console.log('✅ Password reset response:', response);

    message.value = response.message || "เปลี่ยนรหัสผ่านสำเร็จ";

    // Clear localStorage
    localStorage.removeItem("reset_token");

    // Emit success และปิด modal หลัง 2 วินาที
    setTimeout(() => {
      emits("reset-success");
    }, 2000);

  } catch (err) {
    console.error('❌ Password reset failed:', err);
    error.value = err.message || "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน";
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.mdi-spin {
  animation: spin 1s linear infinite;
}
</style>