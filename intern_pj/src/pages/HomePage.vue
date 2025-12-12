<template>
  <div class="min-h-screen">
    <!-- Header Section -->
    <div class="mb-8">
      <div class="flex items-center gap-4 mb-2">
        <div
          class="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/30"
        >
          <i class="mdi mdi-view-dashboard text-2xl text-white"></i>
        </div>
        <div>
          <h1
            class="text-3xl font-bold bg-gradient-to-r from-neutral-800 to-neutral-600 bg-clip-text text-transparent"
          >
            ยินดีต้อนรับ, {{ authStore.userName || 'ผู้ใช้งาน' }}
          </h1>
          <p class="text-neutral-500 text-sm">
            บริษัท: {{ companyStore.selectedCompany?.org_name || 'ไม่ได้เลือกบริษัท' }}
          </p>
        </div>
      </div>
    </div>

    <!-- Section Title -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="w-1 h-8 bg-gradient-to-b from-primary-500 to-primary-700 rounded-full"></div>
        <h2 class="text-xl font-semibold text-neutral-700">รายการ Module ทั้งหมด</h2>
        <span class="px-3 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
          {{ modules.length }} รายการ
        </span>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="isLoading"
      class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5"
    >
      <div v-for="n in 5" :key="n" class="animate-pulse">
        <div class="bg-white rounded-2xl p-6 h-48 shadow-sm border border-neutral-100">
          <div class="w-14 h-14 bg-neutral-200 rounded-xl mb-4"></div>
          <div class="h-4 bg-neutral-200 rounded w-3/4 mb-2"></div>
          <div class="h-3 bg-neutral-100 rounded w-full mb-3"></div>
          <div class="h-6 bg-neutral-100 rounded-full w-20"></div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
      <div class="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
        <i class="mdi mdi-alert-circle text-3xl text-red-500"></i>
      </div>
      <p class="text-red-600 font-medium mb-2">เกิดข้อผิดพลาด</p>
      <p class="text-red-500 text-sm mb-4">{{ error }}</p>
      <button
        @click="loadModules"
        class="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-200 shadow-lg shadow-red-600/20"
      >
        <i class="mdi mdi-refresh mr-2"></i>ลองใหม่
      </button>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="modules.length === 0"
      class="bg-white rounded-2xl p-12 text-center border border-neutral-100 shadow-sm"
    >
      <div
        class="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center"
      >
        <i class="mdi mdi-package-variant text-4xl text-primary-500"></i>
      </div>
      <p class="text-neutral-600 font-medium mb-2">ไม่พบ Module</p>
      <p class="text-neutral-400 text-sm">ยังไม่มี Module ในระบบ</p>
    </div>

    <!-- Module Cards Grid -->
    <div
      v-else
      class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5"
    >
      <div
        v-for="(module, index) in modules"
        :key="module.module_id"
        class="group relative"
        :style="{ animationDelay: `${index * 50}ms` }"
      >
        <div
          class="module-card relative bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm hover:shadow-xl hover:shadow-primary-500/10 transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden h-full"
          @click="navigateToModule(module)"
        >
          <!-- Gradient Overlay on Hover -->
          <div
            class="absolute inset-0 bg-gradient-to-br from-primary-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          ></div>

          <!-- Icon -->
          <div class="relative z-10">
            <div
              class="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110"
              :class="getModuleGradient(index)"
            >
              <i class="mdi text-2xl text-white" :class="getModuleIcon(module.module_code)"></i>
            </div>
          </div>

          <!-- Content -->
          <div class="relative z-10">
            <!-- Module Code -->
            <h3
              class="text-lg font-bold text-neutral-800 mb-1 group-hover:text-primary-700 transition-colors duration-200"
            >
              {{ module.module_code }}
            </h3>

            <!-- Module Name -->
            <p class="text-sm text-neutral-500 mb-3 line-clamp-2 leading-relaxed">
              {{ module.module_name }}
            </p>

            <!-- Version & Status -->
            <div class="flex items-center justify-between mt-auto">
              <span
                v-if="module.standard_version"
                class="text-xs text-neutral-400 flex items-center gap-1"
              >
                <i class="mdi mdi-tag-outline text-primary-400"></i>
                v{{ module.standard_version }}
              </span>
              <span v-else class="text-xs text-neutral-400">-</span>

              <!-- Status Badge -->
              <span
                class="px-2.5 py-1 text-xs font-medium rounded-full transition-all duration-200"
                :class="
                  module.is_active === 't' ||
                  module.is_active === 'true'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-neutral-100 text-neutral-500'
                "
              >
                {{
                  module.is_active === 't' ||
                  module.is_active === 'true'
                    ? '● ใช้งาน'
                    : '○ ปิด'
                }}
              </span>
            </div>
          </div>

          <!-- Decorative Corner -->
          <div
            class="absolute -top-2 -right-2 w-16 h-16 rounded-full opacity-10 group-hover:opacity-20 transition-opacity duration-300"
            :class="getModuleGradient(index)"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { moduleService, type Module } from '@/services/moduleService'
import { getModuleIcon, getModuleGradient } from '@/utils/moduleIcons'

const router = useRouter()
const authStore = useAuthStore()
const companyStore = useCompanyStore()

const modules = ref<Module[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

const loadModules = async () => {
  isLoading.value = true
  error.value = null

  try {
    const result = await moduleService.getAll({
      sortBy: 'module_point',
      sortOrder: 'ASC',
    })
    modules.value = result.modules
  } catch (err) {
    console.error('Error loading modules:', err)
    error.value = 'ไม่สามารถโหลดข้อมูล Module ได้'
  } finally {
    isLoading.value = false
  }
}

const navigateToModule = (module: Module) => {
  router.push({
    name: 'ModuleWork',
    query: {
      code: module.module_code,
      name: module.module_name,
      id: module.module_id,
    },
  })
}

onMounted(() => {
  loadModules()
  // Fetch companies if needed
  if (companyStore.companies.length === 0) {
    companyStore.fetchCompanies()
  }
})
</script>

<style scoped>
.module-card {
  animation: fadeInUp 0.4s ease-out forwards;
  opacity: 0;
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

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
