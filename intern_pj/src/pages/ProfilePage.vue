<template>
  <div class="min-h-screen bg-gray-100 py-8">
    <div class="max-w-4xl mx-auto">

      <!-- ========== PROFILE HEADER FACEBOOK STYLE ========== -->
      <div class="relative bg-white rounded-xl shadow-sm overflow-hidden mb-6">
        
        <!-- Back Button -->
        <button
          @click="goBack"
          class="absolute top-4 left-4 w-10 h-10 flex items-center justify-center
                bg-white/90 backdrop-blur rounded-full shadow-md
                hover:bg-white transition cursor-pointer"
        >
          <i class="mdi mdi-arrow-left text-gray-700 text-xl"></i>
        </button>
        
        <!-- Cover Background -->
        <div class="h-36 bg-linear-to-r from-purple-600 to-blue-600"></div>

        <!-- Profile image + name -->
        <div class="px-6 pb-6">
          <div class="flex items-end gap-4 -mt-12">
            
            <!-- Profile Picture -->
            <div class="relative">
              <img
                v-if="form.profile_image_url"
                :src="form.profile_image_url"
                class="w-28 h-28 rounded-full object-cover border-4 border-white shadow"
              />

              <div
                v-else
                class="w-28 h-28 rounded-full bg-purple-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow"
              >
                {{ userInitials }}
              </div>

              <!-- Upload button -->
              <label
                class="absolute bottom-2 right-2 bg-white shadow p-1.5 rounded-full cursor-pointer hover:bg-gray-100 transition"
              >
                <i class="mdi mdi-camera text-gray-700 text-xl"></i>
                <input type="file" class="hidden" @change="onImageUpload" />
              </label>
            </div>

            <!-- Name + Email -->
            <div class="flex-1">
              <h1 class="text-2xl font-bold text-gray-900">{{ form.full_name || userInitials }}</h1>
              <p class="text-gray-500 text-sm">{{ authStore.user?.email }}</p>
            </div>
          </div>
          
        </div>
      </div>

      <!-- ========== MAIN PROFILE SECTIONS ========== -->
      <div class="space-y-6">

        <!-- ========== PERSONAL INFO CARD ========== -->
        <div class="bg-white rounded-xl shadow-sm p-6">
          <h2 class="text-xl font-semibold text-gray-800 mb-6">ข้อมูลส่วนตัว</h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <base-input v-model="form.name" label="ชื่อจริง" placeholder="ชื่อจริง" />
            <base-input v-model="form.surname" label="นามสกุล" placeholder="นามสกุล" />

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">เพศ</label>
              <select
                v-model="form.sex"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">เลือกเพศ</option>
                <option value="M">ชาย</option>
                <option value="F">หญิง</option>
                <option value="O">อื่นๆ</option>
              </select>
            </div>

            <base-input :model-value="getRoleName(authStore.user?.role_id)" label="บทบาท" disabled />

          </div>

          <div class="grid grid-cols-1 gap-4 mt-4">
            <base-input v-model="form.user_address_1" label="ที่อยู่ 1" placeholder="กรอกที่อยู่" />
            <base-input v-model="form.user_address_2" label="ที่อยู่ 2" placeholder="อาคาร / ชั้น" />
            <base-input v-model="form.user_address_3" label="ที่อยู่ 3" placeholder="ตำบล / อำเภอ / จังหวัด" />
          </div>

          <div class="grid grid-cols-1 gap-4 mt-4">
            <h2 class="text-xl font-semibold text-gray-800">ความปลอดภัย</h2>

            <!-- Email Row -->
            <div class="flex items-end justify-between mb-4">
              <div class="flex-1">
                <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  disabled
                  :value="authStore.user?.email"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                />
              </div>

              <button
                @click="changeEmail"
                class="ml-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700"
              >
                Change email
              </button>
            </div>

            <!-- Password Row -->
            <div class="flex items-end justify-between">
              <div class="flex-1">
                <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  disabled
                  type="password"
                  value="************"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                />
              </div>

              <button
                @click="changePassword"
                class="ml-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700"
              >
                Change password
              </button>
            </div>
            
            <!-- <base-input :model-value="authStore.user?.auth_provider" label="Provider" disabled /> -->

            <div class="mt-2">
              <label class="block text-sm font-medium text-gray-700 mb-2">สถานะบัญชี</label>
              <span
                :class="[
                  'px-3 py-1 rounded-full text-sm font-medium',
                  authStore.user?.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                ]"
              >
                {{ authStore.user?.is_active ? 'ใช้งานอยู่' : 'ระงับการใช้งาน' }}
              </span>
            </div>
          </div>
        </div>

        <!-- ========== INTEGRATION CARD ========== -->
        <div class="bg-white rounded-xl shadow-sm p-6">
          <h2 class="text-xl font-semibold text-gray-800 mb-6">การเชื่อมต่อระบบอื่น</h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">เชื่อมต่อหรือไม่</label>
              <select
                v-model="form.user_integrate"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="N">ไม่เชื่อม</option>
                <option value="Y">เชื่อม</option>
              </select>
            </div>

            <base-input
              v-if="form.user_integrate === 'Y'"
              v-model="form.user_integrate_provider_id"
              label="Provider ID"
              placeholder="Provider ID"
            />
          </div>

          <base-input
            v-if="form.user_integrate === 'Y'"
            v-model="form.user_integrate_url"
            label="URL เชื่อมต่อข้อมูล"
            placeholder="https://..."
            class="mt-4"
          />
        </div>

        <!-- ========== BUTTONS ========== -->
        <div class="bg-white rounded-xl shadow-sm p-6 flex gap-4">
          <base-button class="w-full" @click="updateProfile">บันทึกการเปลี่ยนแปลง</base-button>

          <base-button
            @click="resetForm"
            class="w-full bg-neutral-400 text-neutral-700 hover:bg-neutral-500"
          >
            รีเซ็ต
          </base-button>
        </div>

        <!-- ========== SECURITY SECTION ========== -->
        <div class="bg-white rounded-xl shadow-sm p-6">
          <!-- <h2 class="text-xl font-semibold mb-6 text-gray-800">ความปลอดภัย</h2>

          <button
            @click="changePassword"
            class="w-full px-4 py-3 border rounded-lg hover:bg-gray-50 flex items-center justify-between"
          >
            <div class="flex items-center gap-3">
              <i class="mdi mdi-lock-outline text-gray-600 text-xl"></i>
              <div>
                <p class="font-medium text-gray-800">เปลี่ยนรหัสผ่าน</p>
                <p class="text-sm text-gray-500">เพื่อความปลอดภัยของบัญชี</p>
              </div>
            </div>
            <i class="mdi mdi-chevron-right text-gray-400"></i>
          </button> -->

          <button
            @click="logoutAllDevices"
            class="w-full px-4 py-3 border border-red-300 rounded-lg hover:bg-red-50 flex items-center justify-between mt-4"
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

// ==============================
// FORM MODEL
// ==============================
const form = reactive({
  name: '',
  surname: '',
  full_name: '',
  sex: '',
  user_address_1: '',
  user_address_2: '',
  user_address_3: '',
  profile_image_url: '',
  user_integrate: 'N',
  user_integrate_url: '',
  user_integrate_provider_id: '',
})

const isLoading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

const changeEmail = () => {
  alert("ฟีเจอร์เปลี่ยนอีเมลกำลังพัฒนา")
}

// ==============================
// COMPUTED
// ==============================

// รวมชื่อจริง + นามสกุล
const fullNameComputed = computed(() => {
  return `${form.name} ${form.surname}`.trim()
})

const userInitials = computed(() => {
  const name = authStore.user?.full_name || authStore.user?.email || 'U'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})

// Role Name Map
const getRoleName = (roleId?: number) => {
  const roles: Record<number, string> = {
    1: 'เจ้าของ (Owner)',
    2: 'ผู้ดูแลระบบ (Admin)',
    3: 'ผู้ใช้ (User)',
    4: 'ผู้ดู (Viewer)',
    5: 'ผู้ตรวจสอบ (Auditor)'
  }
  return roles[roleId || 3] || 'ผู้ใช้'
}

// ==============================
// IMAGE UPLOAD
// ==============================
const onImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return  // ⬅️ แก้ error ทันที

  const formData = new FormData()
  formData.append("file", file)

  // อ่าน preview
  const reader = new FileReader()
  reader.onload = () => {
    form.profile_image_url = reader.result as string
  }
  reader.readAsDataURL(file)
}

// ==============================
// RESET FORM
// ==============================
const resetForm = () => {
  const u = authStore.user

  // แยกชื่อ-นามสกุลจาก full_name
  if (u?.full_name) {
    const parts = u.full_name.split(' ')
    form.name = parts[0] || ''
    form.surname = parts.slice(1).join(' ') || '' // รองรับชื่อ-นามสกุลหลายคำ
  }

  form.full_name = u?.full_name || ''
  form.sex = u?.sex || ''
  form.user_address_1 = u?.user_address_1 || ''
  form.user_address_2 = u?.user_address_2 || ''
  form.user_address_3 = u?.user_address_3 || ''
  form.profile_image_url = u?.profile_image_url || ''
  // form.user_integrate = u?.user_integrate || 'N'
  // form.user_integrate_url = u?.user_integrate_url || ''
  // form.user_integrate_provider_id = u?.user_integrate_provider_id || ''
}

// ==============================
// UPDATE PROFILE
// ==============================
const updateProfile = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  // รวมชื่อก่อนส่ง
  form.full_name = fullNameComputed.value

  if (!form.name.trim() || !form.surname.trim()) {
    errorMessage.value = 'กรุณากรอกชื่อและนามสกุล'
    return
  }

  isLoading.value = true

  try {
    // TODO: call real API
    // await axios.patch('/api/user/profile', form)

    // Mock: update authStore
    if (authStore.user) {
      Object.assign(authStore.user, form)
      localStorage.setItem('user', JSON.stringify(authStore.user))
    }

    successMessage.value = 'บันทึกข้อมูลสำเร็จ'

    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (err) {
    errorMessage.value = 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
  } finally {
    isLoading.value = false
  }
}

// ==============================
// EVENT -> Change Password
// ==============================
const changePassword = () => {
  alert('ฟีเจอร์เปลี่ยนรหัสผ่านกำลังพัฒนา')
}

// ==============================
// EVENT -> Logout all devices
// ==============================
const logoutAllDevices = async () => {
  const confirmed = confirm('คุณต้องการออกจากระบบในอุปกรณ์อื่นทั้งหมดใช่หรือไม่?')
  if (!confirmed) return

  try {
    await authStore.logout()
    router.push('/login')
  } catch {
    alert('เกิดข้อผิดพลาด')
  }
}

// ==============================
// GO BACK
// ==============================
const goBack = () => {
  router.back()
}

// ==============================
// ON MOUNT
// ==============================
onMounted(() => {
  resetForm()
})
</script>

