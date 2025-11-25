<template>
  <div class="min-h-full py-2 px-4 md:px-8 lg:px-16">

    <transition name="fade">
      <div v-if="loading" class="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-1000">
        <LoadingMessage title="กำลังสร้างบริษัท" subtitle="โปรดรอสักครู่" />
      </div>
    </transition>

    <form @submit.prevent="onSubmit" class="max-w-5xl mx-auto space-y-4">

      <!-- Page Title -->
      <div class="flex justify-between">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">
            <span
              class="bg-linear-to-br from-[#1C244B] to-[#682DB5] bg-clip-text text-transparent inline-flex items-center gap-2">
              <i class="mdi mdi-home-modern text-[1.4rem] leading-none"></i>
              สร้างบริษัทใหม่
            </span>
          </h1>

          <p class="text-neutral-500 text-sm mt-1">
            กรอกข้อมูลสำหรับการสร้างบริษัทใหม่ในระบบของคุณ
          </p>
        </div>

        <!-- Submit -->
<div class="flex justify-end">
  <button
    type="submit"
    class="h-12 inline-flex items-center justify-center
           rounded-full sm:rounded-lg
           bg-linear-to-br from-[#1C244B] to-[#682DB5] text-white font-medium shadow-md
           transition-all duration-300 hover:brightness-110 active:scale-95
           px-4 sm:px-8 gap-0 sm:gap-2"
  >
    <i class="mdi mdi-domain-plus text-lg"></i>
    <span class="hidden sm:inline">สร้างบริษัท</span>
  </button>
</div>


      </div>
      <p v-if="errorMessage" class="text-red-500 text-sm text-center mt-2">
        {{ errorMessage }}
      </p>

      <!-- Section: ข้อมูลบริษัท -->
      <section class="bg-white rounded-xl shadow-sm border border-neutral-200 p-8 space-y-8">

        <div class="flex items-center gap-4 mb-4">
          <span
            class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-linear-to-r from-purple-600 to-purple-500 text-white text-lg">
            <i class="mdi mdi-domain" aria-hidden="true"></i>
          </span>
          <h2 class="text-lg text-gray-800 font-semibold">ข้อมูลบริษัท</h2>
        </div>


        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mt-2">

          <div class="space-y-4">
            <BaseInput v-model="form.org_name" label="ชื่อบริษัท *" placeholder="กรอกชื่อบริษัท" input-class="h-11" />

            <BaseInput v-model="form.org_code" label="รหัสบริษัท *" placeholder="เช่น CMP001" input-class="h-11" />

            <div class="space-y-1">
              <label class="text-sm font-medium text-neutral-700">Integrate System *</label>

              <BaseDropdown v-model="isIntegrationOpen" close-on-click class="w-full">
                <template #trigger>
                  <button type="button" class="flex w-full items-center justify-between rounded-lg border border-neutral-300
                      bg-white px-3 h-10 text-sm text-neutral-700 hover:bg-neutral-50 shadow-sm">
                    <span>{{ selectedIntegration ? selectedIntegration.label : "เลือกการเชื่อมต่อระบบ" }}</span>
                    <i class="mdi mdi-chevron-down text-primary-500 text-lg"></i>
                  </button>
                </template>

                <div class="py-1">
                  <button v-for="option in integrationOptions" :key="option.value"
                    class="w-full px-3 py-2 text-left text-sm hover:bg-neutral-100"
                    @click="onSelectIntegration(option)">
                    {{ option.label }}
                  </button>
                </div>
              </BaseDropdown>
            </div>
          </div>

          <div class="space-y-4">
            <BaseInput v-model="form.org_address_1" label="ที่อยู่ 1" placeholder="กรอกที่อยู่ 1" input-class="h-11" />

            <BaseInput v-model="form.org_address_2" label="ที่อยู่ 2" placeholder="กรอกที่อยู่ 2" input-class="h-11" />

            <BaseInput v-model="form.org_address_3" label="ที่อยู่ 3" placeholder="กรอกที่อยู่ 3" input-class="h-11" />
          </div>

        </div>
        <div class="flex items-center gap-4 mb-4">
          <span
            class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-linear-to-r from-purple-600 to-purple-500 text-white text-lg">
            <i class="mdi mdi-lan-connect" aria-hidden="true"></i>
          </span>
          <h2 class="text-lg text-gray-800 font-semibold">การเชื่อมต่อระบบ</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <BaseInput v-model="form.org_integrate_provider_id" label="Integration Provider"
            placeholder="กรอก Provider ID" />

          <BaseInput v-model="form.org_integrate_passcode" label="Integration Passcode" type="password"
            placeholder="กรอกรหัสจากระบบภายนอก" />

          <BaseInput v-model="form.org_integrate_url" label="Integration URL" type="url" placeholder="https://..." />
        </div>
      </section>
    </form>
  </div>
</template>



<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

import BaseInput from '@/components/base/BaseInput.vue'
import BaseDropdown from '@/components/base/BaseDropdown.vue'

import type { CreateCompanyForm, IntegrationOption } from '@/types/company'
import { createCompany } from '@/services/useCompany'
import LoadingMessage from '@/components/loading/LoadingMessage.vue'

const auth = useAuthStore()
const router = useRouter()

// ฟอร์มข้อมูลบริษัท
const form = reactive<CreateCompanyForm>({
  org_id: '',
  org_name: '',
  org_code: '',
  owner_user_id: '',
  org_address_1: '',
  org_address_2: '',
  org_address_3: '',
  org_integrate: '',
  org_integrate_url: '',
  org_integrate_provider_id: '',
  org_integrate_passcode: ''
})

// ตั้งค่า owner_user_id
onMounted(() => {
  // ✅ ตรวจสอบว่า user login แล้วหรือยัง
  if (!auth.isAuthenticated || !auth.user) {
    router.push('/login')
    return
  }

  form.owner_user_id = auth.user.user_id
  console.log('✅ User authenticated:', auth.user.email)
  console.log('✅ User ID:', auth.user.user_id)
})

// Integration Dropdown
const integrationOptions: IntegrationOption[] = [
  { label: 'เชื่อมต่อข้อมูลบริษัท', value: 'Y' },
  { label: 'ไม่เชื่อมต่อข้อมูลบริษัท', value: 'N' }
]

const isIntegrationOpen = ref(false)
const selectedIntegrationValue = ref<string | null>(null)

const selectedIntegration = computed(() => {
  return integrationOptions.find(o => o.value === selectedIntegrationValue.value) || null
})

const onSelectIntegration = (option: IntegrationOption) => {
  selectedIntegrationValue.value = option.value
  form.org_integrate = option.value
}

// Validation
const validateForm = () => {
  if (!form.org_name.trim()) return 'กรุณากรอกชื่อบริษัท'
  if (!form.org_code.trim()) return 'กรุณากรอกรหัสบริษัท'
  if (!form.org_integrate) return 'กรุณาเลือกการเชื่อมต่อระบบ'

  if (form.org_integrate === 'Y') {
    if (!form.org_integrate_provider_id.trim()) return 'กรุณากรอก Provider ID'
    if (!form.org_integrate_passcode.trim()) return 'กรุณากรอก Passcode'
  }

  return null
}

// Submit
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const onSubmit = async () => {
  errorMessage.value = null
  successMessage.value = null
  loading.value = true

  // ✅ Debug log
  console.group('🚀 Creating Company')
  console.log('User:', auth.user)
  console.log('Access Token:', auth.accessToken ? '✅ มี token' : '❌ ไม่มี token')
  console.log('Payload:', {
    org_name: form.org_name,
    org_code: form.org_code,
    owner_user_id: form.owner_user_id,
  })
  console.groupEnd()

  // Validate
  const validationError = validateForm()
  if (validationError) {
    errorMessage.value = validationError
    loading.value = false
    return
  }

  // ตรวจสอบ authentication
  if (!auth.isAuthenticated) {
    errorMessage.value = 'กรุณาเข้าสู่ระบบก่อน'
    loading.value = false
    router.push('/login')
    return
  }

  try {
    const payload = {
      org_name: form.org_name,
      org_code: form.org_code,
      owner_user_id: form.owner_user_id,
      org_address_1: form.org_address_1,
      org_address_2: form.org_address_2,
      org_address_3: form.org_address_3,
      org_integrate: form.org_integrate,
      org_integrate_url: form.org_integrate_url,
      org_integrate_provider_id: form.org_integrate_provider_id,
      org_integrate_passcode: form.org_integrate_passcode
    }

    const result = await createCompany(payload)

    console.log('✅ สร้างบริษัทสำเร็จ:', result)
    successMessage.value = 'สร้างบริษัทสำเร็จ!'

    // Reset form และ redirect หลัง 2 วินาที
    setTimeout(() => {
      resetForm()
      router.push('/') // หรือหน้าที่ต้องการ
    }, 2000)

  } catch (err: any) {
    console.error('❌ Create company error:', err)
    errorMessage.value = err.message || 'เกิดข้อผิดพลาดในการสร้างบริษัท'
  } finally {
    loading.value = false
  }
}

// Reset form
const resetForm = () => {
  Object.assign(form, {
    org_name: '',
    org_code: '',
    owner_user_id: auth.user?.user_id || '',
    org_address_1: '',
    org_address_2: '',
    org_address_3: '',
    org_integrate: '',
    org_integrate_url: '',
    org_integrate_provider_id: '',
    org_integrate_passcode: ''
  })
  selectedIntegrationValue.value = null
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity .25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.mdi {
  font-size: 1.05rem;
  line-height: 1;
}

.mdi.mdi-home-modern {
  font-size: 2rem;
  line-height: 1;
}
</style>