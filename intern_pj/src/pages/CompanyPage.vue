<template>
  <div>
    <AuthLayout variant="Company">
      <form class="space-y-3" @submit.prevent="onSubmit">
        <header class="space-y-1 text-left">
          <h1 class="mb-4 text-xl font-semibold tracking-tight text-neutral-900">
            สร้างบริษัทใหม่
          </h1>
        </header>

        <BaseInput
          v-model="form.org_name"
          label="ชื่อบริษัท"
          type="text"
          placeholder="กรอกชื่อบริษัท"
          required
        />

        <BaseInput
          v-model="form.org_code"
          label="รหัสบริษัท"
          type="text"
          placeholder="ตั้งรหัสบริษัท (เช่น CMP001)"
        />
        <div class="w-full space-y-1">
          <label class="block text-xs font-medium text-neutral-700"> ที่อยู่บริษัท</label>
          <BaseInput v-model="form.org_address1" type="text" placeholder="ที่อยู่ 1" />
          <BaseInput v-model="form.org_address2" type="text" placeholder="ที่อยู่ 2" />

          <BaseInput v-model="form.org_address3" type="text" placeholder="ที่อยู่ 3" />
        </div>

        <div class="w-full space-y-1">
          <label class="block text-xs font-medium text-neutral-700"> Integrate System</label>

          <BaseDropdown v-model="isIntegrationOpen" close-on-click class="w-full">
            <template #trigger>
              <button
                type="button"
                class="flex w-full items-center justify-between rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 shadow-sm hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
              >
                <span>
                  {{ selectedIntegration ? selectedIntegration.label : 'เลือกการเชื่อมต่อระบบ' }}
                </span>
                <svg
                  class="h-4 w-4 text-primary-500"
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
                v-for="option in integrationOptions"
                :key="option.value"
                type="button"
                class="flex w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100"
                @click="onSelectIntegration(option)"
              >
                {{ option.label }}
              </button>
            </div>
          </BaseDropdown>
        </div>

        <div class="flex w-full justify-between gap-4">
          <div class="flex-1/2">
            <BaseInput
              v-model="form.org_integrate_provider_id"
              label="Integration Provider"
              type="text"
              placeholder="กรอก Provider ID"
            />
          </div>
          <div class="flex-1/2">
            <BaseInput
              v-model="form.org_integrate_passcode"
              label="Integration Passcode"
              type="password"
              placeholder="กรอกรหัสจากระบบภายนอก"
            />
          </div>
        </div>

        <BaseInput
          v-model="form.org_integrate_url"
          label="Integration URL"
          type="url"
          placeholder="https://..."
        />

        <BaseButton type="submit" variant="Submit" class="w-full" :loading="loading">
          สร้างบริษัท
        </BaseButton>
        <p v-if="errorMessage" class="mt-2 text-sm text-red-500">
          {{ errorMessage }}
        </p>
      </form>
    </AuthLayout>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseDropdown from '@/components/base/BaseDropdown.vue'

import type { CreateCompanyForm, IntegrationOption } from '@/types/company'
import { createCompany } from '@/services/useCompany'

const form = reactive<CreateCompanyForm>({
  org_id: '',
  org_name: '',
  org_code: '',
  owner_user_id: '',
  org_address1: '',
  org_address2: '',
  org_address3: '',
  org_intergrate: '',
  org_integrate_url: '',
  org_integrate_provider_id: '',
  org_integrate_passcode: '',
})

const integrationOptions: IntegrationOption[] = [
  { label: 'เชื่อมต่อข้อมูลบริษัท', value: 'Y' },
  { label: 'ไม่เชื่อมต่อข้อมูลบริษัท', value: 'N' },
]

const isIntegrationOpen = ref(false)
const selectedIntegrationValue = ref<string | null>(null)

const selectedIntegration = computed<IntegrationOption | null>(() => {
  return integrationOptions.find((opt) => opt.value === selectedIntegrationValue.value) ?? null
})

const onSelectIntegration = (option: IntegrationOption) => {
  selectedIntegrationValue.value = option.value
  form.org_intergrate = option.value
}

const loading = ref(false)
const errorMessage = ref<string | null>(null)

const onSubmit = async () => {
  errorMessage.value = null
  loading.value = true

  try {
    const result = await createCompany({ ...form })
    console.log('สร้างบริษัทสำเร็จ', result)
  } catch (err: unknown) {
    if (err instanceof Error) {
      errorMessage.value = err.message
    } else {
      errorMessage.value = 'เกิดข้อผิดพลาดในการสร้างบริษัท'
    }
  }
}
</script>
