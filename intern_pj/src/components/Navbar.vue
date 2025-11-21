<template>
  <header
    class="flex items-center justify-between bg-linear-to-br from-[#1C244B] to-[#682DB5] text-white h-15 px-4 rounded-tr-lg"
  >
    <!-- ปุ่มเปิด/ปิด Sidebar -->
    <button @click="toggleRail" class="p-2 hover:bg-purple-600 transition-colors">
      <i :class="railOpen ? 'mdi mdi-menu text-xl' : 'mdi mdi-chevron-left text-xl'"></i>
    </button>

    <!-- Title -->
    <span class="font-bold text-sm uppercase">
      ISO: International Organization for Standardization
    </span>

    <!-- User Menu -->
    <div class="relative" ref="userMenuRef">
      <!-- USER BUTTON -->
      <button
        @click="toggleUserMenu"
        :class="[
          'flex items-center  px-3 py-1.5 text-sm font-medium rounded-t-sm transition-all gap-2 w-44 justify-between',
          userMenuVisible
            ? 'bg-white text-[#682DB5] shadow-md border border-purple-400'
            : 'text-white hover:bg-[#8a4ae0]',
        ]"
      >
        <i
          :class="[
            'mdi mdi-account-circle text-xl transition-colors',
            userMenuVisible ? 'text-[#682DB5]' : 'text-white',
          ]"
        ></i>

        <span class="flex-1 text-center truncate">
          {{ displayName }}
        </span>

        <i
          :class="[
            'mdi mdi-chevron-down text-sm transform transition-transform duration-200',
            userMenuVisible ? 'rotate-180 text-[#682DB5]' : 'rotate-0 text-white',
          ]"
        ></i>
      </button>

      <!-- DROPDOWN -->
      <ul
        v-if="userMenuVisible"
        class="absolute right-0 mt-0.5  w-44 bg-white text-gray-800 rounded-b-xl shadow-lg overflow-auto border border-purple-400 z-50 origin-top animate-dropdown"
      >
        <!-- User Info -->
        <li class="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <p class="text-xs text-gray-500">ล็อกอินด้วย</p>
          <p class="text-sm font-medium text-gray-800 truncate">{{ userEmail }}</p>
        </li>

        <!-- Edit Profile -->
        <li
          class="px-4 py-3 hover:bg-[#f3e8ff] hover:text-[#682DB5] cursor-pointer flex items-center gap-2 transition-colors"
          @click="editProfile"
        >
          <i class="mdi mdi-account-edit text-[#682DB5] text-lg"></i>
          แก้ไขโปรไฟล์
        </li>

        <!-- Logout -->
        <li
          class="px-4 py-3 hover:bg-red-200 hover:text-red-800 cursor-pointer flex items-center gap-2 transition-colors"
          @click="openLogoutDialog"
        >
          <i class="mdi mdi-logout text-red-500 text-lg"></i>
          <span v-if="isLoggingOut">กำลังออกจากระบบ...</span>
          <span v-else>ออกจากระบบ</span>
        </li>
      </ul>
    </div>
  </header>

  <ConfirmDialog
    v-model="showLogoutConfirm"
    title="ยืนยันการออกจากระบบ"
    message="คุณต้องการออกจากระบบจากระบบงาน ISO หรือไม่?"
    confirmText="ออกจากระบบ"
    cancelText="ยกเลิก"
    @confirm="handleLogout"
  />


</template>

<script setup lang="ts">
import { inject, ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

// Inject
const railState = inject('railState')!
const toggleRail = inject<() => void>('toggleRail')!

// States
const showLogoutConfirm = ref(false)
const userMenuVisible = ref(false)
const isLoggingOut = ref(false)

const userMenuRef = ref<HTMLElement | null>(null)

const router = useRouter()
const authStore = useAuthStore()

// Rail
const railOpen = computed(() => {
  const maybeRef: any = railState
  return typeof maybeRef?.value === 'boolean'
    ? maybeRef.value
    : railState
})

// Display info
const displayName = computed(() => {
  const user = authStore.user
  if (!user) return 'Guest'

  return (
    user.full_name ||
    `${user.name ?? ''} ${user.surname ?? ''}`.trim() ||
    user.email?.split('@')[0] ||
    'User'
  )
})

const userEmail = computed(() => authStore.user?.email || 'guest@example.com')

// Menu actions
const toggleUserMenu = () => {
  userMenuVisible.value = !userMenuVisible.value
}

const editProfile = () => {
  userMenuVisible.value = false
  router.push('/profile')
}

// 👇 FIX: หยุด dropdown re-render มาชน confirmdialog
const openLogoutDialog = () => {
  userMenuVisible.value = false
  setTimeout(() => {
    showLogoutConfirm.value = true
  }, 20)
}

// Logout
const handleLogout = async () => {
  if (isLoggingOut.value) return

  isLoggingOut.value = true
  try {
    await authStore.logout()
    router.push('/login')
  } catch (error) {
    console.error('Logout error:', error)
    alert('เกิดข้อผิดพลาดในการออกจากระบบ')
  } finally {
    isLoggingOut.value = false
    showLogoutConfirm.value = false
  }
}

// Click outside
const handleClickOutside = (e: MouseEvent) => {
  if (!userMenuRef.value) return

  if (!userMenuRef.value.contains(e.target as Node)) {
    userMenuVisible.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
