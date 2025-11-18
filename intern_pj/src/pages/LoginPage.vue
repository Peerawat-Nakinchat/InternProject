<template>
  <div>
    <AuthLayout variant="Login">
      <form class="space-y-5" @submit.prevent="handleLogin">
        <header class="space-y-1 text-left">
          <h1 class="mb-4 text-xl font-semibold tracking-tight text-slate-900">เข้าสู่ระบบ</h1>
        </header>

        <!-- แสดง Error Message -->
        <div
          v-if="errorMessage"
          class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm"
        >
          {{ errorMessage }}
        </div>

        <!-- แสดง Success Message -->
        <div
          v-if="successMessage"
          class="p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm"
        >
          {{ successMessage }}
        </div>

        <BaseInput
          v-model="form.email"
          label="อีเมล"
          type="email"
          autocomplete="email"
          placeholder="your@example.com"
          :disabled="isLoading"
          required
        />

        <BaseInput
          v-model="form.password"
          label="รหัสผ่าน"
          type="password"
          autocomplete="current-password"
          placeholder="****************"
          :disabled="isLoading"
          required
        />

        <div class="flex items-center justify-between text-xs">
          <label class="inline-flex items-center gap-2 select-none">
            <input
              v-model="form.remember"
              type="checkbox"
              class="h-3.5 w-3.5 rounded border-primary-300 text-primary-600 focus:ring-primary-500 accent-violet-500"
              :disabled="isLoading"
            />
            <span class="text-slate-600">จำการเข้าสู่ระบบ</span>
          </label>

          <a
            type="button"
            class="font-medium text-primary-600 text-primary-400 hover:underline cursor-pointer"
          >
            ลืมรหัสผ่าน?
          </a>
        </div>

        <BaseButton type="submit" variant="Submit" class="w-full" :disabled="isLoading">
          <span v-if="isLoading">กำลังเข้าสู่ระบบ...</span>
          <span v-else>เข้าสู่ระบบ</span>
        </BaseButton>

        <div class="register text-center">
          <p class="text-xs text-slate-500">
            ยังไม่มีบัญชีใช่ไหม?
            <router-link to="/registerPage" class="font-medium text-purple-600 hover:underline">
              ลงทะเบียน
            </router-link>
          </p>
        </div>

        <div class="flex items-center my-4">
          <hr class="flex-1 border-slate-500" />
          <span class="mx-3 text-xs text-slate-500">หรือ</span>
          <hr class="flex-1 border-slate-500" />
        </div>

        <div class="space-y-3 pt-2">
          <button
            type="button"
            class="flex items-center justify-center gap-3 w-full rounded-md border px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 border-gray-500"
            aria-label="Sign in with Google"
            @click="handleGoogleLogin"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M21.6 12.24c0-.74-.07-1.45-.2-2.14H12v4.06h5.76c-.25 1.36-1 2.51-2.12 3.29v2.72h3.42c2-1.84 3.14-4.58 3.14-7.93z"
                fill="#4285F4"
              />
              <path
                d="M12 22c2.88 0 5.3-.95 7.07-2.58l-3.42-2.72c-.95.64-2.16 1.02-3.65 1.02-2.8 0-5.17-1.88-6.02-4.42H2.4v2.77C4.18 19.86 7.86 22 12 22z"
                fill="#34A853"
              />
              <path
                d="M5.98 13.3A7.3 7.3 0 0 1 5.6 12c0-.4.05-.79.14-1.17V8.05H2.4A9.99 9.99 0 0 0 1 12c0 1.6.38 3.12 1.05 4.46l3.93-3.16z"
                fill="#FBBC05"
              />
              <path
                d="M12 6.5c1.57 0 2.98.54 4.09 1.6l3.06-3.06C17.28 2.9 14.86 2 12 2 7.86 2 4.18 4.14 2.4 7.05l3.72 2.78C6.83 8.38 9.2 6.5 12 6.5z"
                fill="#EA4335"
              />
            </svg>
            <span>เข้าสู่ระบบ / ลงทะเบียน ด้วย Google</span>
          </button>

          <button
            type="button"
            class="flex items-center justify-center gap-3 w-full rounded-md border px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 border-gray-500"
            aria-label="Sign in with Microsoft"
            @click="handleMicrosoftLogin"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="3" y="3" width="8.5" height="8.5" fill="#F35325" />
              <rect x="12.5" y="3" width="8.5" height="8.5" fill="#81BC06" />
              <rect x="3" y="12.5" width="8.5" height="8.5" fill="#05A6F0" />
              <rect x="12.5" y="12.5" width="8.5" height="8.5" fill="#FFBA08" />
            </svg>
            <span>เข้าสู่ระบบ / ลงทะเบียน ด้วย Microsoft</span>
          </button>
        </div>
      </form>
    </AuthLayout>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AuthLayout from '@/layouts/AuthLayout.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'

interface LoginForm {
  email: string
  password: string
  remember: boolean
}

const router = useRouter()
const authStore = useAuthStore()

const form = reactive<LoginForm>({
  email: '',
  password: '',
  remember: true,
})

const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const handleLogin = async () => {
  // Reset messages
  errorMessage.value = ''
  successMessage.value = ''

  // Validation
  if (!form.email || !form.password) {
    errorMessage.value = 'กรุณากรอกอีเมลและรหัสผ่าน'
    return
  }

  isLoading.value = true

  try {
    const result = await authStore.login({
      email: form.email,
      password: form.password,
      remember: form.remember,
    })

    if (result?.success) {
      successMessage.value = 'เข้าสู่ระบบสำเร็จ กำลังเปลี่ยนหน้า...'

      // Redirect to home page
      setTimeout(() => {
        router.push('/')
      }, 1000)
    } else {
      errorMessage.value = result?.error || 'เข้าสู่ระบบไม่สำเร็จ'
    }
  } catch (error) {
    errorMessage.value = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์'
  } finally {
    isLoading.value = false
  }
}

const handleGoogleLogin = () => {
  // TODO: Implement Google OAuth
  alert('Google OAuth ยังไม่พร้อมใช้งาน')
}

const handleMicrosoftLogin = () => {
  // TODO: Implement Microsoft OAuth
  alert('Microsoft OAuth ยังไม่พร้อมใช้งาน')
}
</script>
