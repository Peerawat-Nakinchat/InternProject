<template>
  <div class="flex min-h-screen bg-gray-100">
    <!-- Sidebar -->
    <Sidebar :rail="railState" />

    <!-- Right Column -->
    <div class="flex flex-col flex-1">
      <!-- Navbar -->
      <Navbar class="h-12" />

      <!-- Toolbar -->
      <ToolBar class="h-12">
        <CompanySelector />
      </ToolBar>

      <!-- Main Content -->
      <main class="flex-1 p-6 overflow-auto">
        <div class="bg-white shadow rounded-lg p-6">
          <h1 class="text-2xl font-bold mb-4 text-gray-800">
            ยินดีต้อนรับ, {{ authStore.userName }}
          </h1>

          <p class="text-gray-600 mb-4">
            บริษัทที่เลือก: {{ companyStore.selectedCompany?.org_name || "ไม่พบบริษัท" }}
          </p>

          <div v-if="companyStore.error" class="text-red-500 mb-4">{{ companyStore.error }}</div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Skeleton ขณะ loading -->
            <template v-if="companyStore.loading">
              <div
                v-for="(skeleton, index) in skeletonCards"
                :key="index"
                class="border p-4 rounded-lg shadow"
              >
                <AdvancedSkeleton :rows="skeleton" />
              </div>
            </template>

            <!-- ข้อมูลจริง -->
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
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, provide } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useCompanyStore } from "@/stores/company";

import Sidebar from "@/components/Sidebar.vue";
import Navbar from "@/components/Navbar.vue";
import ToolBar from "@/components/ToolBar.vue";
import CompanySelector from "@/components/CompanySelector.vue";
import AdvancedSkeleton from "@/components/loading/AdvancedSkeleton.vue";

// Stores
const authStore = useAuthStore();
const companyStore = useCompanyStore();

// Sidebar rail state
const railState = ref(true)
const toggleRail = () => {
  railState.value = !railState.value
}
// ฟังก์ชัน generate skeleton card
const generateCompanySkeletonCards = (count: number) => {
  const cardRows = [
    { width: "100%", height: "2rem", class: "bg-gray-300 rounded mb-2" }, // ชื่อบริษัท
    { width: "60%", height: "1rem", class: "bg-gray-300 rounded" },       // รหัสบริษัท
  ];
  return Array.from({ length: count }, () => cardRows);
};

// จำนวน skeleton cards ตาม column responsive
const skeletonCards = ref(
  generateCompanySkeletonCards(
    window.innerWidth >= 1024 ? 6 : window.innerWidth >= 768 ? 4 : 3
  )
);

// Fetch companies on mount
onMounted(async () => {
  await companyStore.fetchCompanies();

  // อัปเดต skeleton เมื่อ resize window
  window.addEventListener("resize", () => {
    skeletonCards.value = generateCompanySkeletonCards(
      window.innerWidth >= 1024 ? 6 : window.innerWidth >= 768 ? 4 : 3
    );
  });
});

provide("railState", railState)
provide("toggleRail", toggleRail)

</script>
