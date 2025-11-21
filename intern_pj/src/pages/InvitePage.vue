<template>
  <div>
    <AuthLayout variant="Invite">
      <form class="space-y-5 w-full" @submit.prevent>
        <header class="space-y-1 text-left">
          <h1 class="mb-4 text-xl font-semibold tracking-tight text-slate-900">ส่งคำเชิญ</h1>
        </header>
        <BaseInput
          label="อีเมลผู้รับเชิญ"
          type="email"
          autocomplete="email"
          placeholder="example@email.com"
          required
        />
        <div class="w-full space-y-1">
          <label class="block text-xs font-medium text-neutral-700">ตำแหน่ง</label>
          <BaseDropdown v-model="isInviteOpen" close-on-click class="w-full">
            <template #trigger>
              <button
              type="button"
              class="flex w-full items-center justify-between rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 shadow-sm hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
              >
              <span>
                {{ selectedInvite ? selectedInvite.label : 'เลือกบทบาทผู้ใช้' }}
              </span>
              <svg
                :class="['h-4 w-4 text-primary-500 transform transition-transform duration-200', { 'rotate-180': isInviteOpen }]"
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
              v-for="option in InviteOption"
              :key="option.value"
              type="button"
              class="flex w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100"
              @click="onSelectInvite(option)"
              >
              {{ option.label }}
              </button>
            </div>
            </BaseDropdown>
        </div>
        <BaseButton variant="Submit" type="submit">ส่งคำเชิญ</BaseButton>
      </form>
    </AuthLayout>
  </div>
</template>

<script setup lang="ts">
import AuthLayout from '@/layouts/AuthLayout.vue';
import BaseInput from '@/components/base/BaseInput.vue';
import BaseButton from '@/components/base/BaseButton.vue';
import BaseDropdown from '@/components/base/BaseDropdown.vue';
import { ref, computed } from 'vue';

const form = ref({
  email: '',
  role: '',
})

interface InviteOption {
  label: string
  value: string
}

const InviteOption: InviteOption[] = [
  { label: 'เจ้าของ (OWNER)', value: 'onwer' },
  { label: 'ผู้ดูแลระบบ (ADMIN)', value: 'admin' },
  { label: 'ผู้ใช้ (USER)', value: 'user' },
  { label: 'ผู้ดู (VIEWER)', value: 'viewer' },
  { label: 'ผู้ตรวจสอบ (AUDITOR)', value: 'auditor' },
]

const isInviteOpen = ref(false)
const selectedInviteValue = ref<string | null>(null)

const selectedInvite = computed<InviteOption | null>(() => {
  return InviteOption.find((opt) => opt.value === selectedInviteValue.value) ?? null
})

const onSelectInvite = (option: InviteOption) => {
  selectedInviteValue.value = option.value
  form.value.role = option.value
}
</script>
