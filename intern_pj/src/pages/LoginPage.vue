<template>
  <div>
    <AuthLayout>
      <form class="space-y-5" @submit.prevent>
        <header class="space-y-1 text-left">
          <h1 class="mb-4 text-xl font-semibold tracking-tight text-slate-900">เข้าสู่ระบบ</h1>
        </header>

        <BaseInput
          v-model="form.email"
          label="อีเมล"
          type="email"
          autocomplete="email"
          placeholder="your@example.com"
        />

        <BaseInput
          v-model="form.password"
          label="รหัสผ่าน"
          type="password"
          autocomplete="current-password"
          placeholder="****************"
        />

        <div class="flex items-center justify-between text-xs">
          <label class="inline-flex items-center gap-2 select-none">
            <input
              v-model="form.remember"
              type="checkbox"
              class="h-3.5 w-3.5 rounded border-primary-300 text-primary-600 focus:ring-primary-500 accent-violet-500"
            />
            <span class="text-slate-600">จำการเข้าสู่ระบบ</span>
          </label>

          <a type="button" class="font-medium text-primary-600 text-primary-400 hover:underline">
            ลืมรหัสผ่าน?
          </a>
        </div>

        <BaseButton type="submit" variant="Submit" class="w-full"> เข้าสู่ระบบ </BaseButton>

        <div class="register text-center">
          <p class="text-xs text-slate-500">
            ยังไม่มีบัญชีใช่ไหม?
            <a
              href="/registerPage"
              class="font-medium text-purple-600 text-purple-400 hover:underline"
              >ลงทะเบียน</a
            >
          </p>
        </div>
        <div class="flex items-center my-4">
          <hr class="flex-1 border-slate-500" />
          <span class="mx-3 text-xs text-slate-500">หรือ</span>
          <hr class="flex-1 border-slate-500" />
        </div>

        <div class="space-y-3 pt-2">
          <button
            href="/auth/google"
            role="button"
            class="flex items-center justify-center gap-3 w-full rounded-md border px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 border-gray-500"
            aria-label="Sign in with Google"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M21.6 12.24c0-.74-.07-1.45-.2-2.14H12v4.06h5.76c-.25 1.36-1 2.51-2.12 3.29v2.72h3.42c2-1.84 3.14-4.58 3.14-7.93z"
                fill="#4285F4"
              />
              <path
                d="M12 22c2.88 0 5.3-.95 7.07-2.58l-3.42-2.72c-.95.64-2.16 1.02-3.65 1.02-2.8 0-5.17-1.88-6.02-4.42H2.4v2.77C4.18 19.86 7.86 22 12 22z"
                fill="#34A853"
              />
              <path
                d="M5.98 13.3A7.3 7.3 0 0 1 5.6 12c0-.4.05-.79.14-1.17V8.05H2.4A9.99 9.99 0 0 0 1 12c0 1.6.38 3.12 1.05 4.46l3.93-3.16z"
                fill="#FBBC05"
              />
              <path
                d="M12 6.5c1.57 0 2.98.54 4.09 1.6l3.06-3.06C17.28 2.9 14.86 2 12 2 7.86 2 4.18 4.14 2.4 7.05l3.72 2.78C6.83 8.38 9.2 6.5 12 6.5z"
                fill="#EA4335"
              />
            </svg>
            <span>เข้าสู่ระบบ / ลงทะเบียน ด้วย Google</span>
          </button>

          <button
            href="/auth/microsoft"
            role="button"
            class="flex items-center justify-center gap-3 w-full rounded-md border px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 border-gray-500"
            aria-label="Sign in with Microsoft"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="3" y="3" width="8.5" height="8.5" fill="#F35325" />
              <rect x="12.5" y="3" width="8.5" height="8.5" fill="#81BC06" />
              <rect x="3" y="12.5" width="8.5" height="8.5" fill="#05A6F0" />
              <rect x="12.5" y="12.5" width="8.5" height="8.5" fill="#FFBA08" />
            </svg>
            <span>เข้าสู่ระบบ / ลงทะเบียน ด้วย Microsoft</span>
          </button>
        </div>
      </form>
    </AuthLayout>
  </div>
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
