<template>
  <div class="min-h-screen bg-gray-50 py-8 px-4">
    <div class="max-w-3xl mx-auto">
      <!-- Header -->
      <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {{ userInitials }}
            </div>
            <div>
              <h1 class="text-2xl font-bold text-gray-800">โปรไฟล์ของฉัน</h1>
              <p class="text-gray-600">{{ authStore.user?.email }}</p>
            </div>
          </div>
          <button
            @click="goBack"
            class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <i class="mdi mdi-arrow-left mr-2"></i>
            กลับ
          </button>
        </div>
      </div>

      <!-- Profile Form -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold mb-6 text-gray-800">ข้อมูลส่วนตัว</h2>

        <!-- Success/Error Messages -->
        <div v-if="successMessage" class="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-600">
          {{ successMessage }}
        </div>
        <div v-if="errorMessage" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {{ errorMessage }}
        </div>

        <form @submit.prevent="updateProfile" class="space-y-6">
          <!-- Email (Read-only) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">อีเมล</label>
            <input
              :value="authStore.user?.email"
              type="email"
              disabled
              class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
            />
            <p class="text-xs text-gray-500 mt-1">ไม่สามารถเปลี่ยนอีเมลได้</p>
          </div>

          <!-- Full Name -->
           <base-input
            v-model="form.full_name"
            label="ชื่อ-นามสกุล"
            placeholder="ชื่อ นามสกุล"
            :disabled="isLoading"
          />

          <!--<div>
            <label class="block text-sm font-medium text-gray-700 mb-2">ชื่อ-นามสกุล</label>
            <input
              v-model="form.full_name"
              type="text"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="ชื่อ นามสกุล"
              :disabled="isLoading"
            />
          </div>-->

          <!-- Role (Read-only) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">บทบาท</label>
            <input
              :value="getRoleName(authStore.user?.role_id)"
              type="text"
              disabled
              class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
            />
          </div>

          <!-- Account Status -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">สถานะบัญชี</label>
            <div class="flex items-center gap-2">
              <span
                :class="[
                  'px-3 py-1 rounded-full text-sm font-medium',
                  authStore.user?.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800',
                ]"
              >
                {{ authStore.user?.is_active ? 'ใช้งานอยู่' : 'ระงับการใช้งาน' }}
              </span>
            </div>
          </div>

          <!-- Action Buttons -->



          <div class="flex gap-4 pt-4">
            <base-button
            type="submit"
            :disabled="isLoading"
            class="w-full"
          >
            <span v-if="isLoading">กำลังบันทึก...</span>
            <span v-else>บันทึกการเปลี่ยนแปลง</span>
          </base-button>
            <!--<button
              type="submit"
              :disabled="isLoading"
              class="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <span v-if="isLoading">กำลังบันทึก...</span>
              <span v-else>บันทึกการเปลี่ยนแปลง</span>
            </button>-->
            <base-button
              type="button"
              @click="resetForm"
              class="w-full bg-neutral-400 text-neutral-700 hover:bg-neutral-500 transition"
              :disabled="isLoading"
            >
              รีเซ็ต
            </base-button>
            <!--
            <button
              type="button"
              @click="resetForm"
              class="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              :disabled="isLoading"
            >
              รีเซ็ต
            </button>-->
          </div>
        </form>
      </div>

      <!-- Security Section -->
      <div class="bg-white rounded-lg shadow-md p-6 mt-6">
        <h2 class="text-xl font-semibold mb-4 text-gray-800">ความปลอดภัย</h2>
        <div class="space-y-4">
          <button
            @click="changePassword"
            class="w-full px-4 py-3 text-left border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center justify-between"
          >
            <div class="flex items-center gap-3">
              <i class="mdi mdi-lock-outline text-gray-600 text-xl"></i>
              <div>
                <p class="font-medium text-gray-800">เปลี่ยนรหัสผ่าน</p>
                <p class="text-sm text-gray-500">เปลี่ยนรหัสผ่านเพื่อความปลอดภัย</p>
              </div>
            </div>
            <i class="mdi mdi-chevron-right text-gray-400"></i>
          </button>

          <button
            @click="logoutAllDevices"
            class="w-full px-4 py-3 text-left border border-red-300 rounded-lg hover:bg-red-50 transition flex items-center justify-between"
          >
            <div class="flex items-center gap-3">
              <i class="mdi mdi-logout-variant text-red-600 text-xl"></i>
              <div>
                <p class="font-medium text-red-800">ออกจากระบบทุกอุปกรณ์</p>
                <p class="text-sm text-red-500">ออกจากระบบในอุปกรณ์อื่นทั้งหมด</p>
              </div>
            </div>
            <i class="mdi mdi-chevron-right text-red-400"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'


const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  full_name: '',
})

const isLoading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

// Computed
const userInitials = computed(() => {
  const name = authStore.user?.full_name || authStore.user?.email || 'U'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})

// Methods
const getRoleName = (roleId?: number) => {
  const roles: Record<number, string> = {
    1: 'เจ้าของ (Owner)',
    2: 'ผู้ดูแลระบบ (Admin)',
    3: 'ผู้ใช้ (User)',
    4: 'ผู้ดู (Viewer)',
    5: 'ผู้ตรวจสอบ (Auditor)',
  }
  return roles[roleId || 3] || 'ผู้ใช้'
}

const resetForm = () => {
  form.full_name = authStore.user?.full_name || ''
}

const updateProfile = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (!form.full_name.trim()) {
    errorMessage.value = 'กรุณากรอกชื่อ-นามสกุล'
    return
  }

  isLoading.value = true

  try {
    // TODO: เรียก API อัพเดตโปรไฟล์
    // await axios.patch('/api/user/profile', { full_name: form.full_name })

    // Mock update
    if (authStore.user) {
      authStore.user.full_name = form.full_name
      localStorage.setItem('user', JSON.stringify(authStore.user))
    }

    successMessage.value = 'บันทึกข้อมูลสำเร็จ'

    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch {
    errorMessage.value = 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
  } finally {
    isLoading.value = false
  }
}

const changePassword = () => {
  // TODO: Implement change password
  alert('ฟีเจอร์เปลี่ยนรหัสผ่านกำลังพัฒนา')
}

const logoutAllDevices = async () => {
  const confirmed = confirm('คุณต้องการออกจากระบบในอุปกรณ์อื่นทั้งหมดใช่หรือไม่?')
  if (!confirmed) return

  try {
    // TODO: เรียก API logout all devices
    // await axios.post('/api/auth/logout-all')

    await authStore.logout()
    router.push('/login')
  } catch {
    alert('เกิดข้อผิดพลาด')
  }
}

const goBack = () => {
  router.back()
}

// Initialize
onMounted(() => {
  resetForm()
})
</script>
