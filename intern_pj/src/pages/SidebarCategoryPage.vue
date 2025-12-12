<template>
  <div class="min-h-screen">
    <!-- Header Section -->
    <div class="mb-8">
      <div class="flex items-center gap-4">
        <!-- Category Icon -->
        <div
          class="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg"
          :class="categoryConfig.gradient"
        >
          <i class="mdi text-2xl text-white" :class="categoryConfig.icon"></i>
        </div>

        <!-- Title -->
        <div class="flex-1">
          <h1 class="text-2xl font-bold text-neutral-800">{{ categoryConfig.title }}</h1>
          <p class="text-neutral-500 text-sm">เลือก Module ที่ต้องการดูเมนู</p>
        </div>
      </div>
    </div>

    <!-- Module Selection -->
    <div class="mb-6">
      <div class="flex items-center gap-4 flex-wrap">
        <span class="text-sm text-neutral-500">เลือก Module:</span>
        <div class="flex gap-2 flex-wrap">
          <button
            v-for="module in modules"
            :key="module.module_id"
            @click="selectModule(module.module_code)"
            class="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
            :class="
              selectedModuleCode === module.module_code
                ? categoryConfig.selectedClass
                : 'bg-white border border-neutral-200 text-neutral-600 hover:border-primary-300'
            "
          >
            {{ module.module_code }}
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoadingModules || isLoadingMenus" class="space-y-4">
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

    <!-- No Module Selected -->
    <div
      v-else-if="!selectedModuleCode && modules.length > 0"
      class="bg-white rounded-2xl p-12 text-center border border-neutral-100"
    >
      <div
        class="w-20 h-20 mx-auto mb-4 bg-neutral-100 rounded-2xl flex items-center justify-center"
      >
        <i class="mdi mdi-cursor-default-click-outline text-4xl text-neutral-400"></i>
      </div>
      <p class="text-neutral-600 font-medium mb-2">กรุณาเลือก Module</p>
      <p class="text-neutral-400 text-sm">คลิกที่ปุ่ม Module ด้านบนเพื่อดูเมนู</p>
    </div>

    <!-- No Modules Available -->
    <div
      v-else-if="modules.length === 0"
      class="bg-white rounded-2xl p-12 text-center border border-neutral-100"
    >
      <div
        class="w-20 h-20 mx-auto mb-4 bg-neutral-100 rounded-2xl flex items-center justify-center"
      >
        <i class="mdi mdi-package-variant text-4xl text-neutral-400"></i>
      </div>
      <p class="text-neutral-600 font-medium mb-2">ไม่พบ Module</p>
      <p class="text-neutral-400 text-sm">ยังไม่มี Module ในระบบ</p>
    </div>

    <!-- Empty Menus -->
    <div
      v-else-if="menus.length === 0"
      class="bg-white rounded-2xl p-12 text-center border border-neutral-100"
    >
      <div
        class="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center"
        :class="categoryConfig.bgLight"
      >
        <i class="mdi text-4xl" :class="[categoryConfig.icon, categoryConfig.iconColor]"></i>
      </div>
      <p class="text-neutral-600 font-medium mb-2">ไม่พบเมนู</p>
      <p class="text-neutral-400 text-sm">
        ยังไม่มีเมนู {{ categoryConfig.title }} สำหรับ {{ selectedModuleCode }}
      </p>
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
          :class="categoryConfig.bgLight"
        >
          <div
            class="w-10 h-10 rounded-lg flex items-center justify-center"
            :class="categoryConfig.gradient"
          >
            <i
              class="mdi text-lg text-white"
              :class="parentMenu.web_icon_name || categoryConfig.icon"
            ></i>
          </div>
          <div class="flex-1">
            <h3 class="font-semibold text-neutral-800">{{ parentMenu.menu_label }}</h3>
            <p class="text-xs text-neutral-500">{{ parentMenu.children?.length || 0 }} เมนูย่อย</p>
          </div>
          <span class="px-3 py-1 text-xs font-medium rounded-full" :class="categoryConfig.badge">
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

          <!-- Empty children -->
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
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { moduleService, type Module } from '@/services/moduleService'
import { isoMenuService, type HierarchicalMenu } from '@/services/isoMenuService'

const route = useRoute()
const router = useRouter()

// Determine category type from route
const menuType = computed(() => {
  const path = route.path
  if (path.includes('master')) return 'M'
  if (path.includes('transaction')) return 'T'
  if (path.includes('report')) return 'R'
  return 'M'
})

// Category config
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
        selectedClass: 'bg-emerald-600 text-white shadow-md',
        iconColor: 'text-emerald-500',
      }
    case 'T':
      return {
        title: 'Transaction',
        icon: 'mdi-swap-horizontal-bold',
        gradient: 'bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30',
        bgLight: 'bg-blue-50',
        badge: 'bg-blue-100 text-blue-700',
        selectedClass: 'bg-blue-600 text-white shadow-md',
        iconColor: 'text-blue-500',
      }
    case 'R':
      return {
        title: 'Report',
        icon: 'mdi-chart-bar',
        gradient: 'bg-gradient-to-br from-amber-500 to-amber-700 shadow-lg shadow-amber-500/30',
        bgLight: 'bg-amber-50',
        badge: 'bg-amber-100 text-amber-700',
        selectedClass: 'bg-amber-600 text-white shadow-md',
        iconColor: 'text-amber-500',
      }
    default:
      return {
        title: 'Menu',
        icon: 'mdi-menu',
        gradient:
          'bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/30',
        bgLight: 'bg-primary-50',
        badge: 'bg-primary-100 text-primary-700',
        selectedClass: 'bg-primary-600 text-white shadow-md',
        iconColor: 'text-primary-500',
      }
  }
})

// State
const modules = ref<Module[]>([])
const selectedModuleCode = ref<string>('')
const menus = ref<HierarchicalMenu[]>([])
const isLoadingModules = ref(false)
const isLoadingMenus = ref(false)

// Load modules
const loadModules = async () => {
  isLoadingModules.value = true
  try {
    const result = await moduleService.getAll({ sortBy: 'module_point', sortOrder: 'ASC' })
    modules.value = result.modules

    // Auto-select first module if any
    if (modules.value.length > 0) {
      selectedModuleCode.value = modules.value[0].module_code
    }
  } catch (err) {
    console.error('Error loading modules:', err)
  } finally {
    isLoadingModules.value = false
  }
}

// Load menus for selected module
const loadMenus = async () => {
  if (!selectedModuleCode.value) {
    menus.value = []
    return
  }

  isLoadingMenus.value = true
  try {
    menus.value = await isoMenuService.getByType(
      selectedModuleCode.value,
      menuType.value as 'M' | 'T' | 'R',
    )
  } catch (err) {
    console.error('Error loading menus:', err)
    menus.value = []
  } finally {
    isLoadingMenus.value = false
  }
}

// Select module
const selectModule = (moduleCode: string) => {
  selectedModuleCode.value = moduleCode
}

// Navigate to menu
const navigateToMenu = (menu: {
  web_route_path: string | null
  menu_label: string
  menu_ref_id: string
}) => {
  if (menu.web_route_path) {
    router.push(menu.web_route_path)
  } else {
    router.push({
      name: 'ModuleBlankPage',
      query: {
        module: selectedModuleCode.value,
        menu: menu.menu_label,
        id: menu.menu_ref_id,
      },
    })
  }
}

// Watch for module change
watch(selectedModuleCode, () => {
  loadMenus()
})

onMounted(() => {
  loadModules()
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
