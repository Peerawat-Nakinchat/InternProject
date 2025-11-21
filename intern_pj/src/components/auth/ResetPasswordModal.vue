<template>
  <div
    v-if="open"
    class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
    @click.self="close"
  >
    <div class="bg-white w-full max-w-md rounded-xl shadow-lg p-6 animate-fadeIn">
      <h2 class="text-xl font-semibold mb-4">ตั้งรหัสผ่านใหม่</h2>

      <div v-if="loading" class="text-center py-4">ตรวจสอบ Token...</div>

      <div v-else-if="!tokenValid" class="text-red-600">
        ลิงก์หมดอายุหรือไม่ถูกต้อง
      </div>

      <div v-else>
        <input
          v-model="password"
          type="password"
          placeholder="รหัสผ่านใหม่"
          class="w-full border rounded-md px-3 py-2 mb-3"
        />

        <input
          v-model="confirmPassword"
          type="password"
          placeholder="ยืนยันรหัสผ่าน"
          class="w-full border rounded-md px-3 py-2 mb-3"
        />

        <p v-if="message" class="text-green-600 text-sm mt-2">{{ message }}</p>
        <p v-if="error" class="text-red-600 text-sm mt-2">{{ error }}</p>

        <div class="mt-6 flex justify-end gap-3">
          <button @click="close" class="px-4 py-2 rounded bg-gray-200">ปิด</button>
          <button @click="submit" class="px-4 py-2 rounded bg-purple-600 text-white">
            บันทึกรหัสผ่านใหม่
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
  token: String,
});

const emits = defineEmits(["close", "reset-success"]);

const internalToken = ref("");
const loading = ref(false);
const tokenValid = ref(false);
const password = ref("");
const confirmPassword = ref("");
const message = ref("");
const error = ref("");

onMounted(async () => {
  internalToken.value = props.token || localStorage.getItem("reset_token")

  console.log("🔍 internalToken:", internalToken.value)

  try {
    const res = await axios.get("/api/auth/verify-reset-token", {
      params: { token: internalToken.value },
    })

    tokenValid.value = res.data.valid
  } catch (err) {
    tokenValid.value = false
  } finally {
    loading.value = false
  }
})


// =====================================
// ✔️ ฟังก์ชัน verify token
// =====================================
const verifyToken = async () => {
  loading.value = true;
  tokenValid.value = false;

  try {
    const res = await axios.get("/api/auth/verify-reset-token", {
      params: { token: internalToken.value },
    });

    tokenValid.value = res.data.valid;
  } catch (err) {
    tokenValid.value = false;
  } finally {
    loading.value = false;
  }
};

const close = () => emits("close");

// =====================================
// ✔️ submit reset password
// =====================================
const submit = async () => {
  message.value = "";
  error.value = "";

  if (!tokenValid.value) {
    error.value = "Token ไม่ถูกต้องหรือหมดอายุ";
    return;
  }

  if (password.value !== confirmPassword.value) {
    error.value = "รหัสผ่านไม่ตรงกัน";
    return;
  }

  try {
    const res = await axios.post("/api/auth/reset-password", {
        token: internalToken.value,
        password: password.value,
        })


    message.value = res.data.message || "ตั้งรหัสผ่านสำเร็จ";
    emits("reset-success");

    // ลบ token ออกจาก localStorage
    localStorage.removeItem("reset_token");
  } catch (err) {
    error.value = err.response?.data?.error || "เกิดข้อผิดพลาด";
  }
};
</script>

<style>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fadeIn {
  animation: fadeIn 0.25s ease-out;
}
</style>
