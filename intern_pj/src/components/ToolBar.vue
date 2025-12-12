<template>
  <div
    class="w-full h-[55px] overflow-visible bg-linear-to-tr from-[#1C244B] to-[#682DB5] backdrop-blur-md border-t-white border-t border-b border-[#4B1E89]/50 flex items-center px-4 justify-between shadow-b-md"
  >
    <!-- Left side -->
    <div class="relative">
      <CompanySelector />
    </div>

    <!-- Right side -->
    <div class="flex items-center gap-3">
      <!-- ISO Page Actions -->
      <template v-if="route.name === 'ModulePage'">
        <!-- Filter Dropdown -->
        <div class="relative" ref="filterDropdownRef">
          <button
            @click="toggleFilterDropdown"
            class="flex items-center justify-center gap-2 h-9 w-28 px-3 py-2 rounded-lg shadow-md font-medium text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all duration-300 ease-in-out"
          >
            <i class="mdi mdi-filter-variant text-lg"></i>
            <span class="text-sm font-semibold">{{ filterStatusLabel }}</span>
            <i
              class="mdi mdi-chevron-down text-sm transition-transform duration-200"
              :class="{ 'rotate-180': isFilterOpen }"
            ></i>
          </button>

          <!-- Filter Dropdown Panel -->
          <transition name="dropdown">
            <div
              v-if="isFilterOpen"
              class="absolute left-0 mt-2 w-28 bg-[#1C244B] border border-purple-500/40 rounded-lg shadow-2xl z-50 overflow-hidden"
            >
              <div class="py-1">
                <button
                  v-for="option in filterOptions"
                  :key="option.value"
                  @click="selectFilter(option.value)"
                  class="w-full flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-purple-600/40 transition-colors cursor-pointer"
                  :class="{ 'bg-purple-600/30': filterStatus === option.value }"
                >
                  <span class="w-2 h-2 rounded-full" :class="option.dotClass"></span>
                  {{ option.label }}
                </button>
              </div>
            </div>
          </transition>
        </div>

        <!-- Divider -->
        <div class="h-6 w-px bg-white/20"></div>

        <!-- Add Button -->
        <button
          @click="dispatchModuleAction('add')"
          class="action-btn bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400"
          title="เพิ่ม Module"
        >
          <i class="mdi mdi-plus text-lg"></i>
          <span class="hidden lg:inline ml-2 text-sm font-semibold">เพิ่ม</span>
        </button>

        <!-- Edit Button -->
        <button
          @click="dispatchModuleAction('edit')"
          class="action-btn bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300"
          title="แก้ไข Module"
        >
          <i class="mdi mdi-pencil-outline text-lg"></i>
          <span class="hidden lg:inline ml-2 text-sm font-semibold">แก้ไข</span>
        </button>

        <!-- Delete Button -->
        <button
          @click="dispatchModuleAction('delete')"
          class="action-btn bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400"
          title="ลบ Module"
        >
          <i class="mdi mdi-trash-can-outline text-lg"></i>
          <span class="hidden lg:inline ml-2 text-sm font-semibold">ลบ</span>
        </button>

        <!-- Profile/Details Button -->
        <button
          @click="dispatchModuleAction('view')"
          class="action-btn bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400"
          title="ดูรายละเอียด"
        >
          <i class="mdi mdi-eye-outline text-lg"></i>
          <span class="hidden lg:inline ml-2 text-sm font-semibold">ดูรายละเอียด</span>
        </button>
      </template>

      <!-- Invite Button (Home/Company page) -->
      <transition name="invite-button">
        <button
          v-if="
            ((companyStore.selectedCompany?.role_id === 1 ||
              companyStore.selectedCompany?.role_id === 2) &&
              route.name === 'home') ||
            route.name === 'company'
          "
          @click="isInviteModalOpen = true"
          class="flex items-center justify-center h-9 w-9 md:w-auto md:px-4 md:py-2 lg:h-10 lg:px-4 lg:py-2 rounded-full md:rounded-lg shadow-md font-medium text-white bg-linear-to-r from-[#682DB5] to-[#8F3ED0] hover:from-[#7F39D1] hover:to-[#9B5DE5] transition-all duration-300 ease-in-out overflow-hidden"
        >
          <i
            class="mdi mdi-account-plus text-lg md:text-base lg:text-xl transform transition-transform duration-300"
          ></i>
          <span
            class="hidden md:inline ml-2 truncate text-sm font-semibold tracking-wide uppercase"
          >
            Invite Member
          </span>
        </button>
      </transition>
      <InviteModal v-if="isInviteModalOpen" @close="isInviteModalOpen = false" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import CompanySelector from './CompanySelector.vue'
import { useCompanyStore } from '@/stores/company'
import InviteModal from '@/components/modals/InviteModal.vue'
import { useRoute } from 'vue-router'

const emit = defineEmits([
  'add-module',
  'edit-module',
  'delete-module',
  'view-module',
  'filter-change',
])

const route = useRoute()

const isInviteModalOpen = ref(false)
const companyStore = useCompanyStore()

// Filter state
const isFilterOpen = ref(false)
const filterStatus = ref('all')
const filterDropdownRef = ref<HTMLElement | null>(null)

// Filter options
const filterOptions = [
  { value: 'all', label: 'ทั้งหมด', dotClass: 'bg-purple-400' },
  { value: 'active', label: 'เปิด', dotClass: 'bg-emerald-400' },
  { value: 'inactive', label: 'ปิด', dotClass: 'bg-gray-400' },
]

// Computed label for current filter
const filterStatusLabel = computed(() => {
  const option = filterOptions.find((o) => o.value === filterStatus.value)
  return option?.label || 'ทั้งหมด'
})

const toggleFilterDropdown = () => {
  isFilterOpen.value = !isFilterOpen.value
}

// Select filter and apply immediately
const selectFilter = (value: string) => {
  filterStatus.value = value
  isFilterOpen.value = false
  emit('filter-change', value)
  // Also dispatch window event for pages that listen
  window.dispatchEvent(new CustomEvent('filter-change', { detail: value }))
}

// Dispatch module action events to window for ModulePage to listen
const dispatchModuleAction = (action: string) => {
  window.dispatchEvent(new CustomEvent('module-action', { detail: action }))
}

// Close dropdown when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  if (filterDropdownRef.value && !filterDropdownRef.value.contains(event.target as Node)) {
    isFilterOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style>
/* Action button base style */
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 2.25rem; /* h-9 */
  padding: 0.5rem 0.75rem; /* py-2 px-3 */
  border-radius: 0.5rem; /* rounded-lg */
  box-shadow:
    0 4px 6px -1px rgb(0 0 0 / 0.1),
    0 2px 4px -2px rgb(0 0 0 / 0.1); /* shadow-md */
  font-weight: 500; /* font-medium */
  color: white;
  transition: all 300ms ease-in-out;
}

.action-btn:hover {
  box-shadow:
    0 10px 15px -3px rgb(0 0 0 / 0.1),
    0 4px 6px -4px rgb(0 0 0 / 0.1); /* shadow-lg */
  transform: translateY(-1px);
}

.action-btn:active {
  transform: translateY(0);
}

/* Dropdown animation */
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}

.dropdown-enter-to,
.dropdown-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease-out;
}

/* Invite button animation */
.invite-button-enter-from {
  width: 40px; /* mobile */
  opacity: 0;
}
.invite-button-enter-to {
  width: auto; /* iPad+ ปุ่มเต็ม */
  opacity: 1;
}
.invite-button-leave-from {
  width: auto;
  opacity: 1;
}
.invite-button-leave-to {
  width: 40px;
  opacity: 0;
}

.invite-button-enter-active,
.invite-button-leave-active {
  transition: all 0.3s ease-in-out;
}

/* Icon scale animation */
button:hover i {
  transform: scale(1.1);
  transition: transform 0.3s ease-in-out;
}

/* Fade-in ข้อความ */
button span {
  transition:
    opacity 0.3s ease-in-out,
    transform 0.3s ease-in-out;
}
button span.md:inline {
  opacity: 1;
  transform: translateX(0);
}
</style>
