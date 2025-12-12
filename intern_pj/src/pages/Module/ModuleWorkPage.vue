<template>
  <div class="min-h-screen">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center gap-4 mb-4">
        <button
          @click="goBack"
          class="w-10 h-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center hover:bg-neutral-50 transition-colors"
        >
          <i class="mdi mdi-arrow-left text-neutral-600"></i>
        </button>
        <div
          class="w-14 h-14 rounded-xl flex items-center justify-center"
          :class="getModuleGradient(0)"
        >
          <i class="mdi text-2xl text-white" :class="getModuleIcon(moduleCode)"></i>
        </div>
        <div>
          <h1 class="text-2xl font-bold text-neutral-800">{{ moduleCode }}</h1>
          <p class="text-neutral-500 text-sm">{{ moduleName }}</p>
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
      <div
        class="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-xl text-sm"
      >
        <i class="mdi mdi-information-outline"></i>
        <span>Module: {{ moduleCode }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getModuleIcon, getModuleGradient } from '@/utils/moduleIcons'

const route = useRoute()
const router = useRouter()

const moduleCode = computed(() => (route.query.code as string) || 'Module')
const moduleName = computed(() => (route.query.name as string) || '')

const goBack = () => {
  router.push({ name: 'home' })
}
</script>
