<template>
  <AuthLayout variant="Invite">
    <div class="w-full max-w-md space-y-8">
      <div v-if="loading" class="text-center">
        <p>กำลังตรวจสอบคำเชิญ...</p>
      </div>

      <div v-else-if="error" class="text-center text-red-500">
        <p>{{ error }}</p>
        <BaseButton class="mt-4" @click="router.push('/')">กลับสู่หน้าหลัก</BaseButton>
      </div>

      <div v-else-if="invitation?.isAlreadyMember" class="text-center space-y-4">
        <div class="p-4 bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-200">
          <h3 class="font-bold text-lg">คำเชิญนี้ถูกใช้งานแล้ว</h3>
          <p class="mt-2">
            คุณ ({{ invitation.email }}) เป็นสมาชิกของบริษัท
            <b>{{ invitation.org_name }}</b> อยู่แล้ว
          </p>
        </div>
        <BaseButton class="w-full" @click="router.push('/')">กลับสู่หน้าหลัก</BaseButton>
      </div>

      <div v-else class="text-center space-y-6">
        <h2 class="text-2xl font-bold text-gray-900">คำเชิญเข้าร่วมบริษัท</h2>
        <p class="text-gray-600">
          คุณได้รับคำเชิญให้เข้าร่วมบริษัท
          <span class="font-semibold">{{ invitation?.org_name }}</span>
        </p>

        <div class="bg-gray-50 p-4 rounded-lg text-left">
          <p class="text-sm text-gray-500">อีเมลที่ได้รับเชิญ</p>
          <p class="font-medium">{{ invitation?.email }}</p>
        </div>

        <div class="space-y-4">
          <!-- Case 1: Existing User -->
          <template v-if="invitation?.isExistingUser">
            <!-- Not Logged In -->
            <p v-if="!auth.isAuthenticated" class="text-sm text-blue-600">
              คุณมีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบเพื่อตอบรับคำเชิญ
            </p>

            <!-- Logged In -->
            <template v-else>
              <!-- Email Mismatch -->
              <div
                v-if="auth.user?.email !== invitation?.email"
                class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm"
              >
                <p class="font-bold">อีเมลไม่ถูกต้อง</p>
                <p>
                  คุณได้รับเชิญที่: <b>{{ invitation?.email }}</b>
                </p>
                <p>
                  แต่คุณเข้าสู่ระบบด้วย: <b>{{ auth.user?.email }}</b>
                </p>
                <p class="mt-2">กรุณาออกจากระบบและเข้าสู่ระบบด้วยบัญชีที่ถูกต้อง</p>
                <BaseButton variant="outline" class="w-full mt-2" @click="onLogout">
                  ออกจากระบบ
                </BaseButton>
              </div>

              <!-- Email Match -->
              <div v-else>
                <p class="text-sm text-blue-600">
                  คุณเข้าสู่ระบบแล้ว กดปุ่มด้านล่างเพื่อเข้าร่วมบริษัท
                </p>
                <BaseButton
                  variant="Submit"
                  class="w-full mt-2"
                  :loading="accepting"
                  @click="onAcceptExisting"
                >
                  ตอบรับคำเชิญเข้าร่วมบริษัท
                </BaseButton>
              </div>
            </template>

            <!-- Login Button (only if not logged in) -->
            <BaseButton
              v-if="!auth.isAuthenticated"
              variant="Submit"
              class="w-full mt-2"
              :loading="accepting"
              @click="onAcceptExisting"
            >
              ตอบรับคำเชิญ (เข้าสู่ระบบ)
            </BaseButton>
          </template>

          <!-- Case 2: New User -->
          <template v-else>
            <p class="text-sm text-green-600">คุณยังไม่มีบัญชี กรุณาลงทะเบียนเพื่อเข้าร่วม</p>
            <BaseButton variant="Submit" class="w-full" @click="onRegister">
              ลงทะเบียนและเข้าร่วม
            </BaseButton>
          </template>
        </div>
      </div>
    </div>
  </AuthLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getInvitationInfo, acceptInvitation } from '@/services/useInvitation'
import AuthLayout from '@/layouts/AuthLayout.vue'
import BaseButton from '@/components/base/BaseButton.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const token = route.query.token as string
const loading = ref(true)
const accepting = ref(false)
const error = ref<string | null>(null)
const invitation = ref<any>(null)

onMounted(async () => {
  if (!token) {
    error.value = 'ไม่พบรหัสคำเชิญ'
    loading.value = false
    return
  }

  try {
    invitation.value = await getInvitationInfo(token)

    // If user is already logged in and email matches, we could auto-accept or show accept button
    // But let's stick to explicit action
  } catch (err) {
    error.value = 'คำเชิญไม่ถูกต้องหรือหมดอายุแล้ว'
  } finally {
    loading.value = false
  }
})

const onAcceptExisting = async () => {
  if (!auth.isAuthenticated) {
    // Redirect to login with return url
    router.push(`/login?redirect=/accept-invite?token=${token}`)
    return
  }

  accepting.value = true
  try {
    await acceptInvitation(token)
    alert('เข้าร่วมบริษัทสำเร็จ!')

    // Refresh user profile/session to get new org data
    console.log('Fetching profile...')
    try {
      await auth.fetchProfile()
      console.log('Profile fetched')
    } catch (e) {
      console.error('Error fetching profile:', e)
    }

    console.log('Redirecting to home...')
    router.push('/').catch((err) => console.error('Router push error:', err))
  } catch (err: any) {
    if (err.response?.status === 409) {
      alert(err.response.data.message)
    } else {
      alert('เกิดข้อผิดพลาดในการตอบรับคำเชิญ')
    }
  } finally {
    accepting.value = false
  }
}

const onLogout = () => {
  auth.logout()
  router.push('/login')
}

const onRegister = () => {
  console.log('Redirecting to register page', { token, email: invitation.value?.email })
  // Redirect to register page with token and email
  router
    .push({
      path: '/registerPage', // Or /memberRegis?
      query: {
        token: token,
        email: invitation.value?.email,
      },
    })
    .catch((err) => {
      console.error('Router push error:', err)
    })
}
</script>
