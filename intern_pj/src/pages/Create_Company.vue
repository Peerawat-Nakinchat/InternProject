<template>
  <div>
    <AuthLayout>
      <form class="space-y-5" @submit.prevent>
        <header class="space-y-1 text-left">
          <h1 class="mb-4 text-xl font-semibold tracking-tight text-neutral-900">
            สร้างบริษัทใหม่
          </h1>
        </header>
        <BaseInput
          v-model="form.companyName"
          label="ชื่อบริษัท"
          type="text"
          placeholder="กรอกชื่อบริษัท"
        />

        <BaseButton type="submit" variant="Submit" class="w-full"> สร้างบริษัท </BaseButton>
      </form>
    </AuthLayout>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'

interface CreateCompanyForm {
  companyName: string
  address: string
  taxId: string
}

const form = reactive<CreateCompanyForm>({
  companyName: '',
  address: '',
  taxId: '',
})
</script>
