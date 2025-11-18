<template>
  <header
    class="flex items-center justify-between bg-[#682DB5] text-white h-12 px-4 rounded-tr-lg shadow"
  >
    <button @click="toggleRail" class="p-2 hover:bg-gray-700 rounded transition-colors">
      <i :class="railState.value ? 'mdi mdi-menu text-xl' : 'mdi mdi-chevron-left text-xl'"></i>
    </button>
    <span class="font-bold text-sm uppercase"
      >ISO: International Organization for Standardization</span
    >
    <div class="flex items-center space-x-2">
      <button
        class="flex items-center px-2 py-1 bg-green-600 rounded text-white text-sm hover:bg-green-700"
      >
        <i class="mdi mdi-checkbox-marked-circle-outline mr-1"></i> Approve Document
      </button>
      <div class="relative group">
        <button class="flex items-center px-2 py-1 text-sm hover:bg-gray-700 rounded">
          <span class="relative">
            <i class="mdi mdi-wrench text-orange-600 text-lg"></i>
            <span class="absolute -top-1 -right-2 bg-red-600 text-white rounded-full text-xs px-1"
              >128</span
            >
          </span>
          <span class="ml-1">Setup Master</span>
        </button>
        <ul
          class="absolute mt-1 bg-white text-black rounded shadow hidden group-hover:block right-0 min-w-[150px]"
        >
          <li class="px-4 py-2 hover:bg-gray-200 cursor-pointer">Master 1</li>
          <li class="px-4 py-2 hover:bg-gray-200 cursor-pointer">Master 2</li>
        </ul>
      </div>
      <button class="relative p-1 hover:bg-gray-700 rounded">
        <i class="mdi mdi-bell-outline text-yellow-400 text-lg"></i>
        <span class="absolute -top-1 -right-1 bg-red-600 text-white rounded-full text-xs px-1"
          >0</span
        >
      </button>
      <button class="flex items-center px-2 py-1 text-sm hover:bg-gray-700 rounded">
        <i class="mdi mdi-account-circle-outline text-blue-400 mr-1 text-lg"></i>
        MAN01CS
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { inject } from 'vue'

// รับค่า railState และ toggleRail จาก Component แม่
const railState = inject('railState')
const toggleRail = inject('toggleRail')

// isConditionFormVisible และ handleToolbarAction ถูกลบออกเนื่องจากไม่ใช่หน้าที่ของ Navbar
</script>

<style scoped>
/* ปรับขนาดไอคอน MDI */
.mdi {
  font-size: 20px;
}
</style>
