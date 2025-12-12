<template>
  <div class="min-h-screen">
    <!-- Header Section -->
    <div class="mb-8">
      <div class="flex items-center gap-4">
        <!-- Back Button -->
        <button
          @click="goBack"
          class="w-12 h-12 rounded-xl bg-white border border-neutral-200 flex items-center justify-center hover:bg-neutral-50 hover:border-primary-300 transition-all duration-200 shadow-sm hover:shadow-md group"
        >
          <i
            class="mdi mdi-arrow-left text-xl text-neutral-500 group-hover:text-primary-600 transition-colors"
          ></i>
        </button>

        <!-- Page Icon -->
        <div
          class="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/30"
        >
          <i class="mdi mdi-file-document-outline text-2xl text-white"></i>
        </div>

        <!-- Title -->
        <div class="flex-1">
          <h1 class="text-2xl font-bold text-neutral-800">{{ menuLabel }}</h1>
          <p class="text-neutral-500 text-sm">{{ moduleCode }}</p>
        </div>
      </div>
    </div>

    <!-- Content Area - Blank for now -->
    <div class="bg-white rounded-2xl border border-neutral-100 shadow-sm p-12 text-center">
      <div
        class="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center"
      >
        <i class="mdi mdi-hammer-wrench text-5xl text-primary-500"></i>
      </div>
      <h2 class="text-xl font-semibold text-neutral-700 mb-2">กำลังพัฒนา</h2>
      <p class="text-neutral-500 mb-6">หน้านี้จะถูกพัฒนาในเร็วๆ นี้</p>

      <!-- Info Cards -->
      <div class="flex flex-col sm:flex-row gap-4 justify-center mt-8">
        <div
          class="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-xl text-sm"
        >
          <i class="mdi mdi-cube-outline"></i>
          <span>Module: {{ moduleCode }}</span>
        </div>
        <div
          class="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-600 rounded-xl text-sm"
        >
          <i class="mdi mdi-menu"></i>
          <span>{{ menuLabel }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const moduleCode = computed(() => (route.query.module as string) || 'Module')
const menuLabel = computed(() => (route.query.menu as string) || 'Menu')

const goBack = () => {
  router.back()
}
</script>
