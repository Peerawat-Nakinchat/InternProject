<template>
  <header
    class="flex items-center justify-between bg-[#682DB5] text-white h-12 px-4 rounded-tr-lg"
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
    <div class="relative">
      <!-- USER BUTTON -->
      <button
        @click="toggleUserMenu"
        :class="[
          'flex items-center px-3 py-1.5 text-sm font-medium rounded-sm transition-all gap-2 w-44 justify-between',
          userMenuVisible
            ? 'bg-white text-[#682DB5] shadow-md border border-purple-200'
            : 'text-white hover:bg-[#8a4ae0]',
        ]"
      >
        <!-- ไอคอนซ้าย -->
        <i
          :class="[
            'mdi mdi-account-circle text-xl transition-colors',
            userMenuVisible ? 'text-[#682DB5]' : 'text-white',
          ]"
        ></i>

        <!-- ชื่อผู้ใช้ (จัดตรงกลาง) -->
        <span class="flex-1 text-center truncate">
          {{ displayName }}
        </span>

        <!-- ไอคอนลูกศร -->
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
        class="absolute right-0 mt-2 w-44 bg-white text-gray-800 rounded-xl shadow-lg overflow-hidden border border-purple-200 z-50 origin-top animate-dropdown"
      >
        <!-- User Info Section -->
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
          class="px-4 py-3 hover:bg-[#f3e8ff] hover:text-[#682DB5] cursor-pointer flex items-center gap-2 transition-colors border-t border-gray-200"
          @click="handleLogout"
        >
          <i class="mdi mdi-logout text-red-500 text-lg"></i>
          <span v-if="isLoggingOut">กำลังออกจากระบบ...</span>
          <span v-else>ออกจากระบบ</span>
        </li>
      </ul>
    </div>
  </header>
</template>

<script setup lang="ts">
import { inject, ref, computed } from 'vue'
import type { Ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// รับค่า railState & toggleRail จาก Parent
const railState = inject<boolean | Ref<boolean>>('railState')!
const toggleRail = inject<() => void>('toggleRail')!

// Normalize rail state so template can use a boolean safely.
// If parent provided a ref, use its .value; if provided a raw boolean, use it directly.
const railOpen = computed(() => {
  const maybeRef: any = railState
  return typeof maybeRef?.value === 'boolean' ? (maybeRef.value as boolean) : (railState as boolean)
})

const router = useRouter()
const authStore = useAuthStore()

// Dropdown state
const userMenuVisible = ref(false)
const isLoggingOut = ref(false)

// Computed properties
const displayName = computed(() => {
  if (!authStore.user) return 'Guest'
  
  // ใช้ full_name ถ้ามี ไม่งั้นใช้ name + surname
  if (authStore.user.full_name) {
    return authStore.user.full_name
  }
  
  if (authStore.user.name && authStore.user.surname) {
    return `${authStore.user.name} ${authStore.user.surname}`
  }
  
  // ถ้าไม่มีข้อมูลชื่อเลย ใช้ email
  return authStore.user.email?.split('@')[0] || 'User'
})

const userEmail = computed(() => {
  return authStore.user?.email || 'guest@example.com'
})

// Toggle user menu
const toggleUserMenu = () => {
  userMenuVisible.value = !userMenuVisible.value
}

// Close menu when clicking outside
const closeMenu = () => {
  userMenuVisible.value = false
}

// Edit profile
const editProfile = () => {
  closeMenu()
  router.push('/profile')
}

// Logout
const handleLogout = async () => {
  if (isLoggingOut.value) return

  closeMenu()
  
  const confirmed = confirm('คุณต้องการออกจากระบบใช่หรือไม่?')
  if (!confirmed) return

  isLoggingOut.value = true

  try {
    await authStore.logout()
    router.push('/login')
  } catch (error) {
    console.error('Logout error:', error)
    alert('เกิดข้อผิดพลาดในการออกจากระบบ')
  } finally {
    isLoggingOut.value = false
  }
}

// Close dropdown when clicking outside
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (!target.closest('.relative')) {
      userMenuVisible.value = false
    }
  })
}
</script>

<style scoped>
.mdi {
  font-size: 20px;
}

@keyframes dropdown {
  from {
    opacity: 0;
    transform: scaleY(0.95);
  }
  to {
    opacity: 1;
    transform: scaleY(1);
  }
}

.animate-dropdown {
  animation: dropdown 0.15s ease-out;
}
</style>