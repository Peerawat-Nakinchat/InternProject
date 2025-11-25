<template>
  <header
    class="flex items-center justify-between bg-linear-to-br from-[#1C244B] to-[#682DB5] text-white h-15 px-4 rounded-tr-lg"
  >
    <!-- Sidebar toggle -->
    <button @click="toggleRail" class="p-2 hover:bg-purple-600 transition-colors">
      <i :class="railOpen ? 'mdi mdi-menu text-xl' : 'mdi mdi-chevron-left text-xl'"></i>
    </button>

    <!-- Title -->
    <transition name="title-expand" mode="out-in">
      <span
        key="header-title"
        class="font-bold text-sm uppercase truncate max-w-[60%] md:max-w-[50%]"
      >
        <span v-if="isMobile">ISO System</span>
        <span v-else-if="isTablet">ISO Management System</span>
        <span v-else>ISO: International Organization for Standardization</span>
      </span>
    </transition> 

    <!-- User Menu -->
    <div class="relative flex justify-end w-[200px]" ref="userMenuRef">
      <button
        @click="toggleUserMenu"
        class="flex items-center md:w-full px-3 py-1.5 text-sm font-medium rounded-full md:rounded-sm transition-all gap-2
               sm:w-auto justify-between bg-white text-[#682DB5]  border border-purple-400 md:bg-transparent md:text-white md:border-0 hover:bg-[#8a4ae0]"
      >
        <i
          class="mdi mdi-account-circle text-xl transform transition-transform duration-300"
          :class="{ 'scale-110': userMenuVisible }"
        ></i>

        <!-- Username -->
        <transition name="fade-slide">
          <span
            v-if="!isMobile"
            class="flex-1 text-center truncate hidden md:inline"
          >
            {{ displayName }}
          </span>
        </transition>

        <i
          class="mdi mdi-chevron-down text-sm transform transition-transform duration-200 hidden md:inline"
          :class="{ 'rotate-180': userMenuVisible }"
        ></i>
      </button>

      <!-- Dropdown -->
      <ul
        v-if="userMenuVisible"
        class="absolute right-0 top-11 w-[200px] bg-white text-gray-800 
              rounded-md md:rounded-b-xl md:rounded-t-none shadow-lg overflow-auto border border-purple-400 z-50 origin-top animate-dropdown"
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
const isMobile = ref(false)
const isTablet = ref(false)

const updateScreen = () => {
  const width = window.innerWidth
  isMobile.value = width < 640
  isTablet.value = width >= 640 && width < 1024
}

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
  updateScreen()
  window.addEventListener('resize', updateScreen)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>


<style scoped>
/* Title expand/fade animation */
.title-expand-enter-active,
.title-expand-leave-active {
  transition: all 0.3s ease-in-out;
}
.title-expand-enter-from,
.title-expand-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}
.title-expand-enter-to,
.title-expand-leave-from {
  opacity: 1;
  transform: translateX(0);
}

/* User menu fade-slide */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease-in-out;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(5px);
}
.fade-slide-enter-to,
.fade-slide-leave-from {
  opacity: 1;
  transform: translateX(0);
}

/* Icon scale */
button i {
  transition: transform 0.3s ease-in-out;
}
button i.scale-110 {
  transform: scale(1.1);
}
</style>