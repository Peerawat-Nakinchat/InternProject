<template>
  <div class="relative w-60">
    <!-- Dropdown Button -->
    <button
      @click="toggleDropdown"
      class="w-full h-9 px-4 bg-linear-to-r from-[#682DB5] to-[#8F3ED0] flex justify-between items-center rounded-md font-semibold backdrop-blur-md shadow-lg text-white hover:from-[#7F39D1] hover:to-[#9B5DE5] hover:text-yellow-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition duration-300"
    >
      <span>{{ selectedCompanyName }}</span>
      <svg
        class="w-5 h-5 text-gray-200 active:text-blue-950 transition-transform duration-300 ml-2"
        :class="{'rotate-180': dropdownOpen}"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Dropdown List -->
    <ul
      v-if="dropdownOpen"
      class="absolute w-full rounded-b-md border-b-2 border-b-purple-500 border-x-2 border-x-purple-500 bg-white backdrop-blur-md border border-white/30 shadow-xl z-50 max-h-60 overflow-auto transition-all duration-300"
    >
      <!-- Loop ตาม role group -->
      <template v-for="(items, role) in groupedCompanies" :key="role">
        <!-- Group Header (คลิกได้) -->
        <li
          @click="toggleRole(role)"
          class="px-4 py-2 bg-[#4A137A] text-white font-bold cursor-pointer hover:bg-[#5A1F8A] flex justify-between items-center sticky top-0 z-20 transition-colors"
        >
          <span>{{ role }} ({{ items.length }})</span>
          <svg
            class="w-4 h-4 transition-transform duration-200"
            :class="{ 'rotate-180': expandedRoles[role] }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </li>

        <!-- Items under each group (แสดงเมื่อ expand) -->
        <template v-if="expandedRoles[role]">
          <li
            v-for="company in items"
            :key="company.org_id"
            @click="selectCompany(company)"
            class="px-4 py-3 pl-8 bg-linear-to-r from-[#682DB5] to-[#8F3ED0] cursor-pointer hover:from-[#7F39D1] hover:to-[#9B5DE5] hover:text-yellow-400 transition-colors text-white border-l-4 border-purple-300"
          >
            {{ company.org_name }}
          </li>
        </template>
      </template>
    </ul>

    <!-- Loading / Error -->
    <p v-if="companyStore.error" class="text-red-400 text-sm mt-1">{{ companyStore.error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useCompanyStore } from '@/stores/company'

const companyStore = useCompanyStore()
const dropdownOpen = ref(false)
const expandedRoles = ref<Record<string, boolean>>({})

const toggleDropdown = () => {
  dropdownOpen.value = !dropdownOpen.value
  
  // เปิด role แรกอัตโนมัติเมื่อเปิด dropdown
  if (dropdownOpen.value && Object.keys(expandedRoles.value).length === 0) {
    const firstRole = Object.keys(groupedCompanies.value)[0]
    if (firstRole) expandedRoles.value[firstRole] = true
  }
}

const toggleRole = (role: string) => {
  expandedRoles.value[role] = !expandedRoles.value[role]
}

const selectCompany = (company: any) => {
  companyStore.setSelectedCompany(company)
  dropdownOpen.value = false
}

const groupedCompanies = computed(() => {
  const groups: Record<string, any[]> = {}

  companyStore.companies.forEach(c => {
    const role = c.role_name ?? 'Unknown'
    if (!groups[role]) groups[role] = []
    groups[role].push(c)
  })

  return groups
})

const selectedCompanyName = computed(() => 
  companyStore.selectedCompany?.org_name || 'เลือกบริษัท'
)

onMounted(async () => {
  await companyStore.fetchCompanies()
})
</script>