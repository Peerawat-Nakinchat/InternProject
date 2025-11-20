<template>
  <div>
    <AuthLayout>
      <form class="space-y-5">
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
              label="ชื่อ"
              type="text"
              autocomplete="name"
              placeholder="ชื่อจริง"
              required
            />
            <BaseInput
              label="นามสกุล"
              type="text"
              autocomplete="surname"
              placeholder="นามสกุลจริง"
              required
            />
          </div>

          <div class="w-full space-y-1">
            <label class="block text-xs font-medium text-neutral-700">เพศ</label>
            <BaseDropdown v-model="issexOpen" close-on-click class="w-full">
              <template #trigger>
                <button
                  type="button"
                  class="flex w-full items-center justify-between rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 shadow-sm hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
                >
                  <span>
                    {{ selectedsex ? selectedsex.label : 'เลือกเพศ' }}
                  </span>
                  <svg
                    :class="[
                      'h-4 w-4 text-primary-500 transform transition-transform duration-200',
                      { 'rotate-180': issexOpen },
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
                  v-for="option in sexOption"
                  :key="option.value"
                  type="button"
                  class="flex w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100"
                  @click="onSelectsex(option)"
                >
                  {{ option.label }}
                </button>
              </div>
            </BaseDropdown>
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
          label="อีเมล"
          type="email"
          autocomplete="email"
          placeholder="example@email.com"
          required
        />

        <div class="">
          <BaseInput
            v-model="form.password_hash"
            label="รหัสผ่าน"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            placeholder="**************"
            required
          >
            <template #append>
              <i
                :class="showPassword ? 'mdi mdi-eye' : 'mdi mdi-eye-off'"
                class="text-xl text-gray-500 cursor-pointer hover:text-primary"
                @click="showPassword = !showPassword"
              ></i>
            </template>
          </BaseInput>

          <BaseInput
            v-model="confirmPassword"
            label="ยืนยันรหัสผ่าน"
            :type="showConfirmPassword ? 'text' : 'password'"
            autocomplete="new-password"
            placeholder="**************"
            required
          >
            <template #append>
              <i
                :class="showConfirmPassword ? 'mdi mdi-eye' : 'mdi mdi-eye-off'"
                class="text-xl text-gray-500 cursor-pointer hover:text-primary"
                @click="showConfirmPassword = !showConfirmPassword"
              ></i>
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

        <BaseButton type="submit" variant="Submit" class="w-full"> ลงทะเบียน </BaseButton>
      </form>
    </AuthLayout>
  </div>
</template>

<script setup lang="ts">
import BaseButton from '@/components/base/BaseButton.vue'
import BaseDropdown from '@/components/base/BaseDropdown.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { reactive, ref, computed } from 'vue'

interface MemberRegisterForm {
  membership_id: string
  org_id: string
  user_id: string
  role_id: string
  email: string
  password_hash: string
  name: string
  surname: string
  fullname: string
  sex: string
  address1: string
  address2: string
  address3: string
  join_date: string
}

const showPassword = ref(false)
const showConfirmPassword = ref(false)
const confirmPassword = ref('')

const form = reactive<MemberRegisterForm>({
  membership_id: '',
  org_id: '',
  user_id: '',
  role_id: '',
  email: '',
  password_hash: '',
  name: '',
  surname: '',
  fullname: '',
  sex: '',
  address1: '',
  address2: '',
  address3: '',
  join_date: '',
})

const sexOption: sexOption[] = [
  { label: 'ชาย', value: 'm' },
  { label: 'หญิง', value: 'f' },
  { label: 'อื่นๆ', value: '0' },
]

interface sexOption {
  label: string
  value: string
}

const issexOpen = ref(false)
const selectedsexValue = ref<string | null>(null)

const selectedsex = computed<sexOption | null>(() => {
  return sexOption.find((opt) => opt.value === selectedsexValue.value) ?? null
})

const onSelectsex = (option: sexOption) => {
  selectedsexValue.value = option.value
  form.sex = option.value
}

// const handleSubmit = () => {
//   if (validatePassword()) {
//     form.password_hash = password.value
//   }
// }
</script>
