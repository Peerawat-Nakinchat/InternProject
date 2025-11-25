<template>
  <div class="flex min-h-screen bg-gray-100">
    <!-- PAGE CONTENT -->
    <div class="flex-1 flex flex-col">
      <div class="px-4 mt-4">

      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <Button
            @click="goBack"
            class="w-10 h-10 flex items-center justify-center bg-white/90 backdrop-blur rounded-full shadow-md hover:bg-white transition cursor-pointer"
          >
            <i class="mdi mdi-arrow-left text-gray-700 text-xl"></i>
          </Button>
          <h1 class="text-2xl font-semibold tracking-tight">
            <span class="bg-linear-to-br from-[#1C244B] to-[#682DB5] bg-clip-text text-transparent inline-flex items-center gap-2">
              <i class="mdi mdi-account text-3xl leading-none"></i>
              โปรไฟล์ของฉัน
            </span>
          </h1>
        </div>
      </div>
      <p class="text-neutral-500 text-sm mt-1 pl-15">
        กรอกข้อมูลสำหรับการแก้ไขโปรไฟล์ในระบบของคุณ
      </p>
    </div>

      <div class="w-full max-w-full mx-auto p-4">
        <div class="relative bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <div class="h-36 bg-linear-to-r from-purple-600 to-[#1C244B]"></div>

          <div class="px-6 pb-6">
            <div class="flex items-end gap-4 -mt-12">
              
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

                <label
                  class="absolute bottom-2 right-2 bg-white shadow p-1.5 rounded-full cursor-pointer hover:bg-gray-100 transition"
                >
                  <i class="mdi mdi-camera text-gray-700 text-xl"></i>
                  <input type="file" class="hidden" @change="onImageUpload" />
                </label>
              </div>

              <div class="flex items-center gap-3 w-auto flex-1">
                <div class="flex-1">
                  <h1 class="text-2xl font-bold text-gray-900">{{ form.full_name || userInitials }}</h1>
                  <p class="text-gray-500 text-sm">{{ authStore.user?.email }}</p>
                </div>

                <!-- RIGHT: ปุ่ม -->
                <div class="hidden md:flex items-center gap-3 ml-auto">
                  <base-button class="bg-neutral-400 hover:bg-gray-500" @click="openResetConfirm">รีเซ็ต</base-button>
                  <base-button class="bg-primary text-white px-4 py-2 inline-flex whitespace-nowrap rounded-mb" @click="updateProfile">บันทึกการเปลี่ยนแปลง</base-button>
                </div>

              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
          <div class="bg-white rounded-xl shadow-sm p-6">
            <div class="flex items-center gap-4 mb-4">
              <span
                class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-linear-to-r from-purple-600 to-purple-500 text-white text-lg">
                <i class="mdi mdi-account" aria-hidden="true"></i>
              </span>
              <h2 class="text-lg text-gray-800 font-semibold">ข้อมูลส่วนตัว</h2>
            </div>

            <div class="grid grid-cols-1 gap-4">
              <base-input 
                v-model="form.name" 
                label="ชื่อจริง" 
                placeholder="ชื่อจริง" 
              />

              <base-input 
                v-model="form.surname" 
                label="นามสกุล" 
                placeholder="นามสกุล" 
              />

              <div class="relative">
                <label class="block text-sm font-medium text-neutral-700 mb-1">เพศ</label>

                <div
                  class="w-full rounded-md px-4 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm shadow-sm cursor-pointer flex items-center justify-between transition-all hover:border-purple-400"
                  @click="openGender = !openGender"
                >
                  <span>{{ genderLabel }}</span>
                  <svg
                    class="w- h-4 text-slate-500 transition-transform"
                    :class="openGender ? 'rotate-180' : ''"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                <div
                  v-if="openGender"
                  class="absolute top-full left-0 z-20 w-full mt-2 bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden"
                >
                  <div
                    class="px-4 py-2 text-sm text-slate-700 hover:bg-purple-50 cursor-pointer transition"
                    @click="selectGender('M')"
                  >
                    ชาย
                  </div>

                  <div
                    class="px-4 py-2 text-sm text-slate-700 hover:bg-purple-50 cursor-pointer transition"
                    @click="selectGender('F')"
                  >
                    หญิง
                  </div>

                  <div
                    class="px-4 py-2 text-sm text-slate-700 hover:bg-purple-50 cursor-pointer transition"
                    @click="selectGender('O')"
                  >
                    อื่น ๆ
                  </div>
                </div>
              </div>

              <base-input :model-value="getRoleName(authStore.user?.role_id)" label="บทบาท" disabled />

            </div>
        </div>
        
        <div class="bg-white rounded-xl shadow-sm p-6">
            <div class="flex items-center gap-4 mb-4">
              <span
                class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-linear-to-r from-purple-600 to-purple-500 text-white text-lg">
                <i class="mdi mdi-map" aria-hidden="true"></i>
              </span>
              <h2 class="text-lg text-gray-800 font-semibold">ที่อยู่</h2>
            </div>

            <base-input 
              v-model="form.user_address_1" 
              label="ที่อยู่ 1" 
              placeholder="กรอกที่อยู่"
              class="mb-2"
            />
            <base-input 
              v-model="form.user_address_2" 
              label="ที่อาคาร / ชั้น" 
              placeholder="อาคาร / ชั้น"
              class="mb-2"
            />
            <base-input 
              v-model="form.user_address_3" 
              label="ที่อยู่ 3" 
              placeholder="ตำบล / อำเภอ / จังหวัด"
              class="mb-2"
            />
          </div>

          <div class="bg-white rounded-xl shadow-sm p-6">
            <div class="flex items-center gap-4 mb-4">
              <span
                class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-linear-to-r from-purple-600 to-purple-500 text-white text-lg">
                <i class="mdi mdi-shield-lock" aria-hidden="true"></i>
              </span>
              <h2 class="text-lg text-gray-800 font-semibold">ความปลอดภัย</h2>
            </div>

            <div class="flex items-end justify-between mb-4 gap-4">
              <div class="flex-1">
                <BaseInput 
                  :model-value="authStore.user?.email" 
                  label="อีเมล" disabled 
                />
              </div>

              <button
                @click="changeEmail"
                class="p-1.5 bg-red-100 text-red-600 hover:bg-red-500 hover:text-white rounded-md"
              >
                <i class="mdi mdi-email-edit text-xl"></i>
              </button>
            </div>

            <div class="flex items-end justify-between gap-4">
              <div class="flex-1">
                <BaseInput 
                  model-value="********"
                  type="password" 
                  label="รหัสผ่าน" 
                  disabled
                  :hidePasswordToggle="true"
                />
              </div>

              <button
                @click="changePassword"
                class="p-1.5 bg-red-100 text-red-600 hover:bg-red-500 hover:text-white rounded-md"
              >
                <i class="mdi mdi-lock-reset text-xl"></i>
              </button>
            </div>

            <div
              v-if="showEmailPopup"
              class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            >
              <div class="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
                <h2 class="text-xl font-semibold text-gray-800 mb-4">เปลี่ยนอีเมล</h2>

                <BaseInput 
                  v-model="newEmail" type="email" 
                  label="อีเมลใหม่" 
                  placeholder="example@mail.com" 
                  class="mb-4"
                />
                
                <BaseInput 
                  v-model="passwordForEmail" 
                  type="password" 
                  label="รหัสผ่านปัจจุบัน (เพื่อยืนยัน)" 
                  placeholder="********"
                />

                <p v-if="emailError" class="text-red-500 text-sm mt-2">{{ emailError }}</p>

                <div class="flex justify-end gap-3 mt-6">
                  <base-button class="w-full bg-neutral-400 text-neutral-700 hover:bg-neutral-500" @click="closeEmailPopup">ยกเลิก</base-button>
                  <base-button class="w-full" @click="openEmailConfirm" :disabled="authStore.isLoading">บันทึก</base-button>
                </div>
              </div>
            </div>

            <div
              v-if="showPasswordPopup"
              class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            >
              <div class="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
                <h2 class="text-xl font-semibold text-gray-800 mb-4">เปลี่ยนรหัสผ่าน</h2>

                <BaseInput
                  v-model="oldPassword"
                  label="รหัสผ่านเดิม"
                  :type="showOldPassword ? 'text' : 'password'"
                  class="mb-2"
                >
                  <template #append>
                    <i
                      :class="showOldPassword ? 'mdi mdi-eye' : 'mdi mdi-eye-off'"
                      class="text-xl text-gray-500 cursor-pointer hover:text-primary"
                      @click="showOldPassword = !showOldPassword"
                    />
                  </template>
                </BaseInput>

                <BaseInput
                  v-model="newPassword"
                  label="รหัสผ่านใหม่"
                  :type="showNewPassword ? 'text' : 'password'"
                  class="mb-2"
                >
                  <template #append>
                    <i
                      :class="showNewPassword ? 'mdi mdi-eye' : 'mdi mdi-eye-off'"
                      class="text-xl text-gray-500 cursor-pointer hover:text-primary"
                      @click="showNewPassword = !showNewPassword"
                    />
                  </template>
                </BaseInput>

                <BaseInput
                  v-model="confirmPassword"
                  label="ยืนยันรหัสผ่านใหม่"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  class="mb-2"
                >
                  <template #append>
                    <i
                      :class="showConfirmPassword ? 'mdi mdi-eye' : 'mdi mdi-eye-off'"
                      class="text-xl text-gray-500 cursor-pointer hover:text-primary"
                      @click="showConfirmPassword = !showConfirmPassword"
                    />
                  </template>
                </BaseInput>

                <p v-if="passwordError" class="text-red-500 text-sm mt-2">
                  {{ passwordError }}
                </p>

                <div class="flex justify-end gap-3 mt-6">
                  <base-button
                    class="w-full bg-neutral-400 text-neutral-700 hover:bg-neutral-500"
                    @click="closePasswordPopup"
                  >
                    ยกเลิก
                  </base-button>

                  <base-button class="w-full" @click="openPasswordConfirm">
                    บันทึก
                  </base-button>
                </div>
              </div>
            </div>
            
            <div class="flex items-center gap-4 mt-6 mb-4">
              <span
                class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-linear-to-r from-purple-600 to-purple-500 text-white text-lg">
                <i class="mdi mdi-shield-lock" aria-hidden="true"></i>
              </span>
              <h2 class="text-lg text-gray-800 font-semibold">การเชื่อมต่อระบบอื่น</h2>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="relative">
                <label class="block text-sm font-medium text-neutral-700 mb-1">เชื่อมต่อหรือไม่ *</label>
                <div
                  class="w-full rounded-md px-4 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm shadow-sm cursor-pointer flex items-center justify-between transition-all hover:border-purple-400"
                  @click="openIntegrate = !openIntegrate"
                >
                  <span>{{ form.user_integrate === 'Y' ? 'เชื่อมต่อ' : 'ไม่เชื่อมต่อ' }}</span>

                  <svg
                    class="w-4 h-4 text-slate-500 transition-transform"
                    :class="openIntegrate ? 'rotate-180' : ''"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                <div
                  v-if="openIntegrate"
                  class="absolute top-full left-0 z-20 w-full mt-2 bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden"
                >
                  <div
                    class="px-4 py-2 text-sm text-slate-700 hover:bg-purple-50 cursor-pointer transition"
                    @click="selectIntegrate('N')"
                  >
                    ไม่เชื่อม
                  </div>

                  <div
                    class="px-4 py-2 text-sm text-slate-700 hover:bg-purple-50 cursor-pointer transition"
                    @click="selectIntegrate('Y')"
                  >
                    เชื่อม
                  </div>
                </div>
              </div>

              <base-input
                v-model="form.user_integrate_provider_id"
                label="Provider ID"
                placeholder="Provider ID"
                :disabled="form.user_integrate !== 'Y'"
              />
            </div>

            <div class="grid grid-cols-1 mt-4">
              <base-input
                v-model="form.user_integrate_url"
                label="URL เชื่อมต่อข้อมูล"
                placeholder="https://..."
                :disabled="form.user_integrate !== 'Y'"
              />
            </div>

            <hr class="my-3 border-t-3 border-gray-400 mt-6 md:hidden" />
            <div class="p-3 flex gap-4 md:hidden">
              <base-button class="w-full bg-neutral-400" @click="openResetConfirm">รีเซ็ต</base-button>
              <base-button class="w-full" @click="updateProfile">บันทึก</base-button>
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>

  <ConfirmDialog
    v-model="showResetConfirm"
    title="ยืนยันการรีเซ็ตข้อมูล"
    message="คุณแน่ใจหรือไม่ที่จะรีเซ็ตข้อมูลในฟอร์มทั้งหมดเป็นค่าเริ่มต้น?"
    confirmText="รีเซ็ต"
    cancelText="ยกเลิก"
    @confirm="resetForm" 
    icon="mdi-autorenew"
  />

  <ConfirmDialog
    v-model="showEmailConfirm"
    title="ยืนยันการเปลี่ยนอีเมล"
    :message="`คุณต้องการเปลี่ยนเป็น ${newEmail} ใช่หรือไม่? ระบบจะทำการบันทึกอีเมลใหม่ของคุณ`"
    confirmText="เปลี่ยนอีเมล"
    cancelText="ยกเลิก"
    @confirm="saveEmail"
    @cancel="closeEmailConfirm"
    icon="mdi-email-edit"
  />

  <ConfirmDialog
    v-model="showPasswordConfirm"
    title="ยืนยันการเปลี่ยนรหัสผ่าน"
    message="เมื่อเปลี่ยนรหัสผ่านสำเร็จ ระบบจะนำคุณออกจากระบบโดยอัตโนมัติ คุณต้องเข้าสู่ระบบด้วยรหัสผ่านใหม่"
    confirmText="เปลี่ยนรหัสผ่าน"
    cancelText="ยกเลิก"
    @confirm="savePassword"
    @cancel="closePasswordConfirm"
    icon="mdi-lock-reset"
  />

  <ConfirmDialog
    v-model="showSaveConfirm"
    title="ยืนยันการบันทึกโปรไฟล์"
    message="คุณแน่ใจหรือไม่ที่จะบันทึกการเปลี่ยนแปลงทั้งหมดในโปรไฟล์ของคุณ?"
    confirmText="บันทึก"
    cancelText="ยกเลิก"
    @confirm="saveProfileChanges" 
    :loading="isLoading"
    icon="mdi-content-save"
  />
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const router = useRouter()
const authStore = useAuthStore()

// =====================================================
// FORM MODEL
// =====================================================
const form = reactive({
  name: '',
  surname: '',
  full_name: '',
  sex: '',
  password: '',
  user_address_1: '',
  user_address_2: '',
  user_address_3: '',
  profile_image_url: '',
  user_integrate: '',
  user_integrate_url: '',
  user_integrate_provider_id: '',
})

// =====================================================
// STATE
// =====================================================
const isLoading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

// Dropdown
const openGender = ref(false)

// Confirm Dialog states
const showResetConfirm = ref(false) //
const showEmailConfirm = ref(false) //
const showPasswordConfirm = ref(false) //
const showSaveConfirm = ref(false)

// Email popup
const showEmailPopup = ref(false)
const newEmail = ref('')
const emailError = ref('')
const passwordForEmail = ref('') // เพิ่ม state สำหรับรหัสผ่านยืนยัน

// Password popup
const showPasswordPopup = ref(false)
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref('')
const showOldPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

// Dropdown: integrate
const openIntegrate = ref(false)

// =====================================================
// COMPUTED
// =====================================================
const genderLabel = computed(() => {
  switch (form.sex) {
    case 'M': return 'ชาย'
    case 'F': return 'หญิง'
    case 'O': return 'อื่น ๆ'
    default: return 'เลือกเพศ'
  }
})

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

// =====================================================
// EVENTS: Gender dropdown
// =====================================================
const selectGender = (value: string) => {
  form.sex = value
  openGender.value = false
}


const selectIntegrate = (value: string) => {
  form.user_integrate = value
  openIntegrate.value = false
}

// =====================================================
// EVENTS: Upload image
// =====================================================
const onImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    form.profile_image_url = reader.result as string
  }
  reader.readAsDataURL(file)
}

// =====================================================
// POPUP: Change Email
// =====================================================
const changeEmail = () => {
  newEmail.value = authStore.user?.email || ''
  passwordForEmail.value = '' // ล้างค่า
  emailError.value = ''
  showEmailPopup.value = true
}

const closeEmailPopup = () => {
  showEmailPopup.value = false
}

// ฟังก์ชันเปิด Confirmation Dialog สำหรับอีเมล
const openEmailConfirm = () => {
  emailError.value = ''

  if (!newEmail.value.trim() || !passwordForEmail.value.trim()) { 
    emailError.value = 'กรุณากรอกอีเมลใหม่และรหัสผ่านเพื่อยืนยัน'
    return
  }
  
  if (newEmail.value.trim() === authStore.user?.email) {
    emailError.value = 'อีเมลใหม่ต้องไม่ซ้ำกับอีเมลเดิม'
    return
  }
  
  // ปิด Email Popup หลักก่อน
  showEmailPopup.value = false 
  setTimeout(() => {
    showEmailConfirm.value = true // เปิด Confirmation Dialog
  }, 20)
}

// ฟังก์ชันปิด Confirmation Dialog สำหรับอีเมล
const closeEmailConfirm = () => {
  showEmailConfirm.value = false
  showEmailPopup.value = true
}

// ฟังก์ชันบันทึกอีเมลจริง (ถูกเรียกหลังจากยืนยันแล้ว)
const saveEmail = async () => { 
  showEmailConfirm.value = false // ปิด Confirm Dialog
  
  setTimeout(async () => {
    // 1. ลองเรียก Pinia Action/API
    const result = await authStore.changeEmail({
      newEmail: newEmail.value.trim(),
      password: passwordForEmail.value,
    })

    if (result.success) {
      successMessage.value = 'เปลี่ยนอีเมลสำเร็จ'
      closeEmailPopup()
      setTimeout(() => (successMessage.value = ''), 3000)
    } else {
      // 2. LOGIC ดักรหัสผ่านไม่ถูกต้อง
      const error = result.error || '' // ใช้ค่าว่างแทนค่า default เพื่อให้ดัก Error ได้ละเอียดขึ้น

      let displayError = 'เกิดข้อผิดพลาดในการเปลี่ยนอีเมล' // Default error message

      // ตรวจสอบข้อความ Error ที่บ่งชี้ถึงรหัสผ่าน/การรับรองความถูกต้อง
      // เพิ่มการตรวจสอบแบบรวมหลายคำเพื่อครอบคลุม Error จาก API
      if (
        error.includes('รหัสผ่านไม่ถูกต้อง') || 
        error.includes('Incorrect password') || 
        error.includes('Invalid credentials') ||
        error.includes('authentication failed')
      ) {
        displayError = 'รหัสผ่านปัจจุบันไม่ถูกต้อง ไม่สามารถเปลี่ยนอีเมลได้'
      } else if (error.trim().length > 0) {
        // หากมีข้อความ Error อื่น ๆ ที่ไม่ใช่รหัสผ่าน ให้แสดงข้อความนั้น
        displayError = error
      }
      
      emailError.value = displayError
      showEmailPopup.value = true // ถ้าเกิดข้อผิดพลาด ให้เปิด Email Popup หลักกลับมา
    }
  }, 20)
}

defineProps({
  hidePasswordToggle: { type: Boolean, default: false }
})

// =====================================================
// POPUP: Change Password
// =====================================================
const changePassword = () => {
  oldPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  passwordError.value = ''
  showPasswordPopup.value = true
}

const closePasswordPopup = () => {
  showPasswordPopup.value = false
}

// ฟังก์ชันเปิด Confirmation Dialog สำหรับรหัสผ่าน (มีการตรวจสอบข้อมูลก่อน)
const openPasswordConfirm = () => {
  passwordError.value = ''

  if (!oldPassword.value.trim()) {
    passwordError.value = 'กรุณากรอกรหัสผ่านเดิม'
    return
  }

  if (newPassword.value.length < 6) {
    passwordError.value = 'รหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'รหัสผ่านใหม่ไม่ตรงกัน'
    return
  }
  
  if (oldPassword.value === newPassword.value) {
    passwordError.value = 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม'
    return
  }
  
  // ปิด Password Popup หลักก่อน
  showPasswordPopup.value = false 
  setTimeout(() => {
    showPasswordConfirm.value = true // เปิด Confirmation Dialog
  }, 20)
}

// ฟังก์ชันปิด Confirmation Dialog สำหรับรหัสผ่าน
const closePasswordConfirm = () => {
  showPasswordConfirm.value = false
  showPasswordPopup.value = true
}


// ฟังก์ชันบันทึกรหัสผ่านจริง (ถูกเรียกหลังจากยืนยันแล้ว)
const savePassword = async () => {
  showPasswordConfirm.value = false // ปิด Confirm Dialog

  const result = await authStore.changePassword({
    oldPassword: oldPassword.value,
    newPassword: newPassword.value,
  })

  if (result.success) {
    // การเปลี่ยนรหัสผ่านจะทำให้ logout
    closePasswordPopup()
    alert('เปลี่ยนรหัสผ่านสำเร็จ คุณต้องเข้าสู่ระบบใหม่')
    router.push('/login') 
  } else {
    passwordError.value = result.error || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน'
    showPasswordPopup.value = true // ถ้ามีข้อผิดพลาด ให้เปิด Popup หลักกลับมา
  }
}

// =====================================================
// FORM: Reset
// =====================================================
// ฟังก์ชันที่ถูกเรียกเมื่อกดยืนยันจาก ConfirmDialog
const resetForm = () => {
  const u = authStore.user
  if (!u) return

  if (u.full_name) {
    const parts = u.full_name.split(' ')
    form.name = parts[0] || ''
    form.surname = parts.slice(1).join(' ') || ''
  }

  form.full_name = u.full_name || ''
  form.sex = u.sex || ''
  form.user_address_1 = u.user_address_1 || ''
  form.user_address_2 = u.user_address_2 || ''
  form.user_address_3 = u.user_address_3 || ''
  form.profile_image_url = u.profile_image_url || ''
  
  showResetConfirm.value = false // ปิด Dialog หลังทำรายการ
}

// ฟังก์ชันที่ถูกเรียกจากปุ่ม "รีเซ็ต" เพื่อเปิด ConfirmDialog
const openResetConfirm = () => {
  showResetConfirm.value = true
}


// =====================================================
// FORM: Save (Update Profile)
// =====================================================
const updateProfile = () => {
  errorMessage.value = ''
  successMessage.value = ''
  
  // 1. Validation Logic
  if (!form.name.trim() || !form.surname.trim()) {
    errorMessage.value = 'กรุณากรอกชื่อและนามสกุลก่อนบันทึก'
    return
  }
  
  // 2. Open Confirm Dialog
  showSaveConfirm.value = true
}

// สร้างฟังก์ชันใหม่สำหรับ Logic การเรียก API จริง
const saveProfileChanges = async () => {
  showSaveConfirm.value = false // ปิด Confirm Dialog

  errorMessage.value = ''
  successMessage.value = ''
  isLoading.value = true // ตั้งค่า Loading 

  // คำนวณ full_name ก่อนส่ง
  form.full_name = fullNameComputed.value

  try {
    const result = await authStore.updateProfile({
        name: form.name,
        surname: form.surname,
        full_name: form.full_name,
        sex: form.sex,
        user_address_1: form.user_address_1,
        user_address_2: form.user_address_2,
        user_address_3: form.user_address_3,
        profile_image_url: form.profile_image_url,
        user_integrate: form.user_integrate, 
        user_integrate_provider_id: form.user_integrate_provider_id, 
        user_integrate_url: form.user_integrate_url, 
    })

    if (result.success) {
      successMessage.value = "บันทึกข้อมูลสำเร็จ"
      setTimeout(() => (successMessage.value = ''), 3000)
    } else {
      errorMessage.value = result.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล"
    }

  } catch (err) {
    errorMessage.value = "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้"
  } finally {
    isLoading.value = false
  }
}

// =====================================================
// OTHER
// =====================================================
const goBack = () => {
  router.back()
}

onMounted(() => {
  resetForm()
})
</script>