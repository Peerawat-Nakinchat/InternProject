<template>
  <div class="bg-white shadow rounded-lg p-6">

    <h1 class="text-2xl font-bold mb-4 text-gray-800">
      ยินดีต้อนรับ, {{ authStore.userName }}
    </h1>

    <p class="text-gray-600 mb-4">
      บริษัทที่เลือก: {{ companyStore.selectedCompany?.org_name || "ไม่พบบริษัท" }}
    </p>

    <div v-if="companyStore.error" class="text-red-500 mb-4">
      {{ companyStore.error }}
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

      <!-- Loading Message -->
      <template v-if="companyStore.loading">
        <LoadingMessage title="กำลังโหลดข้อมูล" subtitle="กำลังดึงข้อมูลบริษัท" />
      </template>

      <!-- Real Data -->
      <template v-else>
        <div
          v-for="company in companyStore.companies"
          :key="company.org_id"
          class="border p-4 rounded-lg shadow hover:shadow-lg transition"
        >
          <h2 class="text-lg font-semibold">{{ company.org_name }}</h2>
          <p class="text-gray-500 text-sm">รหัสบริษัท: {{ company.org_code }}</p>
        </div>
      </template>

    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from "@/stores/auth"
import { useCompanyStore } from "@/stores/company"
import LoadingMessage from "@/components/loading/LoadingMessage.vue"

const authStore = useAuthStore()
const companyStore = useCompanyStore()

companyStore.fetchCompanies()
</script>
