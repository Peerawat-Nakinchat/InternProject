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

        <!-- Module Icon -->
        <div
          class="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg"
          :class="getModuleGradient(0)"
        >
          <i class="mdi text-2xl text-white" :class="getModuleIcon(moduleCode)"></i>
        </div>

        <!-- Module Info -->
        <div class="flex-1">
          <h1 class="text-2xl font-bold text-neutral-800">{{ moduleCode }}</h1>
          <p class="text-neutral-500 text-sm">{{ moduleName || 'Module Workspace' }}</p>
        </div>

        <!-- Badge -->
        <div class="hidden md:flex items-center gap-2 px-4 py-2 bg-primary-50 rounded-xl">
          <i class="mdi mdi-information-outline text-primary-500"></i>
          <span class="text-sm text-primary-700">เลือกหมวดหมู่ที่ต้องการ</span>
        </div>
      </div>
    </div>

    <!-- Category Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Master Card -->
      <div class="group relative cursor-pointer" @click="navigateTo('master')">
        <div
          class="category-card relative bg-white rounded-2xl p-8 border border-neutral-100 shadow-sm hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-2 overflow-hidden h-full"
        >
          <!-- Gradient Overlay -->
          <div
            class="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          ></div>

          <!-- Icon Container -->
          <div class="relative z-10 mb-6">
            <div
              class="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300"
            >
              <i class="mdi mdi-database text-4xl text-white"></i>
            </div>
          </div>

          <!-- Content -->
          <div class="relative z-10">
            <h2
              class="text-2xl font-bold text-neutral-800 mb-2 group-hover:text-emerald-700 transition-colors"
            >
              Master
            </h2>
            <p class="text-neutral-500 mb-4 leading-relaxed">
              ข้อมูลหลัก และการตั้งค่าพื้นฐานของระบบ เช่น รายชื่อ, หมวดหมู่, การกำหนดค่า
            </p>
            <div class="flex items-center gap-2 text-emerald-600 font-medium">
              <span>จัดการข้อมูล</span>
              <i
                class="mdi mdi-arrow-right group-hover:translate-x-2 transition-transform duration-200"
              ></i>
            </div>
          </div>

          <!-- Decorative -->
          <div
            class="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 opacity-10 group-hover:opacity-20 transition-opacity duration-300"
          ></div>
          <div
            class="absolute bottom-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 opacity-5 translate-x-8 translate-y-8"
          ></div>
        </div>
      </div>

      <!-- Transaction Card -->
      <div class="group relative cursor-pointer" @click="navigateTo('transaction')">
        <div
          class="category-card relative bg-white rounded-2xl p-8 border border-neutral-100 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-2 overflow-hidden h-full"
        >
          <!-- Gradient Overlay -->
          <div
            class="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          ></div>

          <!-- Icon Container -->
          <div class="relative z-10 mb-6">
            <div
              class="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300"
            >
              <i class="mdi mdi-swap-horizontal-bold text-4xl text-white"></i>
            </div>
          </div>

          <!-- Content -->
          <div class="relative z-10">
            <h2
              class="text-2xl font-bold text-neutral-800 mb-2 group-hover:text-blue-700 transition-colors"
            >
              Transaction
            </h2>
            <p class="text-neutral-500 mb-4 leading-relaxed">
              รายการธุรกรรม และกิจกรรมต่างๆ ของระบบ เช่น การบันทึก, การอนุมัติ, การดำเนินการ
            </p>
            <div class="flex items-center gap-2 text-blue-600 font-medium">
              <span>จัดการธุรกรรม</span>
              <i
                class="mdi mdi-arrow-right group-hover:translate-x-2 transition-transform duration-200"
              ></i>
            </div>
          </div>

          <!-- Decorative -->
          <div
            class="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 opacity-10 group-hover:opacity-20 transition-opacity duration-300"
          ></div>
          <div
            class="absolute bottom-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 opacity-5 translate-x-8 translate-y-8"
          ></div>
        </div>
      </div>

      <!-- Report Card -->
      <div class="group relative cursor-pointer" @click="navigateTo('report')">
        <div
          class="category-card relative bg-white rounded-2xl p-8 border border-neutral-100 shadow-sm hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300 hover:-translate-y-2 overflow-hidden h-full"
        >
          <!-- Gradient Overlay -->
          <div
            class="absolute inset-0 bg-gradient-to-br from-amber-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          ></div>

          <!-- Icon Container -->
          <div class="relative z-10 mb-6">
            <div
              class="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform duration-300"
            >
              <i class="mdi mdi-chart-bar text-4xl text-white"></i>
            </div>
          </div>

          <!-- Content -->
          <div class="relative z-10">
            <h2
              class="text-2xl font-bold text-neutral-800 mb-2 group-hover:text-amber-700 transition-colors"
            >
              Report
            </h2>
            <p class="text-neutral-500 mb-4 leading-relaxed">
              รายงานและการวิเคราะห์ข้อมูล เช่น รายงานสรุป, กราฟ, Dashboard
            </p>
            <div class="flex items-center gap-2 text-amber-600 font-medium">
              <span>ดูรายงาน</span>
              <i
                class="mdi mdi-arrow-right group-hover:translate-x-2 transition-transform duration-200"
              ></i>
            </div>
          </div>

          <!-- Decorative -->
          <div
            class="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 opacity-10 group-hover:opacity-20 transition-opacity duration-300"
          ></div>
          <div
            class="absolute bottom-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 opacity-5 translate-x-8 translate-y-8"
          ></div>
        </div>
      </div>
    </div>

    <!-- Info Section -->
    <div class="mt-8 bg-white rounded-2xl border border-neutral-100 p-6 shadow-sm">
      <div class="flex items-start gap-4">
        <div
          class="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0"
        >
          <i class="mdi mdi-lightbulb-on-outline text-2xl text-primary-600"></i>
        </div>
        <div>
          <h3 class="font-semibold text-neutral-700 mb-1">คำแนะนำการใช้งาน</h3>
          <p class="text-neutral-500 text-sm leading-relaxed">
            เลือกหมวดหมู่ที่ต้องการจากด้านบน แต่ละหมวดหมู่จะมีเมนูย่อยที่เกี่ยวข้องกับ
            {{ moduleCode }} โดย
            <span class="text-emerald-600 font-medium">Master</span> สำหรับข้อมูลหลัก,
            <span class="text-blue-600 font-medium">Transaction</span> สำหรับธุรกรรม, และ
            <span class="text-amber-600 font-medium">Report</span> สำหรับรายงาน
          </p>
        </div>
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
const moduleId = computed(() => (route.query.id as string) || '')

const goBack = () => {
  router.push({ name: 'home' })
}

const navigateTo = (category: 'master' | 'transaction' | 'report') => {
  // TODO: Navigate to specific category page when implemented
  console.log(`Navigate to ${category} for module ${moduleCode.value}`, {
    moduleId: moduleId.value,
    category,
  })
  // Future: router.push({ name: 'ModuleCategory', query: { ... } })
}
</script>

<style scoped>
.category-card {
  animation: fadeInUp 0.5s ease-out forwards;
  opacity: 0;
}

.category-card:nth-child(1) {
  animation-delay: 0ms;
}
.category-card:nth-child(2) {
  animation-delay: 100ms;
}
.category-card:nth-child(3) {
  animation-delay: 200ms;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
