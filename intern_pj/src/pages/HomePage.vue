<template>
  <div class="flex min-h-screen bg-gray-800">

    <!-- Sidebar -->
    <Sidebar :rail="railState" />

    <!-- Right Column -->
    <div class="flex flex-col flex-1">

      <!-- Navbar ติดกับ Sidebar -->
      <Navbar class="h-12" />

      <!-- Main Content -->
      <main class="flex-1 p-6 overflow-auto">
        <H1 class="text-white">minn</H1>
      </main>

    </div>

  </div>
</template>


<script setup>
import { ref, provide } from 'vue';
// ตรวจสอบ Path การ import ให้ถูกต้องตามโครงสร้างโปรเจกต์ของคุณ
import Navbar from '@/components/Navbar.vue';
import Sidebar from '@/components/Sidebar.vue';

// ⚡️ Logic การจัดการสถานะ rail (เปิด/ปิด Sidebar) ⚡️
const railState = ref(true); 

const toggleRail = () => {
    railState.value = !railState.value;
};

// ⚡️ ใช้ provide เพื่อส่งสถานะ rail และฟังก์ชัน toggleRail ให้ Components ลูกใช้ ⚡️
provide('railState', railState);
provide('toggleRail', toggleRail); 

// menuItems และ handleToolbarAction ถูกย้ายไปที่ Sidebar และ Navbar ตามความเหมาะสม
</script>

<style scoped>
/* สไตล์ที่เกี่ยวข้องกับ Sidebar ถูกย้ายไปที่ Sidebar.vue */
</style>