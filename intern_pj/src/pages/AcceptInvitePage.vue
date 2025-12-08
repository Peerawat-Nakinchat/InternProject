<template>
  <AuthLayout variant="Invite">
    <div class="w-full max-w-md">
      <!-- 1. Initial Loading -->
      <div v-if="viewState === 'loading'" class="flex flex-col items-center justify-center py-12">
        <BaseLoadingSpinner />
        <p class="mt-4 text-gray-600">กำลังตรวจสอบคำเชิญ...</p>
      </div>

      <!-- 2. Processing (Accepting) -->
      <div
        v-else-if="viewState === 'processing'"
        class="flex flex-col items-center justify-center py-12"
      >
        <BaseLoadingSpinner />
        <p class="mt-4 text-gray-600">กำลังดำเนินการ...</p>
      </div>

      <!-- 3. Success State -->
      <div v-else-if="viewState === 'success'" class="text-center space-y-6 py-8">
        <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <i class="mdi mdi-check text-5xl text-green-600"></i>
        </div>
        <div>
          <h3 class="text-2xl font-bold text-gray-900">เข้าร่วมสำเร็จ!</h3>
          <p class="text-gray-600 mt-2">
            คุณได้เข้าร่วมบริษัท {{ invitation?.org_name }} เรียบร้อยแล้ว
          </p>
        </div>
        <BaseButton class="w-full" @click="router.push('/')">เข้าสู่หน้าหลัก</BaseButton>
      </div>

      <!-- 4. Error State -->
      <div v-else-if="viewState === 'error'" class="text-center space-y-6 py-8">
        <div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <i class="mdi mdi-alert-circle-outline text-5xl text-red-600"></i>
        </div>
        <div>
          <h3 class="text-2xl font-bold text-gray-900">เกิดข้อผิดพลาด</h3>
          <p class="text-gray-600 mt-2">{{ errorMessage }}</p>
        </div>
        <BaseButton class="w-full" @click="router.push('/')">กลับสู่หน้าหลัก</BaseButton>
      </div>

      <!-- 5. Info/Action State (Default) -->
      <div v-else class="space-y-8">
        <!-- Already Member Warning -->
        <div v-if="invitation?.isAlreadyMember" class="text-center space-y-4">
          <div class="p-4 bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-200">
            <h3 class="font-bold text-lg">คำเชิญนี้ถูกใช้งานแล้ว</h3>
            <p class="mt-2">
              คุณ ({{ invitation.email }}) เป็นสมาชิกของบริษัท
              <b>{{ invitation.org_name }}</b> อยู่แล้ว
            </p>
          </div>
          <BaseButton class="w-full" @click="router.push('/')">กลับสู่หน้าหลัก</BaseButton>
        </div>

        <!-- Invitation Details -->
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
                  <BaseButton variant="ghost" class="w-full mt-2" @click="onLogout">
                    ออกจากระบบ
                  </BaseButton>
                </div>

                <!-- Email Match -->
                <div v-else>
                  <p class="text-sm text-blue-600">
                    คุณเข้าสู่ระบบแล้ว กดปุ่มด้านล่างเพื่อเข้าร่วมบริษัท
                  </p>
                  <BaseButton variant="Submit" class="w-full mt-2" @click="onAcceptExisting">
                    ตอบรับคำเชิญเข้าร่วมบริษัท
                  </BaseButton>
                </div>
              </template>

              <!-- Login Button (only if not logged in) -->
              <BaseButton
                v-if="!auth.isAuthenticated"
                variant="Submit"
                class="w-full mt-2"
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
    </div>
  </AuthLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getInvitationInfo, acceptInvitation } from '@/services/useInvitation'
import { toast } from '@/utils/toast' // ✅ Toast Utility
import AuthLayout from '@/layouts/AuthLayout.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseLoadingSpinner from '@/components/base/BaseLoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const token = route.query.token as string

// viewState: 'loading' | 'info' | 'processing' | 'success' | 'error'
const viewState = ref('loading')
const errorMessage = ref('')
const invitation = ref<any>(null)

onMounted(async () => {
  if (!token) {
    errorMessage.value = 'ไม่พบรหัสคำเชิญ'
    viewState.value = 'error'
    return
  }

  try {
    invitation.value = await getInvitationInfo(token)
    viewState.value = 'info'
  } catch (err) {
    errorMessage.value = 'คำเชิญไม่ถูกต้องหรือหมดอายุแล้ว'
    viewState.value = 'error'
  }
})

const onAcceptExisting = async () => {
  if (!auth.isAuthenticated) {
    // Redirect to login with return url
    router.push(`/login?redirect=/accept-invite?token=${token}`)
    return
  }

  viewState.value = 'processing'

  try {
    await acceptInvitation(token)

    // Refresh user profile/session to get new org data
    try {
      await auth.fetchProfile()
    } catch (e) {
      console.error('Error fetching profile:', e)
    }

    viewState.value = 'success'
    toast.success('เข้าร่วมบริษัทสำเร็จ!') // ✅ Toast success
  } catch (err: any) {
    if (err.response?.status === 409) {
      errorMessage.value = err.response.data.message
      toast.error(err.response.data.message) // ✅ Toast error
    } else {
      errorMessage.value = 'เกิดข้อผิดพลาดในการตอบรับคำเชิญ'
      toast.error('เกิดข้อผิดพลาดในการตอบรับคำเชิญ') // ✅ Toast error
    }
    viewState.value = 'error'
  }
}

const onLogout = () => {
  auth.logout()
  router.push('/login')
}

const onRegister = () => {
  router.push({
    path: '/registerPage',
    query: {
      token: token,
      email: invitation.value?.email,
    },
  })
}
</script>
