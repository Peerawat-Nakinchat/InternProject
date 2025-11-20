<template>
  <div>
    <AuthLayout>
      <form class="space-y-5" @submit="onSubmit">
        <header class="space-y-1 text-left">
          <h1 class="mb-4 text-xl font-semibold tracking-tight text-slate-900">ลงทะเบียน สมาชิก</h1>
        </header>

        <BaseInput
          label="รหัสบริษัท"
          type="text"
          autocomplete="company_id"
          placeholder=""
          required
          disabled
        />

        <BaseInput
          label="รหัสรายการสมาชิก"
          type="text"
          autocomplete="member_id"
          placeholder=""
          required
          disabled
        />

        <BaseInput
          label="รหัสผู้ใช้ (user id)"
          type="text"
          autocomplete="member_id"
          placeholder=""
          required
          disabled
        />
        <div class="space-y-4">
          <div class="flex flex-row gap-4">
            <BaseInput
              v-model="form.name"
              label="ชื่อ"
              type="text"
              autocomplete="name"
              placeholder="ชื่อจริง"
              required
              :error="formErrors.name"
              @blur="validateField('name')"
            />
            <BaseInput
              v-model="form.surname"
              label="นามสกุล"
              type="text"
              autocomplete="surname"
              placeholder="นามสกุลจริง"
              required
              :error="formErrors.surname"
              @blur="validateField('surname')"
            />
          </div>

          <div class="w-full space-y-1">
            <label class="block text-xs font-medium text-neutral-700">เพศ</label>

            <BaseDropdown v-model="isSexOpen" close-on-click class="w-full">
              <template #trigger>
                <button
                  type="button"
                  class="flex w-full items-center justify-between rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 shadow-sm hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
                >
                  <span>{{ selectedSex ? selectedSex.label : 'เลือกเพศ' }}</span>
                  <svg
                    :class="[
                      'h-4 w-4 text-primary-500 transform transition-transform duration-200',
                      { 'rotate-180': isSexOpen },
                    ]"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 10.939l3.71-3.71a.75.75 0 011.133.976l-.073.084-4.25 4.25a.75.75 0 01-.976.073l-.084-.073-4.25-4.25a.75.75 0 01.02-1.06z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </button>
              </template>

              <div class="py-1">
                <button
                  v-for="option in sexOptions"
                  :key="option.value"
                  type="button"
                  class="flex w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100"
                  @click="onSelectSex(option)"
                >
                  {{ option.label }}
                </button>
              </div>
            </BaseDropdown>

            <p v-if="formErrors.sex" class="text-xs text-red-500 mt-0.5">
              {{ formErrors.sex }}
            </p>
          </div>

          <div class="space-y-1">
            <BaseInput
              label="ที่อยู่ 1"
              type="text"
              autocomplete="address1"
              placeholder="ที่อยู่ 1"
              required
            />
            <BaseInput
              label="ที่อยู่ 2"
              type="text"
              autocomplete="address2"
              placeholder="ที่อยู่ 2"
              required
            />
            <BaseInput
              label="ที่อยู่ 3"
              type="text"
              autocomplete="address3"
              placeholder="ที่อยู่ 3"
              required
            />
          </div>
        </div>
        <BaseInput
          v-model="form.email"
          label="อีเมล"
          type="email"
          autocomplete="email"
          placeholder="example@email.com"
          required
          :error="formErrors.email"
          @blur="validateField('email')"
        />

        <div class="space-y-6 ">
          <BaseInput
            v-model="form.password_hash"
            label="รหัสผ่าน"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            placeholder="**************"
            required
            :error="formErrors.password_hash"
            @blur="validateField('password_hash')"
          >
            <template #append>
              <i
                :class="showPassword ? 'mdi mdi-eye' : 'mdi mdi-eye-off'"
                class="text-xl text-gray-500 cursor-pointer hover:text-primary"
                @click="showPassword = !showPassword"
              />
            </template>
          </BaseInput>

          <BaseInput
            v-model="form.password_confirm"
            label="ยืนยันรหัสผ่าน"
            :type="showConfirmPassword ? 'text' : 'password'"
            autocomplete="new-password"
            placeholder="**************"
            required
            :error="formErrors.password_confirm"
            @blur="validateField('password_confirm')"
          >
            <template #append>
              <i
                :class="showConfirmPassword ? 'mdi mdi-eye' : 'mdi mdi-eye-off'"
                class="text-xl text-gray-500 cursor-pointer hover:text-primary"
                @click="showConfirmPassword = !showConfirmPassword"
              />
            </template>
          </BaseInput>
        </div>

        <div class="flex flex-row gap-4">
          <BaseInput
            label="ตำแหน่ง"
            type="text"
            autocomplete="position"
            placeholder=""
            required
            disabled
          />

          <BaseInput
            label="เข้าร่วมเมื่อวันที่"
            type="date"
            autocomplete="join_date"
            placeholder=""
            required
            disabled
          />
        </div>
        <p v-if="generalError" class="text-sm text-red-500">
          {{ generalError }}
        </p>

        <BaseButton type="submit" class="w-full" :disabled="isSubmitting">
          {{ isSubmitting ? 'กำลังสมัครสมาชิก...' : 'สร้างบัญชีผู้ใช้' }}
        </BaseButton>
      </form>
    </AuthLayout>
  </div>
</template>

<script setup lang="ts">
import BaseButton from '@/components/base/BaseButton.vue'
import BaseDropdown from '@/components/base/BaseDropdown.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { reactive, ref, computed, watch } from 'vue'

type SexValue = 'M' | 'F' | 'O' | ''

interface MemberRegisterForm {
  membership_id: string
  org_id: string
  user_id: string
  role_id: string
  email: string
  password_hash: string
  password_confirm: string
  name: string
  surname: string
  fullname: string
  sex: SexValue
  user_address_1: string
  user_address_2: string
  user_address_3: string
  join_date: string
}

type MemberRegisterErrors = Partial<Record<keyof MemberRegisterForm, string>>

const showPassword = ref(false)
const showConfirmPassword = ref(false)

const form = reactive<MemberRegisterForm>({
  membership_id: '',
  org_id: '',
  user_id: '',
  role_id: '',
  email: '',
  password_hash: '',
  password_confirm: '',
  name: '',
  surname: '',
  fullname: '',
  sex: '',
  user_address_1: '',
  user_address_2: '',
  user_address_3: '',
  join_date: '',
})

const formErrors = reactive<MemberRegisterErrors>({})
const generalError = ref<string | null>(null)
const isSubmitting = ref(false)

interface SexOption {
  label: string
  value: SexValue
}

const sexOptions: SexOption[] = [
  { label: 'ชาย', value: 'M' },
  { label: 'หญิง', value: 'F' },
  { label: 'อื่น ๆ', value: 'O' },
]

const isSexOpen = ref(false)

const selectedSex = computed(() => sexOptions.find((opt) => opt.value === form.sex) ?? null)

const onSelectSex = (option: SexOption) => {
  form.sex = option.value
  isSexOpen.value = false
  validateField('sex')
}

const emailRegex = /^\S+@\S+\.\S+$/
const thaiRegex = /[\u0E00-\u0E7F]/
const upperRegex = /[A-Z]/
const lowerRegex = /[a-z]/
const digitRegex = /[0-9]/
const specialRegex = /[!@#$%^&*(),.?":{}|<>]/

const validators: Partial<Record<keyof MemberRegisterForm, (f: MemberRegisterForm) => string>> = {
  email(f) {
    const value = f.email.trim()
    if (!value) return 'กรุณากรอกอีเมล'
    if (!emailRegex.test(value)) return 'รูปแบบอีเมลไม่ถูกต้อง'
    if (thaiRegex.test(value)) return 'ห้ามใช้ภาษาไทยในอีเมล'
    return ''
  },
  password_hash(f) {
    const value = f.password_hash
    if (!value) return 'กรุณากรอกรหัสผ่าน'
    if (value.length < 6) return 'ต้องมีอย่างน้อย 6 ตัวอักษร'
    if (thaiRegex.test(value)) return 'ห้ามใช้ภาษาไทยในรหัสผ่าน'
    if (!upperRegex.test(value)) return 'ต้องมีตัวพิมพ์ใหญ่ 1 ตัว'
    if (!lowerRegex.test(value)) return 'ต้องมีตัวพิมพ์เล็ก 1 ตัว'
    if (!digitRegex.test(value)) return 'ต้องมีตัวเลข 1 ตัว'
    if (!specialRegex.test(value)) return 'ต้องมีอักขระพิเศษ 1 ตัว'
    return ''
  },
  password_confirm(f) {
    if (!f.password_confirm) return 'กรุณากรอกยืนยันรหัสผ่าน'
    if (f.password_confirm !== f.password_hash) return 'รหัสผ่านไม่ตรงกัน'
    return ''
  },
  name(f) {
    return f.name.trim() ? '' : 'กรุณากรอกชื่อ'
  },
  surname(f) {
    return f.surname.trim() ? '' : 'กรุณากรอกนามสกุล'
  },
  sex(f) {
    if (!f.sex) return 'กรุณาเลือกเพศ'
    if (!['M', 'F', 'O'].includes(f.sex)) return 'เพศไม่ถูกต้อง'
    return ''
  },
}

const validateField = (field: keyof MemberRegisterForm) => {
  const validator = validators[field]
  if (!validator) return true
  const message = validator(form)
  formErrors[field] = message
  return !message
}

const validateAll = () => {
  let ok = true
  Object.keys(validators).forEach((field) => {
    if (!validateField(field as keyof MemberRegisterForm)) ok = false
  })
  return ok
}

watch(
  () => form.email,
  () => {
    if (formErrors.email) validateField('email')
  },
)

watch(
  () => form.password_hash,
  () => {
    if (formErrors.password_hash) validateField('password_hash')
    if (form.password_confirm) validateField('password_confirm')
  },
)

watch(
  () => form.password_confirm,
  () => {
    if (formErrors.password_confirm) validateField('password_confirm')
  },
)

const onSubmit = async (e: Event) => {
  e.preventDefault()
  generalError.value = null

  if (!validateAll()) {
    return
  }

  try {
    isSubmitting.value = true
    form.fullname = `${form.name} ${form.surname}`
    console.log('submit member register form', { ...form })
  } catch  {
    generalError.value = 'เกิดข้อผิดพลาดในการสมัครสมาชิก'
  } finally {
    isSubmitting.value = false
  }
}
</script>
