<template>
  <div class="flex flex-col min-h-screen">

    <!-- Navbar -->
    <Navbar />

    <!-- Sidebar + Content -->
    <div class="flex flex-1">

      <!-- Sidebar -->
      <Sidebar />

      <!-- Main Content (ไม่ต่อจาก Navbar) -->
      <main class="flex-1 bg-gray-200 p-6 overflow-auto">
        <router-view />
      </main>

    </div>
  </div>
</template>

<script setup>
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
</script>
