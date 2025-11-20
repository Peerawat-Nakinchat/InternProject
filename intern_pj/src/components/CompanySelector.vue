<template>
  <div class="relative w-60">
    <!-- Dropdown Button -->
    <button
      @click="toggleDropdown"
      class="w-full h-10 px-4 flex justify-between items-center rounded-xl bg-white/20 backdrop-blur-md border border-white/30 shadow-md text-gray-800 hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-300"
    >
      <span>{{ selectedCompanyName }}</span>
      <svg
        class="w-5 h-5 text-gray-500 transition-transform duration-300"
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
      class="absolute mt-2 w-full bg-white/20 backdrop-blur-md border border-white/30 rounded-xl shadow-xl z-50 max-h-60 overflow-auto transition-all duration-300"
    >
      <li
        v-for="company in companyStore.companies"
        :key="company.org_id"
        @click="selectCompany(company)"
        class="px-4 py-3 cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors rounded-lg"
      >
        {{ company.org_name }}
      </li>
    </ul>

    <!-- Loading / Error -->
    <p v-if="companyStore.loading" class="text-gray-300 text-sm mt-1">Loading companies...</p>
    <p v-if="companyStore.error" class="text-red-400 text-sm mt-1">{{ companyStore.error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useCompanyStore } from '@/stores/company'

const companyStore = useCompanyStore()
const dropdownOpen = ref(false)

const toggleDropdown = () => {
  dropdownOpen.value = !dropdownOpen.value
}

const selectCompany = (company: any) => {
  companyStore.setSelectedCompany(company)
  dropdownOpen.value = false
}

// Display selected company name
const selectedCompanyName = computed(() => companyStore.selectedCompany?.org_name || 'Select Company')

// Fetch companies on mount
onMounted(async () => {
  await companyStore.fetchCompanies()
})

// Watch for initial selection
watch(
  () => companyStore.companies,
  (companies) => {
    if (companies.length && !companyStore.selectedCompany) {
      companyStore.setSelectedCompany(companies[0])
    }
  },
  { immediate: true }
)
</script>
