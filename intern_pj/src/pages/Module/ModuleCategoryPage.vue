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

        <!-- Category Icon -->
        <div
          class="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg"
          :class="categoryGradient"
        >
          <i class="mdi text-2xl text-white" :class="categoryIcon"></i>
        </div>

        <!-- Title -->
        <div class="flex-1">
          <h1 class="text-2xl font-bold text-neutral-800">{{ categoryTitle }}</h1>
          <p class="text-neutral-500 text-sm">{{ moduleCode }}</p>
        </div>

        <!-- Badge -->
        <div class="hidden md:flex items-center gap-2 px-4 py-2 bg-neutral-50 rounded-xl">
          <span class="text-sm text-neutral-600">
            {{ menus.length }} Parent Menu{{ menus.length !== 1 ? 's' : '' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="space-y-4">
      <div
        v-for="n in 2"
        :key="n"
        class="animate-pulse bg-white rounded-2xl p-6 border border-neutral-100"
      >
        <div class="h-6 bg-neutral-200 rounded w-1/3 mb-4"></div>
        <div class="space-y-3">
          <div class="h-12 bg-neutral-100 rounded-xl"></div>
          <div class="h-12 bg-neutral-100 rounded-xl"></div>
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
        @click="loadMenus"
        class="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-200"
      >
        <i class="mdi mdi-refresh mr-2"></i>ลองใหม่
      </button>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="menus.length === 0"
      class="bg-white rounded-2xl p-12 text-center border border-neutral-100"
    >
      <div
        class="w-20 h-20 mx-auto mb-4 bg-neutral-100 rounded-2xl flex items-center justify-center"
      >
        <i class="mdi mdi-folder-open-outline text-4xl text-neutral-400"></i>
      </div>
      <p class="text-neutral-600 font-medium mb-2">ไม่พบเมนู</p>
      <p class="text-neutral-400 text-sm">ยังไม่มีเมนูสำหรับ {{ categoryTitle }}</p>
    </div>

    <!-- Menu Groups -->
    <div v-else class="space-y-6">
      <div
        v-for="(parentMenu, index) in menus"
        :key="parentMenu.menu_ref_id"
        class="menu-group bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden"
        :style="{ animationDelay: `${index * 100}ms` }"
      >
        <!-- Parent Menu Header -->
        <div
          class="px-6 py-4 flex items-center gap-4 border-b border-neutral-100"
          :class="[categoryBgLight]"
        >
          <div
            class="w-10 h-10 rounded-lg flex items-center justify-center"
            :class="categoryGradient"
          >
            <i class="mdi text-lg text-white" :class="parentMenu.web_icon_name || categoryIcon"></i>
          </div>
          <div class="flex-1">
            <h3 class="font-semibold text-neutral-800">{{ parentMenu.menu_label }}</h3>
            <p class="text-xs text-neutral-500">{{ parentMenu.children?.length || 0 }} เมนูย่อย</p>
          </div>
          <span class="px-3 py-1 text-xs font-medium rounded-full" :class="categoryBadge">
            {{ parentMenu.menu_id }}
          </span>
        </div>

        <!-- Child Menus -->
        <div class="divide-y divide-neutral-100">
          <div
            v-for="childMenu in parentMenu.children"
            :key="childMenu.menu_ref_id"
            class="group px-6 py-4 flex items-center gap-4 hover:bg-neutral-50 cursor-pointer transition-colors duration-200"
            @click="navigateToMenu(childMenu)"
          >
            <!-- Icon -->
            <div
              class="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center group-hover:bg-neutral-200 transition-colors"
            >
              <i
                class="mdi text-lg text-neutral-600"
                :class="childMenu.web_icon_name || 'mdi-file-document'"
              ></i>
            </div>

            <!-- Label -->
            <div class="flex-1">
              <p
                class="font-medium text-neutral-700 group-hover:text-neutral-900 transition-colors"
              >
                {{ childMenu.menu_label }}
              </p>
              <p v-if="childMenu.web_route_path" class="text-xs text-neutral-400">
                {{ childMenu.web_route_path }}
              </p>
            </div>

            <!-- Arrow -->
            <i
              class="mdi mdi-chevron-right text-xl text-neutral-400 group-hover:text-neutral-600 group-hover:translate-x-1 transition-all duration-200"
            ></i>
          </div>

          <!-- Empty children message -->
          <div
            v-if="!parentMenu.children || parentMenu.children.length === 0"
            class="px-6 py-8 text-center"
          >
            <p class="text-neutral-400 text-sm">ไม่มีเมนูย่อย</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isoMenuService, type HierarchicalMenu } from '@/services/isoMenuService'

const route = useRoute()
const router = useRouter()

// Route params
const moduleCode = computed(() => (route.params.moduleCode as string) || '')
const menuType = computed(() => (route.params.menuType as string)?.toUpperCase() || 'M')

// State
const menus = ref<HierarchicalMenu[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

// Category styling
const categoryConfig = computed(() => {
  const type = menuType.value
  switch (type) {
    case 'M':
      return {
        title: 'Master Data',
        icon: 'mdi-database',
        gradient:
          'bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-500/30',
        bgLight: 'bg-emerald-50',
        badge: 'bg-emerald-100 text-emerald-700',
      }
    case 'T':
      return {
        title: 'Transaction',
        icon: 'mdi-swap-horizontal-bold',
        gradient: 'bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30',
        bgLight: 'bg-blue-50',
        badge: 'bg-blue-100 text-blue-700',
      }
    case 'R':
      return {
        title: 'Report',
        icon: 'mdi-chart-bar',
        gradient: 'bg-gradient-to-br from-amber-500 to-amber-700 shadow-lg shadow-amber-500/30',
        bgLight: 'bg-amber-50',
        badge: 'bg-amber-100 text-amber-700',
      }
    default:
      return {
        title: 'Menu',
        icon: 'mdi-menu',
        gradient:
          'bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/30',
        bgLight: 'bg-primary-50',
        badge: 'bg-primary-100 text-primary-700',
      }
  }
})

const categoryTitle = computed(() => categoryConfig.value.title)
const categoryIcon = computed(() => categoryConfig.value.icon)
const categoryGradient = computed(() => categoryConfig.value.gradient)
const categoryBgLight = computed(() => categoryConfig.value.bgLight)
const categoryBadge = computed(() => categoryConfig.value.badge)

// Methods
const goBack = () => {
  router.push({
    name: 'ModuleWork',
    query: { code: moduleCode.value },
  })
}

const loadMenus = async () => {
  if (!moduleCode.value) {
    error.value = 'Module code is required'
    return
  }

  isLoading.value = true
  error.value = null

  try {
    const type = menuType.value as 'M' | 'T' | 'R'
    menus.value = await isoMenuService.getByType(moduleCode.value, type)
  } catch (err) {
    console.error('Error loading menus:', err)
    error.value = 'ไม่สามารถโหลดเมนูได้'
  } finally {
    isLoading.value = false
  }
}

const navigateToMenu = (menu: {
  web_route_path: string | null
  menu_label: string
  menu_ref_id: string
}) => {
  if (menu.web_route_path) {
    router.push(menu.web_route_path)
  } else {
    // Navigate to blank page for menu without route
    router.push({
      name: 'ModuleBlankPage',
      query: {
        module: moduleCode.value,
        menu: menu.menu_label,
        id: menu.menu_ref_id,
      },
    })
  }
}

onMounted(() => {
  loadMenus()
})
</script>

<style scoped>
.menu-group {
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
</style>
