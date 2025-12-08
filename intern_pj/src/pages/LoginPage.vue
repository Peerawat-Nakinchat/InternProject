<template>
  <div class="flex justify-center relative">
    <AuthLayout variant="Login">
      <!-- 🔥 Loading Overlay (fixed full-screen — ปลอดภัยสุด) -->
      <transition name="fade-scale">
        <div
          v-if="isLoading"
          class="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50"
        >
          <LoadingMessage title="กำลังเข้าสู่ระบบ" subtitle="กำลังตรวจสอบข้อมูลผู้ใช้" />
        </div>
      </transition>

      <form class="space-y-5" @submit.prevent="handleLogin">
        <header class="space-y-1 text-left">
          <h1 class="mb-4 text-xl font-semibold tracking-tight text-slate-900">เข้าสู่ระบบ</h1>
        </header>

        <!-- Invitation Success Message (เก็บไว้เพราะเป็นกรณีพิเศษ) -->
        <div
          v-if="invitationSuccessMessage && !isLoading"
          class="p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm"
        >
          {{ invitationSuccessMessage }}
        </div>

        <!-- ✅ ลบ Error/Success boxes ออกแล้ว - ใช้ Toast แทน -->

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
              class="h-3.5 w-3.5 rounded border-primary-300 text-primary-600 accent-violet-500 focus:ring-primary-500"
              :disabled="isLoading"
            />
            <span class="text-slate-600">จำการเข้าสู่ระบบ</span>
          </label>

          <a
            class="font-medium text-primary-600 hover:underline cursor-pointer"
            @click="openForgot"
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
            @click="handleGoogleLogin"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
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
            @click="handleMicrosoftLogin"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="8.5" height="8.5" fill="#F35325" />
              <rect x="12.5" y="3" width="8.5" height="8.5" fill="#81BC06" />
              <rect x="3" y="12.5" width="8.5" height="8.5" fill="#05A6F0" />
              <rect x="12.5" y="12.5" width="8.5" height="8.5" fill="#FFBA08" />
            </svg>
            <span>เข้าสู่ระบบ / ลงทะเบียน ด้วย Microsoft</span>
          </button>
        </div>
      </form>
      <!-- ❗ ย้าย Modal มาไว้นอก form -->
      <ForgotPasswordModal :open="showForgot" @close="showForgot = false" @sent="onForgotSent" />

      <ResetPasswordModal
        :open="showReset"
        :token="resetToken"
        @close="handleCloseReset"
        @reset-success="onResetSuccess"
      />

      <!-- Rate Limit Modal -->
      <RateLimitModal
        v-if="showRateLimit"
        :minutes="rateLimitMinutes"
        @close="showRateLimit = false"
      />

      <!-- OTP Verification Modal (for unverified email) -->
      <OtpVerificationModal
        :open="showOtpModal"
        :email="unverifiedEmail"
        purpose="email_verification"
        @close="showOtpModal = false"
        @verified="onOtpVerified"
      />
    </AuthLayout>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/utils/toast' // ✅ Toast Utility

import AuthLayout from '@/layouts/AuthLayout.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import LoadingMessage from '@/components/loading/LoadingMessage.vue'
import ForgotPasswordModal from '@/components/auth/ForgotPasswordModal.vue'
import ResetPasswordModal from '@/components/auth/ResetPasswordModal.vue'
import RateLimitModal from '@/components/base/RateLimitModal.vue'
import OtpVerificationModal from '@/components/auth/OtpVerificationModal.vue'
import { hasEssentialConsent } from '@/utils/cookieConsent'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

interface LoginForm {
  email: string
  password: string
  remember: boolean
}

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const form = reactive<LoginForm>({
  email: '',
  password: '',
  remember: true,
})

const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const invitationSuccessMessage = ref('') // ✅ เพิ่ม

// Modal states
const showForgot = ref(false)
const showReset = ref(false)
const resetToken = ref('')
const showRateLimit = ref(false)
const rateLimitMinutes = ref<number | undefined>(undefined)

// OTP Modal states
const showOtpModal = ref(false)
const unverifiedEmail = ref('')

const openForgot = () => {
  showForgot.value = true
}

const onForgotSent = () => {
  showForgot.value = false
  toast.success('ส่งอีเมลรีเซ็ตรหัสผ่านเรียบร้อยแล้ว') // ✅ Toast
  successMessage.value = 'ส่งอีเมลรีเซ็ตรหัสผ่านเรียบร้อยแล้ว'
  setTimeout(() => {
    successMessage.value = ''
  }, 3000)
}

const onResetSuccess = () => {
  sessionStorage.removeItem('reset_token')
  showReset.value = false
  toast.success('เปลี่ยนรหัสผ่านสำเร็จ!') // ✅ Toast
  successMessage.value = 'เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบใหม่'

  setTimeout(() => {
    successMessage.value = ''
  }, 3000)
}

const handleCloseReset = () => {
  sessionStorage.removeItem('reset_token')
  showReset.value = false
  router.replace({ path: route.path, query: {} })
}

// ✅ ตรวจสอบ query parameters เมื่อ mount
onMounted(() => {
  // ✅ Check for invitation success message
  const message = route.query.message as string
  if (message === 'registration_with_invitation_success') {
    invitationSuccessMessage.value = '🎉 ลงทะเบียนและเข้าร่วมองค์กรสำเร็จ! กรุณาเข้าสู่ระบบ'

    // Clear message after 5 seconds
    setTimeout(() => {
      invitationSuccessMessage.value = ''
      router.replace({ path: route.path, query: {} })
    }, 5000)
  }

  // Check for reset token
  const tokenFromUrl = route.query.token
  if (tokenFromUrl) {
    const token = Array.isArray(tokenFromUrl) ? tokenFromUrl[0] : tokenFromUrl
    if (token && typeof token === 'string') {
      sessionStorage.setItem('reset_token', token)
      resetToken.value = token
      showReset.value = true
      router.replace({ path: route.path, query: {} })
    }
  } else {
    const storedToken = sessionStorage.getItem('reset_token')
    if (storedToken) {
      resetToken.value = storedToken
      showReset.value = true
    }
  }
})

watch(
  () => route.query.token,
  (newToken) => {
    if (newToken && !showReset.value) {
      const token = Array.isArray(newToken) ? newToken[0] : newToken
      if (token && typeof token === 'string') {
        sessionStorage.setItem('reset_token', token)
        resetToken.value = token
        showReset.value = true
      }
    }
  },
)

const handleLogin = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  invitationSuccessMessage.value = '' // ✅ Clear invitation message

  if (!form.email || !form.password) {
    toast.warning('กรุณากรอกอีเมลและรหัสผ่าน') // ✅ Toast warning
    errorMessage.value = 'กรุณากรอกอีเมลและรหัสผ่าน'
    return
  }

  isLoading.value = true

  try {
    const result = await authStore.login({
      email: form.email,
      password: form.password,
    })

    if (result?.success) {
      toast.success('เข้าสู่ระบบสำเร็จ!') // ✅ Toast success
      successMessage.value = 'เข้าสู่ระบบสำเร็จ กำลังเปลี่ยนหน้า...'

      setTimeout(() => {
        const redirectPath = (route.query.redirect as string) || '/'
        router.push(redirectPath)
      }, 1000)

      return
    }

    // ✅ Handle EMAIL_NOT_VERIFIED from result
    if (result && 'code' in result && result.code === 'EMAIL_NOT_VERIFIED') {
      const email = ('email' in result ? result.email : form.email) as string
      unverifiedEmail.value = email

      // Send OTP to the email
      try {
        await axios.post(`${API_BASE_URL}/auth/send-otp`, {
          email: email,
          purpose: 'email_verification',
        })
        showOtpModal.value = true
        toast.warning('กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ')
      } catch (otpErr) {
        console.error('Error sending OTP:', otpErr)
        toast.error('ไม่สามารถส่ง OTP ได้ กรุณาลองใหม่')
      }
      return
    }

    if (result && 'rateLimited' in result && result.rateLimited) {
      const retryVal = 'retryAfter' in result ? result.retryAfter : undefined
      rateLimitMinutes.value = typeof retryVal === 'number' ? retryVal : undefined
      showRateLimit.value = true
      return
    }

    if (result && 'needsConsent' in result && result.needsConsent) {
      errorMessage.value = result.error || 'กรุณายอมรับการใช้คุกกี้ก่อนเข้าสู่ระบบ'
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
      return
    }

    toast.error('อีเมลหรือรหัสผ่านไม่ถูกต้อง') // ✅ Toast error
    errorMessage.value = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
  } catch {
    toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์') // ✅ Toast error
    errorMessage.value = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์'
  } finally {
    if (!successMessage.value) {
      isLoading.value = false
    }
  }
}

const handleGoogleLogin = () => {
  if (!hasEssentialConsent()) {
    errorMessage.value = 'กรุณายอมรับการใช้คุกกี้ก่อนเข้าสู่ระบบ'
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
    return
  }
  window.location.href = 'http://localhost:3000/api/auth/google'
}

const handleMicrosoftLogin = () => {
  if (!hasEssentialConsent()) {
    errorMessage.value = 'กรุณายอมรับการใช้คุกกี้ก่อนเข้าสู่ระบบ'
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
    return
  }
  alert('Microsoft OAuth ยังไม่พร้อมใช้งาน')
}

// ✅ Handler เมื่อ OTP ยืนยันสำเร็จ
const onOtpVerified = () => {
  toast.success('ยืนยันอีเมลสำเร็จ! กรุณาเข้าสู่ระบบอีกครั้ง')
  showOtpModal.value = false
}
</script>
