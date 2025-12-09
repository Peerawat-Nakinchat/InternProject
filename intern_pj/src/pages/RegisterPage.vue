<template>
  <div class="flex justify-center relative">
    <AuthLayout variant="Regis">
      <!-- 🔥 Loading Overlay (fixed full-screen — ปลอดภัยสุด) -->
      <transition name="fade-scale">
        <div
          v-if="isLoading"
          class="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50"
        >
          <LoadingMessage title="กำลังสร้างบัญชีผู้ใช้" subtitle="กำลังไปยังหน้าล็อกอิน..." />
        </div>
      </transition>

      <form class="w-full max-w-md space-y-2.5" @submit.prevent="submitForm">
        <h2 class="text-xl font-semibold text-center text-slate-900">ลงทะเบียน</h2>

        <!-- ✅ ลบ Error/Success boxes ออกแล้ว - ใช้ Toast แทน -->

        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          <!-- Name -->
          <div class="flex flex-col w-full">
            <BaseInput
              v-model="form.name"
              label="ชื่อ"
              placeholder="ใส่ชื่อจริง"
              :disabled="isLoading"
              required
              :error="formErrors.name"
            />
            <!-- <p class="text-red-500 text-sm mt-1">{{ formErrors.name }}</p> -->
          </div>

          <!-- Surname -->
          <div class="flex flex-col w-full">
            <BaseInput
              v-model="form.surname"
              label="นามสกุล"
              placeholder="ใส่นามสกุล"
              :disabled="isLoading"
              required
              :error="formErrors.surname"
            />
            <!-- <p class="text-red-500 text-sm mt-1">{{ formErrors.surname }}</p> -->
          </div>
        </div>

        <!-- Gender -->
        <div class="space-y-1 relative mb-6">
          <label class="text-sm font-medium text-neutral-700 mb-1 block">เพศ *</label>

          <!-- Selected box -->
          <div
            class="w-full h-10 rounded-md px-4 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm shadow-sm cursor-pointer flex items-center justify-between transition-all hover:border-purple-400"
            @click="open = !open"
          >
            <span>
              {{ selectedSexLabel || 'เลือกเพศ' }}
            </span>

            <svg
              class="w-4 h-4 text-slate-500 transition-transform"
              :class="open ? 'rotate-180' : ''"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>

          <!-- Dropdown -->
          <div
            v-if="open"
            class="absolute z-20 mt-0.5 w-full bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden"
          >
            <div
              class="px-4 py-2 text-sm text-slate-700 hover:bg-purple-50 cursor-pointer transition"
              @click="selectSex('M')"
            >
              ชาย
            </div>

            <div
              class="px-4 py-2 text-sm text-slate-700 hover:bg-purple-50 cursor-pointer transition"
              @click="selectSex('F')"
            >
              หญิง
            </div>

            <div
              class="px-4 py-2 text-sm text-slate-700 hover:bg-purple-50 cursor-pointer transition"
              @click="selectSex('O')"
            >
              อื่น ๆ
            </div>
          </div>
        </div>

        <!-- Address -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-neutral-700 mb-1 block">ที่อยู่</label>
          <BaseInput
            v-model="form.user_address_1"
            placeholder="บ้านเลขที่ / อาคาร / หมู่บ้าน"
            :disabled="isLoading"
          />
          <BaseInput
            v-model="form.user_address_2"
            placeholder="ตำบล / อำเภอ"
            :disabled="isLoading"
          />
          <BaseInput
            v-model="form.user_address_3"
            placeholder="จังหวัด / รหัสไปรษณีย์"
            :disabled="isLoading"
          />
        </div>

        <!-- Email -->
        <div>
          <BaseInput
            v-model="form.email"
            label="อีเมล"
            type="email"
            placeholder="your@example.com"
            :disabled="isEmailLocked"
            required
            class="w-full"
            :error="formErrors.email"
          />
          <!-- <p class="text-red-500 text-sm mt-1">{{ formErrors.email }}</p> -->
        </div>
        <!-- Passwords (ใช้ BaseInput) -->
        <div class="space-y-1">
          <!-- Password -->
          <div class="w-full">
            <BaseInput
              v-model="form.password"
              label="รหัสผ่าน"
              type="password"
              placeholder="*********"
              :error="formErrors.password"
            />
          </div>

          <!-- 🔐 Password Strength Indicator (แสดงตลอด) -->
          <div class="p-3 bg-gray-50 rounded-lg mb-3">
            <!-- Progress Bar -->
            <div class="flex items-center gap-2 mb-2">
              <div class="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  class="h-full transition-all duration-300 rounded-full"
                  :style="{ width: passwordStrength.percentage + '%' }"
                  :class="passwordStrength.colorClass"
                />
              </div>
              <span
                class="text-xs font-semibold min-w-[55px] text-right"
                :class="passwordStrength.textClass"
              >
                {{ passwordStrength.label }}
              </span>
            </div>

            <!-- Checklist -->
            <div class="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
              <div
                class="flex items-center gap-1"
                :class="passwordChecks.hasLength ? 'text-green-600' : 'text-gray-400'"
              >
                <i
                  :class="
                    passwordChecks.hasLength ? 'mdi mdi-check-circle' : 'mdi mdi-circle-outline'
                  "
                  class="text-xs"
                ></i>
                6+ ตัวอักษร
              </div>
              <div
                class="flex items-center gap-1"
                :class="passwordChecks.hasUpper ? 'text-green-600' : 'text-gray-400'"
              >
                <i
                  :class="
                    passwordChecks.hasUpper ? 'mdi mdi-check-circle' : 'mdi mdi-circle-outline'
                  "
                  class="text-xs"
                ></i>
                ตัวพิมพ์ใหญ่
              </div>
              <div
                class="flex items-center gap-1"
                :class="passwordChecks.hasLower ? 'text-green-600' : 'text-gray-400'"
              >
                <i
                  :class="
                    passwordChecks.hasLower ? 'mdi mdi-check-circle' : 'mdi mdi-circle-outline'
                  "
                  class="text-xs"
                ></i>
                ตัวพิมพ์เล็ก
              </div>
              <div
                class="flex items-center gap-1"
                :class="passwordChecks.hasNumber ? 'text-green-600' : 'text-gray-400'"
              >
                <i
                  :class="
                    passwordChecks.hasNumber ? 'mdi mdi-check-circle' : 'mdi mdi-circle-outline'
                  "
                  class="text-xs"
                ></i>
                ตัวเลข
              </div>
              <div
                class="flex items-center gap-1"
                :class="passwordChecks.hasSpecial ? 'text-green-600' : 'text-gray-400'"
              >
                <i
                  :class="
                    passwordChecks.hasSpecial ? 'mdi mdi-check-circle' : 'mdi mdi-circle-outline'
                  "
                  class="text-xs"
                ></i>
                อักขระพิเศษ
              </div>
            </div>
          </div>

          <!-- Confirm Password -->
          <div class="w-full">
            <BaseInput
              v-model="form.confirm_password"
              label="ยืนยันรหัสผ่าน"
              type="password"
              placeholder="*********"
              :error="formErrors.confirm_password"
            />
          </div>

          <!-- Match Indicator -->
          <div v-if="form.confirm_password" class="text-xs flex items-center gap-1 mt-1">
            <template v-if="form.password === form.confirm_password">
              <i class="mdi mdi-check-circle text-green-600"></i>
              <span class="text-green-600">รหัสผ่านตรงกัน</span>
            </template>
            <template v-else>
              <i class="mdi mdi-close-circle text-red-500"></i>
              <span class="text-red-500">รหัสผ่านไม่ตรงกัน</span>
            </template>
          </div>
        </div>

        <BaseButton type="submit" class="w-full" :disabled="isLoading">
          <span v-if="isLoading">กำลังสร้างบัญชี...</span>
          <span v-else>สร้างบัญชี</span>
        </BaseButton>

        <p class="text-center text-sm text-slate-600">
          มีบัญชีแล้ว?
          <router-link to="/login" class="text-purple-600 underline">เข้าสู่ระบบ</router-link>
        </p>
      </form>

      <!-- OTP Verification Modal -->
      <OtpVerificationModal
        :open="showOtpModal"
        :email="registeredEmail"
        purpose="email_verification"
        @close="showOtpModal = false"
        @verified="onOtpVerified"
      />
    </AuthLayout>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getInvitationInfo } from '@/services/useInvitation'
import { toast } from '@/utils/toast' // ✅ Toast Utility

import BaseInput from '@/components/base/BaseInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import LoadingMessage from '@/components/loading/LoadingMessage.vue'
import OtpVerificationModal from '@/components/auth/OtpVerificationModal.vue'
import axios from 'axios'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({
  name: '',
  surname: '',
  full_name: '',
  email: '',
  password: '',
  confirm_password: '',
  sex: '',
  user_address_1: '',
  user_address_2: '',
  user_address_3: '',
  inviteToken: '', // Add inviteToken
})

const route = useRoute() // Get route

const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// OTP Modal state
const showOtpModal = ref(false)
const registeredEmail = ref('')
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const allowManualEmail = ref(false)
const isEmailLocked = computed(() => {
  if (isLoading.value) return true
  if (!form.value.inviteToken) return false
  return !allowManualEmail.value
})

onMounted(async () => {
  const tokenQuery = route.query.token
  const emailQuery = route.query.email

  const token = Array.isArray(tokenQuery) ? tokenQuery[0] : tokenQuery
  const email = Array.isArray(emailQuery) ? emailQuery[0] : emailQuery

  if (typeof token === 'string' && token.trim()) {
    form.value.inviteToken = token
  }
  if (typeof email === 'string' && email.trim()) {
    form.value.email = email
  }

  if (form.value.inviteToken && !form.value.email) {
    try {
      const response = await getInvitationInfo(form.value.inviteToken)
      const invitationData = response?.data ?? response

      if (invitationData?.email) {
        form.value.email = invitationData.email
      } else {
        allowManualEmail.value = true
        errorMessage.value = 'ไม่พบอีเมลจากคำเชิญ กรุณากรอกด้วยตนเอง'
      }
    } catch (err) {
      console.error('ไม่สามารถดึงข้อมูลคำเชิญ:', err)
      allowManualEmail.value = true
      errorMessage.value = 'ไม่สามารถดึงอีเมลจากคำเชิญได้ กรุณากรอกด้วยตนเอง'
    }
  }
})

const formErrors = ref({
  name: '',
  surname: '',
  full_name: '',
  email: '',
  password: '',
  confirm_password: '',
  sex: '',
  user_address_1: '',
  user_address_2: '',
  user_address_3: '',
})

const open = ref(false)

const selectedSexLabel = computed(() => {
  if (form.value.sex === 'M') return 'ชาย'
  if (form.value.sex === 'F') return 'หญิง'
  if (form.value.sex === 'O') return 'อื่น ๆ'
  return ''
})

// 🔐 Password Strength Computed
const passwordChecks = computed(() => ({
  hasLength: form.value.password.length >= 6,
  hasUpper: /[A-Z]/.test(form.value.password),
  hasLower: /[a-z]/.test(form.value.password),
  hasNumber: /[0-9]/.test(form.value.password),
  hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(form.value.password),
}))

const passwordStrength = computed(() => {
  // ถ้าไม่มี password ให้แสดง 0% ไม่มีสี
  if (!form.value.password) {
    return { percentage: 0, label: '', colorClass: '', textClass: 'text-gray-400' }
  }

  const checks = passwordChecks.value
  const score = [
    checks.hasLength,
    checks.hasUpper,
    checks.hasLower,
    checks.hasNumber,
    checks.hasSpecial,
  ].filter(Boolean).length

  if (score <= 1) return { percentage: 20, colorClass: 'bg-red-500', textClass: 'text-red-500' }
  if (score === 2)
    return {
      percentage: 40,

      colorClass: 'bg-orange-500',
      textClass: 'text-orange-500',
    }
  if (score === 3)
    return {
      percentage: 60,

      colorClass: 'bg-yellow-500',
      textClass: 'text-yellow-500',
    }
  if (score === 4)
    return {
      percentage: 80,

      colorClass: 'bg-blue-500',
      textClass: 'text-blue-500',
    }
  return {
    percentage: 100,

    colorClass: 'bg-green-500',
    textClass: 'text-green-500',
  }
})

const selectSex = (value) => {
  form.value.sex = value
  open.value = false
}

// อัพเดท full_name อัตโนมัติ
watch([() => form.value.name, () => form.value.surname], () => {
  form.value.full_name = `${form.value.name} ${form.value.surname}`.trim()
})

// ---------------------------
// FIELD VALIDATION
// ---------------------------
const validateField = (field) => {
  const value = form.value[field]

  switch (field) {
    case 'email':
      if (!value) formErrors.value.email = 'กรุณากรอกอีเมล'
      else if (!/^\S+@\S+\.\S+$/.test(value)) formErrors.value.email = 'รูปแบบอีเมลไม่ถูกต้อง'
      else if (/[\u0E00-\u0E7F]/.test(value)) {
        formErrors.value.email = 'ห้ามใช้ภาษาไทยในอีเมล'
      } else formErrors.value.email = ''
      break

    case 'password':
      if (!value) formErrors.value.password = 'กรุณากรอกรหัสผ่าน'
      else if (value.length < 6) formErrors.value.password = 'ต้องมีอย่างน้อย 6 ตัวอักษร'
      else if (/[\u0E00-\u0E7F]/.test(value)) {
        formErrors.value.password = 'ห้ามใช้ภาษาไทยในรหัสผ่าน'
      } else if (!/[A-Z]/.test(value)) formErrors.value.password = 'ต้องมีตัวพิมพ์ใหญ่ 1 ตัว'
      else if (!/[a-z]/.test(value)) formErrors.value.password = 'ต้องมีตัวพิมพ์เล็ก 1 ตัว'
      else if (!/[0-9]/.test(value)) formErrors.value.password = 'ต้องมีตัวเลข 1 ตัว'
      else if (!/[!@#$%^&*(),.?\":{}|<>]/.test(value))
        formErrors.value.password = 'ต้องมีอักขระพิเศษ 1 ตัว'
      else formErrors.value.password = ''
      break

    case 'confirm_password':
      if (value !== form.value.password) formErrors.value.confirm_password = 'รหัสผ่านไม่ตรงกัน'
      else formErrors.value.confirm_password = ''
      break

    case 'name':
      formErrors.value.name = value ? '' : 'กรุณากรอกชื่อ'
      break

    case 'surname':
      formErrors.value.surname = value ? '' : 'กรุณากรอกนามสกุล'
      break

    case 'sex':
      if (!value) formErrors.value.sex = 'กรุณาเลือกเพศ'
      else if (!['M', 'F', 'O'].includes(value)) formErrors.value.sex = 'เพศไม่ถูกต้อง'
      else formErrors.value.sex = ''
      break

    case 'user_address_1':
    case 'user_address_2':
    case 'user_address_3':
      formErrors.value[field] = ''
      break
  }
}

// ---------------------------
// REAL-TIME AUTO VALIDATION
// ---------------------------
watch(
  form,
  (newVal) => {
    Object.keys(newVal).forEach((field) => validateField(field))
  },
  { deep: true },
)

// ---------------------------
// SUBMIT FORM
// ---------------------------
const submitForm = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  // Validate all fields before submit
  Object.keys(formErrors.value).forEach((field) => validateField(field))

  if (Object.values(formErrors.value).some((err) => err !== '')) {
    toast.warning('กรุณากรอกข้อมูลให้ถูกต้อง') // ✅ Toast warning
    errorMessage.value = 'กรุณากรอกข้อมูลให้ถูกต้อง'
    return
  }

  isLoading.value = true

  try {
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // ✅ สำคัญ: เพื่อให้ browser รับ cookies
      body: JSON.stringify(form.value),
    })

    const data = await response.json()

    if (data.success) {
      if (data.user) {
        authStore.user = data.user
      }

      // ✅ DEBUG: Log inviteToken value
      console.log('📧 inviteToken value:', form.value.inviteToken)
      console.log('📧 Has inviteToken:', !!form.value.inviteToken)

      // ✅ ถ้าสมัครผ่าน invite link = email verified แล้ว ไม่ต้องส่ง OTP
      if (form.value.inviteToken) {
        toast.success('ลงทะเบียนและเข้าร่วมบริษัทสำเร็จ!')
        console.log('✅ Register via invite - skipping OTP (email already verified)')
        // Redirect to login page
        setTimeout(() => router.push('/login'), 1500)
      } else {
        // ✅ สมัครแบบปกติ = ต้องยืนยัน OTP
        toast.success('ลงทะเบียนสำเร็จ! กรุณายืนยันอีเมล')
        successMessage.value = 'ลงทะเบียนสำเร็จ!'
        console.log('✅ Register สำเร็จ - Sending OTP')

        registeredEmail.value = form.value.email

        try {
          await axios.post(`${API_BASE_URL}/auth/send-otp`, {
            email: form.value.email,
            purpose: 'email_verification',
          })

          // แสดง OTP Modal
          showOtpModal.value = true
        } catch (otpErr) {
          console.error('Error sending OTP:', otpErr)
          toast.warning('ไม่สามารถส่ง OTP ได้ กรุณายืนยันอีเมลภายหลัง')
          setTimeout(() => router.push('/login'), 2000)
        }
      }
    } else {
      toast.error(data.error || 'การลงทะเบียนไม่สำเร็จ')
      errorMessage.value = data.error || 'การลงทะเบียนไม่สำเร็จ'
    }
  } catch (err) {
    console.error('Register error:', err)
    toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์') // ✅ Toast error
    errorMessage.value = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์'
  } finally {
    isLoading.value = false
  }
}

// Handler เมื่อ OTP ยืนยันสำเร็จ
const onOtpVerified = () => {
  toast.success('ยืนยันอีเมลสำเร็จ! กำลังไปหน้าเข้าสู่ระบบ...')
  showOtpModal.value = false
  setTimeout(() => router.push('/login'), 1500)
}
</script>
