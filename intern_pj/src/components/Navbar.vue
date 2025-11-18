<template>
  <header
    class="flex items-center justify-between bg-[#682DB5] text-white h-12 px-4 rounded-tr-lg "
  >
    <!-- ปุ่มเปิด/ปิด Sidebar -->
    <button @click="toggleRail" class="p-2 hover:bg-purple-600  transition-colors">
      <i :class="railState.value ? 'mdi mdi-menu text-xl' : 'mdi mdi-chevron-left text-xl'"></i>
    </button>

    <!-- Title -->
    <span class="font-bold text-sm uppercase">
      ISO: International Organization for Standardization
    </span>

    <!-- --- User Menu เท่านั้น --- -->
    <div class="relative">
      <!-- USER BUTTON -->
      <button
      @click="toggleUserMenu"
      :class="[
      'flex items-center px-3  py-1.5 text-sm font-medium rounded-sm transition-all gap-2 w-44 justify-between',
      userMenuVisible
            ? 'bg-white text-[#682DB5] shadow-md border border-purple-200'
            : 'text-white  hover:bg-[#8a4ae0]'
      ]"
      >
      <!-- ไอคอนซ้าย -->
      <i
      :class="[
            'mdi mdi-account-circle text-xl transition-colors',
            userMenuVisible ? 'text-[#682DB5]' : 'text-white'
      ]"
      ></i>

      <!-- ชื่อผู้ใช้ (จัดตรงกลาง) -->
      <span class="flex-1 text-center">
      {{ username }}
      </span>

      <!-- ไอคอนลูกศร -->
      <i
      :class="[
            'mdi mdi-chevron-down text-sm transform transition-transform duration-200',
            userMenuVisible ? 'rotate-180 text-[#682DB5]' : 'rotate-0 text-white'
      ]"
      ></i>
      </button>

      <!-- DROPDOWN -->
      <ul
      v-if="userMenuVisible"
      class="absolute right-0 mt-2 w-44 bg-white text-gray-800 rounded-xl shadow-lg overflow-hidden border border-purple-200 z-50
            origin-top animate-dropdown"
      >
      <li
      class="px-4 py-3 hover:bg-[#f3e8ff] hover:text-[#682DB5] cursor-pointer flex items-center gap-2 transition-colors"
      @click="editProfile"
      >
      <i class="mdi mdi-account-edit text-[#682DB5] text-lg"></i>
      แก้ไขโปรไฟล์
      </li>

      <li
      class="px-4 py-3 hover:bg-[#f3e8ff] hover:text-[#682DB5] cursor-pointer flex items-center gap-2 transition-colors"
      @click="logout"
      >
      <i class="mdi mdi-logout text-red-500 text-lg"></i>
      ออกจากระบบ
      </li>
      </ul>

    </div>
  </header>
</template>

<script setup lang="ts">
import { inject, ref } from 'vue'

// รับค่า railState & toggleRail จาก Parent
const railState = inject('railState')
const toggleRail = inject('toggleRail')

// ข้อมูล User
const username = "MAN01CS"

// Dropdown state
const userMenuVisible = ref(false)
const toggleUserMenu = () => {
  userMenuVisible.value = !userMenuVisible.value
}

// ฟังก์ชันก์ใน dropdown
const editProfile = () => {
  alert("ไปหน้าแก้ไขโปรไฟล์")
}

const logout = () => {
  alert("ออกจากระบบแล้ว")
}
</script>

<style scoped>
.mdi {
  font-size: 20px;
}
</style>
