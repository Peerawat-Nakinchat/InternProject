<template>
  <aside
    :class="`bg-linear-to-br from-[#1C244B] to-[#682DB5] text-white ${rail ? 'w-16' : 'w-64'} transition-all duration-300 rounded-l-lg`"
  >
    <div class="flex flex-col items-center py-4" :class="rail ? 'px-1' : 'px-4'">
      <template v-if="rail">
        <img src="/img/logoMango.png" alt="MANGOISO Logo" class="w-12 h-12 mx-auto" />
      </template>
      <template v-else>
        <div
          class="text-center font-bold truncate
                text-xs sm:text-sm md:text-sm lg:text-md xl:text-md"
        >
          ISO MANAGEMENT SYSTEM
        </div>
      </template>
    </div>
    <hr class="border-gray-500" />

    <nav class="mt-2 flex flex-col space-y-1">
      <template v-for="(item, index) in menuItems" :key="index">

        <Tooltip v-if="rail" :text="item.title">
          <button
            v-if="item.children && item.children.length > 0"
            @click="handleRailParentClick(item)"
            class="flex items-center justify-center w-full p-2 hover:bg-purple-600"
          >
            <i :class="`${item.icon} text-xl`"></i>
          </button>

          <router-link
            v-else
            :to="item.to"
            class="flex items-center justify-center w-full p-2 hover:bg-purple-600 "
          >
            <i :class="`${item.icon} text-xl`"></i>
          </router-link>
        </Tooltip>

        <div v-else-if="item.children && item.children.length > 0" class="w-full">
          <button
            @click="toggleSubmenu(item.value)"
            class="flex items-center justify-between w-full p-2 hover:bg-purple-600 rounded"
          >
            <div class="flex items-center">
              <i :class="`${item.icon} text-xl mr-2`"></i>
              <span class="text-sm sm:text-sm md:text-sm lg:text-md xl:text-md">{{ item.title }}</span>
            </div>
            <i
              :class="`mdi mdi-chevron-down text-sm transition-transform duration-200 ${
                expandedMenus[item.value] ? 'rotate-180' : ''
              }`"
            ></i>
          </button>
          <transition name="slide-down">
            <div v-if="expandedMenus[item.value]" class="relative ml-4 mt-1 space-y-1">
              <div class="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-400 opacity-70 z-10" aria-hidden="true"></div>

              <router-link
                v-for="(child, childIndex) in item.children"
                :key="childIndex"
                :to="child.to"
                class="flex items-center w-full p-2 hover:bg-purple-700 rounded text-sm relative"
                active-class="bg-purple-700"
              >
                <div
                  class="absolute left-0 w-3 h-0.5 bg-gray-400 opacity-70 z-10"
                  style="top: 50%; transform: translateY(-50%);"
                  aria-hidden="true"
                ></div>
                <div class="flex items-center pl-3">
                  <i :class="`${child.icon || 'mdi mdi-circle-small'} text-lg mr-2`"></i>
                  <span class="text-sm sm:text-sm md:text-sm lg:text-md xl:text-md">{{ child.title }}</span>
                </div>
              </router-link>
            </div>
          </transition>
        </div>

        <router-link
          v-else
          :to="item.to"
          class="flex items-center w-full p-2 hover:bg-purple-600 rounded"
        >
          <i :class="`${item.icon} text-xl mr-2`"></i>
          <span class="text-sm sm:text-sm md:text-sm lg:text-md xl:text-md">{{ item.title }}</span>
        </router-link>
      </template>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { ref, inject } from 'vue'
// import { useRouter } from 'vue-router' // ❌ ไม่ใช้ useRouter แล้ว
import Tooltip from '@/components/Tooltip.vue'

// รับค่า rail ผ่าน props
defineProps({
  rail: {
    type: Boolean,
    default: true,
  },
})

// Inject Function: รับฟังก์ชัน toggleRail จาก component แม่
const toggleRail = inject<() => void>('toggleRail')!

// const router = useRouter() // ❌ ไม่ใช้ useRouter แล้ว

// State สำหรับเก็บสถานะการ expand ของ sub-menu
const expandedMenus = ref<Record<string, boolean>>({
  'system-config': false,
})

// Function สำหรับ toggle sub-menu
const toggleSubmenu = (value: string) => {
  expandedMenus.value[value] = !expandedMenus.value[value]
}

// 💡 Function ใหม่สำหรับจัดการการคลิกที่ไอคอนของเมนูหลักใน Rail Mode (ลบการนำทางออก)
const handleRailParentClick = (item: { value: string, children: { to: string }[] }) => {
  // 1. เปิด Sidebar
  if (toggleRail) {
    toggleRail()
  }

  // 2. ขยาย Sub-menu เพื่อให้เห็นรายการย่อยทันที
  expandedMenus.value[item.value] = true

  // 3. ❌ ไม่มี router.push() แล้ว ผู้ใช้ต้องคลิกที่รายการย่อยเอง
}

// รายการเมนู
const menuItems = ref([
  { title: 'Home', icon: 'mdi mdi-home', value: 'home', to: '/' },
  {
    title: 'Company',
    icon: 'mdi mdi-home-modern',
    value: 'company',
    to: '/company',
  },
  {
    title: 'E-Tax Invoice',
    icon: 'mdi mdi-receipt-text-outline',
    value: 'e-tax-invoice',
    to: '/e_tax_invoice',
  },
  { title: 'Send Email', icon: 'mdi mdi-send', value: 'send-email', to: '/send_email' },
  {
    title: 'User Management',
    icon: 'mdi mdi-account-multiple-outline',
    value: 'user-management',
    to: '/UserManagement',
  },
  {
    title: 'Form Dictionary',
    icon: 'mdi mdi-form-select',
    value: 'form-dictionary',
    to: '/form_dictionary',
  },
  {
    title: 'System Config',
    icon: 'mdi mdi-cog-outline',
    value: 'system-config',
    children: [
      {
        title: 'Module',
        icon: 'mdi mdi-puzzle-outline',
        value: 'module',
        to: '/system_config/module',
      },
      {
        title: 'Menu',
        icon: 'mdi mdi-menu',
        value: 'menu',
        to: '/system_config/menu',
      },
    ],
  },
  {
    title: 'Setup API Token',
    icon: 'mdi mdi-key-chain-variant',
    value: 'setup-api-token',
    to: '/setup_api_token',
  },
])
</script>

<style scoped>
aside {
  transition: width 0.3s ease-in-out;
}

.mdi {
  font-size: 20px;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.slide-down-enter-from,
.slide-down-leave-to {
  max-height: 0;
  opacity: 0;
}

.slide-down-enter-to,
.slide-down-leave-from {
  max-height: 200px;
  opacity: 1;
}
</style>