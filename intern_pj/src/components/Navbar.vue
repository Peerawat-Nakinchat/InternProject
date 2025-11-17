<template>
  <div class="flex h-screen bg-gray-100">
    <!-- Side Bar -->
    <aside :class="`bg-[#02234e] text-white ${rail ? 'w-16' : 'w-64'} transition-width duration-300 rounded-r-lg`">
      <div class="flex flex-col items-center py-4" :class="rail ? 'px-1' : 'px-4'">
        <template v-if="rail">
          <img src="http://localhost:3050/Content/Images/Image/LogoSmall.png"
               alt="MANGOERP Logo"
               class="w-12 h-12 mx-auto"/>
        </template>
        <template v-else>
          <div class="text-center font-bold text-lg">MANGO ERP</div>
        </template>
      </div>
      <hr class="border-gray-500" />
      <nav class="mt-2 flex flex-col space-y-1">
        <template v-for="(item, index) in menuItems" :key="index">
          <!-- Tooltip สำหรับ rail -->
          <div v-if="rail" class="relative group">
            <button class="flex items-center w-full p-2 hover:bg-gray-700 rounded">
              <i :class="`${item.icon} text-xl`"></i>
            </button>
            <div
              class="absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap px-3 py-1 bg-[#02234e] text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {{ item.title }}
            </div>
          </div>

          <!-- ปุ่มปกติเมื่อไม่ใช่ rail -->
          <button v-else
                  class="flex items-center w-full p-2 hover:bg-gray-700 rounded">
            <i :class="`${item.icon} text-xl mr-2`"></i>
            <span>{{ item.title }}</span>
          </button>
        </template>
      </nav>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col">
      <!-- App Bar -->
      <header class="flex items-center justify-between bg-[#02234e] text-white h-12 px-4 rounded-tr-lg shadow">
        <button @click="rail = !rail">
          <i :class="rail ? 'mdi mdi-menu' : 'mdi mdi-chevron-left'"></i>
        </button>
        <span class="font-bold text-sm uppercase">ERP: Enterprise Resource Planning</span>
        <div class="flex items-center space-x-2">
          <button class="flex items-center px-2 py-1 bg-green-600 rounded text-white text-sm">
            <i class="mdi mdi-checkbox-marked-circle-outline mr-1"></i> Approve Document
          </button>
          <div class="relative">
            <button class="flex items-center px-2 py-1 text-sm">
              <span class="relative">
                <i class="mdi mdi-wrench text-orange-600 text-lg"></i>
                <span class="absolute -top-1 -right-2 bg-red-600 text-white rounded-full text-xs px-1">128</span>
              </span>
              Setup Master
            </button>
            <!-- Dropdown -->
            <ul class="absolute mt-1 bg-white text-black rounded shadow hidden group-hover:block">
              <li class="px-2 py-1 hover:bg-gray-200 cursor-pointer">Master 1</li>
              <li class="px-2 py-1 hover:bg-gray-200 cursor-pointer">Master 2</li>
            </ul>
          </div>
          <button class="relative p-1">
            <i class="mdi mdi-bell-outline text-yellow-400 text-lg"></i>
            <span class="absolute -top-1 -right-1 bg-red-600 text-white rounded-full text-xs px-1">0</span>
          </button>
          <button class="flex items-center px-2 py-1 text-sm">
            <i class="mdi mdi-account-circle-outline text-blue-400 mr-1 text-lg"></i>
            MAN01CS
          </button>
        </div>
      </header>


      <!-- Content Slot -->
      <div class="flex-1 p-4 overflow-auto">
        <slot></slot>
      </div>
    </div>

    <!-- Condition Popup Form -->
    <ConditionPopupForm v-model="isConditionFormVisible" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import ConditionPopupForm from './ConditionPopupForm.vue';

const drawer = ref(true);
const rail = ref(true);

const menuItems = ref([
  { title: 'Home', icon: 'mdi mdi-home', value: 'home', to: '/home' },
  { title: 'Custom Report', icon: 'mdi mdi-file-chart-outline', value: 'custom-report', to: '/custom_report' },
  { title: 'E-Tax Invoice', icon: 'mdi mdi-receipt-text-outline', value: 'e-tax-invoice', to: '/e_tax_invoice' },
  { title: 'Send Email', icon: 'mdi mdi-send', value: 'send-email', to: '/send_email' },
  { title: 'User Management', icon: 'mdi mdi-account-multiple-outline', value: 'user-management', to: '/user_management' },
  { title: 'Form Dictionary', icon: 'mdi mdi-form-select', value: 'form-dictionary', to: '/form_dictionary' },
  { title: 'System Config', icon: 'mdi mdi-cog-outline', value: 'system-config', to: '/system_config' },
  { title: 'Setup API Token', icon: 'mdi mdi-key-chain-variant', value: 'setup-api-token', to: '/setup_api_token' },
]);

const moduleItems = ref([
  { code: 'FIN' }, { code: 'PM' }, { code: 'BD' }, { code: 'DF' },
  { code: 'PO' }, { code: 'AP' }, { code: 'IC' }, { code: 'AR' },
  { code: 'GL' }, { code: 'FA' }, { code: 'REC' }, { code: 'V' },
]);

const isConditionFormVisible = ref(false);

const handleToolbarAction = (action) => {
  if (action === 'report') {
    isConditionFormVisible.value = true;
    console.log("Condition Report Popup opened from Layout Component.");
  } else {
    console.log(`Toolbar Action: ${action}`);
  }
};
</script>

<style scoped>
/* ปรับขนาดไอคอน MDI */
.mdi {
  font-size: 20px;
}
</style>
