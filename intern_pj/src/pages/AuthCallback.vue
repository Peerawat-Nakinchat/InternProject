<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
      <div
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"
      ></div>
      <h2 class="text-xl font-semibold text-gray-700">กำลังเข้าสู่ระบบ...</h2>
      <p class="text-gray-500 mt-2">กรุณารอสักครู่</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

onMounted(async () => {
  const { accessToken, refreshToken } = route.query

  if (accessToken && refreshToken) {
    try {
      // 1. Set tokens in localStorage for persistence
      localStorage.setItem('accessToken', accessToken as string)
      localStorage.setItem('refreshToken', refreshToken as string)

      // 2. Update Store State directly
      authStore.accessToken = accessToken as string
      authStore.refreshToken = refreshToken as string

      // 3. Fetch User Profile to get user data and update 'isAuthenticated'
      await authStore.fetchProfile()

      // 4. Redirect to home
      router.push('/')
    } catch (error) {
      console.error('Login callback error:', error)
      router.push('/login?error=callback_failed')
    }
  } else {
    router.push('/login?error=no_tokens')
  }
})
</script>
