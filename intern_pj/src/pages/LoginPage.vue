<template>
  <AuthLayout>
    <form class="space-y-5" @submit.prevent>
      <header class="space-y-1">
        <h2 class="text-lg font-semibold tracking-tight text-slate-900">เข้าสู่ระบบ</h2>
        <p class="text-xs text-slate-500">กรอกอีเมลและรหัสผ่านเพื่อเข้าใช้งานระบบ</p>
      </header>

      <BaseInput
        v-model="form.email"
        label="อีเมล"
        type="email"
        autocomplete="email"
        placeholder="you@example.com"
      />

      <BaseInput
        v-model="form.password"
        label="รหัสผ่าน"
        type="password"
        autocomplete="current-password"
        placeholder="••••••••"
      />

      <div class="flex items-center justify-between text-xs">
        <label class="inline-flex items-center gap-2 select-none">
          <input
            v-model="form.remember"
            type="checkbox"
            class="h-3.5 w-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          <span class="text-slate-600">จำการเข้าสู่ระบบ</span>
        </label>

        <button type="button" class="text-sky-600 hover:text-sky-700 font-medium">
          ลืมรหัสผ่าน?
        </button>
      </div>

      <BaseButton type="submit" variant="primary" class="w-full"> เข้าสู่ระบบ </BaseButton>
    </form>
  </AuthLayout>
</template>

<script setup lang="ts">
import { reactive } from 'vue'

import AuthLayout from '@/layouts/AuthLayout.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'

interface LoginForm {
  email: string
  password: string
  remember: boolean
}

const form = reactive<LoginForm>({
  email: '',
  password: '',
  remember: true,
})
</script>
