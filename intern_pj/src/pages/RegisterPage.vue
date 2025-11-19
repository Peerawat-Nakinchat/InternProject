<template>
  <AuthLayout variant="Regis">
    <form class="w-full max-w-md space-y-5" @submit.prevent="submitForm">
      <h2 class="text-3xl font-semibold text-center text-slate-900">ลงทะเบียน</h2>

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

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
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
      <div class="space-y-1 relative">
        <label class="text-xs font-medium text-neutral-700">เพศ *</label>

        <!-- Selected box -->
        <div
          class="w-full rounded-md px-4 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm shadow-sm cursor-pointer flex items-center justify-between transition-all hover:border-purple-400"
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
          class="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden"
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
        <label class="text-xs font-medium text-neutral-700">ที่อยู่</label>
        <BaseInput
          v-model="form.address1"
          placeholder="บ้านเลขที่ / อาคาร / หมู่บ้าน"
          :disabled="isLoading"
        />
        <BaseInput v-model="form.address2" placeholder="ตำบล / อำเภอ" :disabled="isLoading" />
        <BaseInput
          v-model="form.address3"
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
          :disabled="isLoading"
          required
          class="w-full"
          :error="formErrors.email"
        />
        <!-- <p class="text-red-500 text-sm mt-1">{{ formErrors.email }}</p> -->
      </div>
      <!-- Passwords -->
      <div class="space-y-1">
        <!-- Password -->
        <div class="w-full pb-4 space-y-1">
          <label class="text-xs font-medium text-neutral-700">รหัสผ่าน</label>

          <div class="relative">
            <input
              :type="showPassword ? 'text' : 'password'"
              v-model="form.password"
              placeholder="*********"
              class="w-full rounded-md border px-3 pr-12 h-10 text-md border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 placeholder:text-slate-400"
            />

            <i
              :class="showPassword ? 'mdi mdi-eye' : 'mdi mdi-eye-off'"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-xl text-gray-500 cursor-pointer hover:text-primary"
              @click="showPassword = !showPassword"
            ></i>
          </div>

          <p
            v-if="formErrors.password"
            class="absolute text-xs text-red-500 pointer-events-none"
          >
            {{ formErrors.password }}
          </p>
        </div>

        <!-- Confirm Password -->
        <div class="w-full space-y-1">
          <label class="text-xs font-medium text-neutral-700">ยืนยันรหัสผ่าน</label>

          <div class="relative">
            <input
              :type="showConfirm ? 'text' : 'password'"
              v-model="form.confirm_password"
              placeholder="*********"
              class="w-full rounded-md border px-3 pr-12 h-10 text-md border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 placeholder:text-slate-400"
            />

            <i
              :class="showConfirm ? 'mdi mdi-eye' : 'mdi mdi-eye-off'"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-xl text-gray-500 cursor-pointer hover:text-primary"
              @click="showConfirm = !showConfirm"
            ></i>
          </div>

          <p
            v-if="formErrors.password"
            class="absolute text-xs text-red-500 pointer-events-none"
          >
            {{ formErrors.confirm_password }}
          </p>
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
  </AuthLayout>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Components
import BaseInput from '@/components/base/BaseInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'

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
  address1: '',
  address2: '',
  address3: '',
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
const dropdownRef = ref(null)

const selectedSexLabel = computed(() => {
  if (form.value.sex === 'M') return 'ชาย'
  if (form.value.sex === 'F') return 'หญิง'
  if (form.value.sex === 'O') return 'อื่น ๆ'
  return ''
})

const selectSex = (value) => {
  form.value.sex = value
  open.value = false
}

const showPassword = ref(false)
const showConfirm = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const previewImage = ref(null)

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
      body: JSON.stringify(form.value),
    })

    const data = await response.json()

    if (data.success) {
      successMessage.value = 'ลงทะเบียนสำเร็จ! กำลังเปลี่ยนหน้า...'

      if (data.accessToken) localStorage.setItem('accessToken', data.accessToken)
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken)
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user))
        authStore.user = data.user
      }

      setTimeout(() => router.push('/login'), 1500)
    } else {
      errorMessage.value = data.error || 'การลงทะเบียนไม่สำเร็จ'
    }
  } catch (err) {
    console.error('Register error:', err)
    errorMessage.value = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์'
  } finally {
    isLoading.value = false
  }
}
</script>
