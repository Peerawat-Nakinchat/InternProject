<template>
  <div class="relative w-60 ">
    <!-- Dropdown Button -->
    <button
      @click="toggleDropdown"
      class="w-full h-9 px-4 bg-linear-to-r from-[#682DB5] to-[#8F3ED0] flex justify-between items-center rounded-md font-semibold backdrop-blur-md  shadow-lg text-white hover:from-[#7F39D1] hover:to-[#9B5DE5]
                hover:text-yellow-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition duration-300"
    >
      <span>บริษัท : {{ selectedCompanyName }}</span>
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
      class="absolute w-full rounded-b-md border-b-2 border-b-purple-500 border-x-2 border-x-purple-500 bg-white backdrop-blur-md border border-white/30  shadow-xl z-50 max-h-60 overflow-auto transition-all duration-300"
    >
      <li
        v-for="company in companyStore.companies"
        :key="company.org_id"
        @click="selectCompany(company)"
        class="px-4 py-3 bg-linear-to-r from-[#682DB5] to-[#8F3ED0]  cursor-pointer hover:from-[#7F39D1] hover:to-[#9B5DE5]
                hover:text-yellow-400 transition-colors text-white"
      >
        {{ company.org_name }}
      </li>
    </ul>

    <!-- Loading / Error -->
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
