<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-[#f5f2fa]">
    <div class="flex flex-col md:flex-row w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden">

      <!-- Image -->
      <img 
        src="@/assets/images/LoginERP.png"
        class="w-full md:w-1/2 h-48 md:h-auto object-cover"
      />

      <!-- Form -->
      <div class="w-full md:w-1/2 p-6 md:p-10 flex justify-center">
        <form class="w-full max-w-md space-y-5" @submit.prevent="submitForm">

          <h2 class="text-3xl font-semibold text-center text-slate-900">ลงทะเบียน</h2>

          <!-- แสดง Error Message -->
          <div v-if="errorMessage" class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {{ errorMessage }}
          </div>

          <!-- แสดง Success Message -->
          <div v-if="successMessage" class="p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
            {{ successMessage }}
          </div>

          <!-- Name -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BaseInput 
              v-model="form.name" 
              label="ชื่อ" 
              placeholder="ใส่ชื่อจริง" 
              :disabled="isLoading"
              required 
            />
            <BaseInput 
              v-model="form.surname" 
              label="นามสกุล" 
              placeholder="ใส่นามสกุล" 
              :disabled="isLoading"
              required 
            />
          </div>

          <!-- Email -->
          <BaseInput 
            v-model="form.email" 
            label="อีเมล" 
            type="email" 
            placeholder="your@example.com" 
            :disabled="isLoading"
            required 
          />

          <!-- Password -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BaseInput 
              v-model="form.password" 
              label="รหัสผ่าน" 
              type="password" 
              placeholder="*********" 
              :disabled="isLoading"
              required 
            />
            <BaseInput 
              v-model="form.confirm_password" 
              label="ยืนยันรหัสผ่าน" 
              type="password" 
              placeholder="*********" 
              :disabled="isLoading"
              required 
            />
          </div>

          <!-- Gender -->
          <div>
            <label class="text-sm font-medium">เพศ *</label>
            <select
              v-model="form.sex"
              required
              :disabled="isLoading"
              class="w-full mt-1 border border-gray-300 rounded-xl px-4 py-3 bg-white focus:border-purple-600"
            >
              <option disabled value="">เลือกเพศ</option>
              <option value="M">ชาย</option>
              <option value="F">หญิง</option>
              <option value="O">อื่น ๆ</option>
            </select>
          </div>

          <!-- Address -->
          <div class="space-y-2">
            <BaseInput 
              v-model="form.address1" 
              placeholder="บ้านเลขที่ / อาคาร / หมู่บ้าน" 
              :disabled="isLoading"
            />
            <BaseInput 
              v-model="form.address2" 
              placeholder="ตำบล / อำเภอ" 
              :disabled="isLoading"
            />
            <BaseInput 
              v-model="form.address3" 
              placeholder="จังหวัด / รหัสไปรษณีย์" 
              :disabled="isLoading"
            />
          </div>

          <!-- Profile Image -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">รูปโปรไฟล์</label>

            <div
              class="flex items-center gap-3 border border-gray-300 rounded-lg px-3 py-2 cursor-pointer hover:border-purple-500 transition w-full max-w-xs"
              :class="{ 'opacity-50 cursor-not-allowed': isLoading }"
              @click="!isLoading && $refs.fileInput.click()"
            >
              <template v-if="previewImage">
                <img
                  :src="previewImage"
                  alt="Preview"
                  class="w-10 h-10 rounded-full object-cover shrink-0"
                />
                <span class="text-xs text-gray-500 truncate">เปลี่ยนรูป</span>
              </template>

              <template v-else>
                <svg class="w-6 h-6 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M7 16V4m0 0L3 8m4-4l4 4m6 0h2a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2v-2" />
                </svg>
                <span class="text-xs text-gray-500 truncate">เลือกไฟล์</span>
              </template>

              <input 
                type="file" 
                ref="fileInput" 
                accept="image/*" 
                @change="uploadImage" 
                :disabled="isLoading"
                class="hidden" 
              />
            </div>
          </div>

          <BaseButton 
            type="submit" 
            class="w-full" 
            :disabled="isLoading"
          >
            <span v-if="isLoading">กำลังสร้างบัญชี...</span>
            <span v-else>สร้างบัญชี</span>
          </BaseButton>

          <p class="text-center text-sm text-slate-600">
            มีบัญชีแล้ว?
            <router-link to="/login" class="text-purple-600 underline">เข้าสู่ระบบ</router-link>
          </p>

        </form>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue"
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import BaseInput from "@/components/base/BaseInput.vue"
import BaseButton from "@/components/base/BaseButton.vue"

const router = useRouter()
const authStore = useAuthStore()

const form = ref({
  name: "", 
  surname: "", 
  full_name: "",
  email: "", 
  password: "", 
  confirm_password: "",
  sex: "", 
  address1: "", 
  address2: "", 
  address3: "",
  profile_image: null,
})

const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const previewImage = ref(null)

// อัพเดท full_name อัตโนมัติ
watch([() => form.value.name, () => form.value.surname],
  () => form.value.full_name = `${form.value.name} ${form.value.surname}`.trim()
)

// อัพโหลดรูปภาพ
const uploadImage = (event) => {
  const file = event.target.files[0]
  if (file) {
    // ตรวจสอบขนาดไฟล์ (จำกัดที่ 5MB)
    if (file.size > 5 * 1024 * 1024) {
      errorMessage.value = 'ขนาดไฟล์ต้องไม่เกิน 5MB'
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      previewImage.value = e.target.result
      form.value.profile_image = e.target.result // เก็บ base64
    }
    reader.readAsDataURL(file)
  }
}

// ส่งฟอร์ม
const submitForm = async () => {
  // Reset messages
  errorMessage.value = ''
  successMessage.value = ''

  // Validation
  if (!form.value.email || !form.value.password || !form.value.name || !form.value.surname) {
    errorMessage.value = 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน'
    return
  }

  if (form.value.password !== form.value.confirm_password) {
    errorMessage.value = 'รหัสผ่านไม่ตรงกัน'
    return
  }

  if (form.value.password.length < 6) {
    errorMessage.value = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
    return
  }

  if (!form.value.sex) {
    errorMessage.value = 'กรุณาเลือกเพศ'
    return
  }

  isLoading.value = true

  try {
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: form.value.email,
        password: form.value.password,
        confirm_password: form.value.confirm_password,
        name: form.value.name,
        surname: form.value.surname,
        sex: form.value.sex,
        address1: form.value.address1,
        address2: form.value.address2,
        address3: form.value.address3,
        profile_image: form.value.profile_image,
      })
    })

    const data = await response.json()

    if (data.success) {
      successMessage.value = 'ลงทะเบียนสำเร็จ! กำลังเปลี่ยนหน้า...'
      
      // บันทึก tokens และข้อมูล user
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken)
      }
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken)
      }
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user))
        authStore.user = data.user
      }

      // Redirect to home page
      setTimeout(() => {
        router.push('/')
      }, 1500)
    } else {
      errorMessage.value = data.error || 'การลงทะเบียนไม่สำเร็จ'
    }

  } catch (error) {
    console.error('Register error:', error)
    errorMessage.value = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์'
  } finally {
    isLoading.value = false
  }
}
</script>