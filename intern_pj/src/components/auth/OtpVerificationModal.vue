<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        @click.self="$emit('close')"
      >
        <div
          class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden transform transition-all"
        >
          <!-- Header -->
          <div class="bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-5 text-center">
            <div
              class="w-16 h-16 bg-white/20 rounded-full mx-auto mb-3 flex items-center justify-center"
            >
              <i class="mdi mdi-email-check text-3xl text-white"></i>
            </div>
            <h2 class="text-xl font-bold text-white">ยืนยันอีเมลของคุณ</h2>
            <p class="text-purple-200 text-sm mt-1">กรุณากรอกรหัส OTP 6 หลักที่ส่งไปยัง</p>
            <p class="text-white font-medium">{{ email }}</p>
          </div>

          <!-- Body -->
          <div class="p-6">
            <!-- OTP Input -->
            <div class="flex justify-center gap-2 mb-6">
              <input
                v-for="(_, index) in 6"
                :key="index"
                ref="otpInputs"
                type="text"
                inputmode="numeric"
                maxlength="1"
                class="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all duration-200"
                :class="{ 'border-red-400': error }"
                :value="otpDigits[index]"
                @input="onInput($event, index)"
                @keydown="onKeydown($event, index)"
                @paste="onPaste"
              />
            </div>

            <!-- Error Message -->
            <Transition name="fade">
              <div v-if="error" class="text-center mb-4">
                <p class="text-red-500 text-sm">
                  <i class="mdi mdi-alert-circle mr-1"></i>
                  {{ error }}
                </p>
                <p v-if="attemptsLeft !== undefined" class="text-gray-500 text-xs mt-1">
                  เหลือโอกาสอีก {{ attemptsLeft }} ครั้ง
                </p>
              </div>
            </Transition>

            <!-- Verify Button -->
            <button
              type="button"
              class="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              :disabled="isLoading || otpCode.length !== 6"
              @click="handleVerify"
            >
              <span v-if="isLoading" class="flex items-center gap-2">
                <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                    fill="none"
                  />
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                กำลังตรวจสอบ...
              </span>
              <span v-else>
                <i class="mdi mdi-check-circle mr-1"></i>
                ยืนยันรหัส OTP
              </span>
            </button>

            <!-- Resend Section -->
            <div class="mt-6 text-center">
              <p class="text-gray-500 text-sm mb-2">ไม่ได้รับรหัส?</p>
              <button
                type="button"
                class="text-purple-600 font-medium hover:text-purple-800 transition disabled:text-gray-400 disabled:cursor-not-allowed"
                :disabled="resendCooldown > 0 || isResending"
                @click="handleResend"
              >
                <span v-if="isResending">
                  <i class="mdi mdi-loading mdi-spin mr-1"></i>
                  กำลังส่ง...
                </span>
                <span v-else-if="resendCooldown > 0">
                  ส่งรหัสใหม่ได้ใน {{ resendCooldown }} วินาที
                </span>
                <span v-else>
                  <i class="mdi mdi-refresh mr-1"></i>
                  ส่งรหัสอีกครั้ง
                </span>
              </button>
            </div>

            <!-- Expiry Warning -->
            <div class="mt-4 p-3 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg">
              <p class="text-amber-700 text-xs">
                <i class="mdi mdi-clock-outline mr-1"></i>
                รหัส OTP จะหมดอายุใน 5 นาที
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 bg-gray-50 border-t text-center">
            <button
              type="button"
              class="text-gray-500 hover:text-gray-700 text-sm"
              @click="$emit('close')"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import axios from 'axios'
import { toast } from '@/utils/toast'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// Props
const props = defineProps<{
  open: boolean
  email: string
  purpose?: 'email_verification' | 'change_email'
}>()

// Emits
const emit = defineEmits<{
  close: []
  verified: []
}>()

// State
const otpDigits = ref<string[]>(['', '', '', '', '', ''])
const otpInputs = ref<HTMLInputElement[]>([])
const isLoading = ref(false)
const isResending = ref(false)
const error = ref('')
const attemptsLeft = ref<number | undefined>(undefined)
const resendCooldown = ref(0)

// Computed
const otpCode = computed(() => otpDigits.value.join(''))

// Resend cooldown timer
let cooldownInterval: ReturnType<typeof setInterval> | null = null

const startCooldown = () => {
  resendCooldown.value = 60
  if (cooldownInterval) clearInterval(cooldownInterval)
  cooldownInterval = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0) {
      if (cooldownInterval) clearInterval(cooldownInterval)
    }
  }, 1000)
}

// Input handlers
const onInput = (event: Event, index: number) => {
  const input = event.target as HTMLInputElement
  const value = input.value.replace(/\D/g, '') // Only digits

  otpDigits.value[index] = value.slice(0, 1)
  error.value = ''

  // Auto focus next
  if (value && index < 5) {
    nextTick(() => {
      otpInputs.value[index + 1]?.focus()
    })
  }
}

const onKeydown = (event: KeyboardEvent, index: number) => {
  // Backspace - move to previous
  if (event.key === 'Backspace' && !otpDigits.value[index] && index > 0) {
    nextTick(() => {
      otpInputs.value[index - 1]?.focus()
    })
  }

  // Arrow keys
  if (event.key === 'ArrowLeft' && index > 0) {
    otpInputs.value[index - 1]?.focus()
  }
  if (event.key === 'ArrowRight' && index < 5) {
    otpInputs.value[index + 1]?.focus()
  }
}

const onPaste = (event: ClipboardEvent) => {
  event.preventDefault()
  const pastedData = event.clipboardData?.getData('text').replace(/\D/g, '').slice(0, 6) || ''

  pastedData.split('').forEach((char, i) => {
    if (i < 6) otpDigits.value[i] = char
  })

  // Focus last filled or next empty
  const lastIndex = Math.min(pastedData.length, 5)
  nextTick(() => {
    otpInputs.value[lastIndex]?.focus()
  })
}

// Verify OTP
const handleVerify = async () => {
  if (otpCode.value.length !== 6) return

  isLoading.value = true
  error.value = ''

  try {
    await axios.post(`${API_BASE_URL}/auth/verify-otp`, {
      email: props.email,
      otp: otpCode.value,
      purpose: props.purpose || 'email_verification',
    })

    toast.success('ยืนยันอีเมลสำเร็จ!')
    emit('verified')
    emit('close')
  } catch (err: any) {
    const response = err.response?.data
    error.value = response?.error || 'รหัส OTP ไม่ถูกต้อง'
    attemptsLeft.value = response?.attemptsLeft

    // Clear inputs on error
    otpDigits.value = ['', '', '', '', '', '']
    nextTick(() => {
      otpInputs.value[0]?.focus()
    })
  } finally {
    isLoading.value = false
  }
}

// Resend OTP
const handleResend = async () => {
  isResending.value = true
  error.value = ''

  try {
    await axios.post(`${API_BASE_URL}/auth/resend-otp`, {
      email: props.email,
      purpose: props.purpose || 'email_verification',
    })

    toast.success('ส่งรหัส OTP ใหม่เรียบร้อยแล้ว')
    startCooldown()

    // Clear inputs
    otpDigits.value = ['', '', '', '', '', '']
    nextTick(() => {
      otpInputs.value[0]?.focus()
    })
  } catch (err: any) {
    error.value = err.response?.data?.error || 'ไม่สามารถส่ง OTP ได้'
  } finally {
    isResending.value = false
  }
}

// Focus first input when modal opens
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      // Reset state
      otpDigits.value = ['', '', '', '', '', '']
      error.value = ''
      attemptsLeft.value = undefined

      // Start cooldown if first open
      if (resendCooldown.value === 0) {
        startCooldown()
      }

      // Focus first input
      nextTick(() => {
        otpInputs.value[0]?.focus()
      })
    }
  },
)

// Cleanup
import { onUnmounted } from 'vue'
onUnmounted(() => {
  if (cooldownInterval) clearInterval(cooldownInterval)
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
