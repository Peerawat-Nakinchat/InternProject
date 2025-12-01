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
  // ✅ สำหรับ OAuth callback ใหม่ที่ใช้ cookies
  // Backend จะ set cookies และ redirect มาที่นี่พร้อม query param oauth=success
  const oauthSuccess = route.query.oauth === 'success'

  // ✅ Legacy support: ถ้ายังมี tokens ใน URL (ระหว่าง transition period)
  const { accessToken, refreshToken } = route.query

  if (oauthSuccess) {
    try {
      // ✅ Cookies ถูก set โดย backend แล้ว
      // แค่ fetch profile เพื่อ update store
      console.log('🍪 OAuth success - Fetching profile from cookies')
      await authStore.fetchProfile()

      if (authStore.isAuthenticated) {
        console.log('✅ OAuth login successful')
        router.push('/')
      } else {
        console.error('❌ Failed to get user profile after OAuth')
        router.push('/login?error=oauth_profile_failed')
      }
    } catch (error) {
      console.error('Login callback error:', error)
      router.push('/login?error=callback_failed')
    }
  } else if (accessToken && refreshToken) {
    // ✅ Legacy support: สำหรับ backward compatibility
    // (ในกรณีที่ยังมี tokens ใน URL จาก OAuth callback เก่า)
    console.warn('⚠️ Legacy OAuth callback detected - tokens in URL')
    try {
      // เก็บใน store (ไม่ใช้ localStorage อีกต่อไป)
      authStore.accessToken = accessToken as string
      authStore.refreshToken = refreshToken as string

      await authStore.fetchProfile()
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
