<template>
  <aside
    :class="`bg-linear-to-br from-[#1C244B] to-[#682DB5] text-white ${rail ? 'w-16' : 'w-64'} transition-all duration-300 rounded-l-lg`"
  >
    <div class="flex flex-col items-center py-4" :class="rail ? 'px-1' : 'px-4'">
      <template v-if="rail">
        <img src="/img/logoMango.png" alt="MANGOISO Logo" class="w-12 h-12 mx-auto" />
      </template>
      <template v-else>
        <div class="text-center font-bold text-md">ISO MANAGEMENT SYSTEM</div>
      </template>
    </div>
    <hr class="border-gray-500" />

    <nav class="mt-2 flex flex-col space-y-1">
      <template v-for="(item, index) in menuItems" :key="index">

        <!-- ใช้งาน Tooltip ตอน rail mode -->
        <Tooltip v-if="rail" :text="item.title">
          <router-link :to="item.to" class="flex items-center justify-center w-full p-2 hover:bg-purple-600 ">
            <i :class="`${item.icon} text-xl`"></i>
          </router-link>
        </Tooltip>

        <!-- normal menu -->
        <router-link
          v-else
          :to="item.to"
          class="flex items-center w-full p-2 hover:bg-purple-600 rounded"
        >
          <i :class="`${item.icon} text-xl mr-2`"></i>
          <span>{{ item.title }}</span>
        </router-link>
      </template>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { ref, defineProps } from 'vue'
import Tooltip from '@/components/Tooltip.vue'

// รับค่า rail ผ่าน props
const props = defineProps({
  rail: {
    type: Boolean,
    default: true,
  },
})

// รายการเมนู
const menuItems = ref([
  { title: 'Home', icon: 'mdi mdi-home', value: 'home', to: '/' },
  {
    title: 'Company',
    icon: 'mdi mdi-file-chart-outline',
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
    to: '/user_management',
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
    to: '/system_config',
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
</style>
