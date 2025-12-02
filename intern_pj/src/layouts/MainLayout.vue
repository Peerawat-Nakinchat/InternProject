<template>
  <div class="flex min-h-screen bg-gray-100">
    <!-- Sidebar -->
    <Sidebar :rail="railState" />

    <!-- Right side -->
    <div class="flex flex-col flex-1">
      
      <!-- Navbar -->
      <Navbar class="h-12 z-40" />

      <!-- Toolbar -->
      <ToolBar class="h-12 z-30" @open-invite="openInviteModal">
        <CompanySelector />
      </ToolBar>

      <!-- Page Content -->
      <div class="flex-1 p-4 flex justify-center items-center relative overflow-visible">

        <!-- ⬇ Fade Loader -->
        <transition name="fade-fast" mode="out-in" v-if="loading" key="loading">
          <LoadingMessage title="กำลังโหลดข้อมูล" subtitle="กรุณารอสักครู่"/>
        </transition>

        <!-- ⬇ Fade router-view -->
        <transition name="fade-fast" mode="out-in" v-else key="content">
          <router-view class="w-full" />
        </transition>

      </div>
    </div>

    <!-- Invite Modal -->
    <InviteModal 
      v-if="isInviteOpen"
      :open="isInviteOpen"
      @close="isInviteOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, provide } from "vue"
import Sidebar from "@/components/Sidebar.vue"
import Navbar from "@/components/Navbar.vue"
import ToolBar from "@/components/ToolBar.vue"
import CompanySelector from "@/components/CompanySelector.vue"
import InviteModal from "@/components/modals/InviteModal.vue"
import { useAppLoading } from "@/stores/appLoading"
import { storeToRefs } from "pinia"
import LoadingMessage from "@/components/loading/LoadingMessage.vue"  



const { loading } = storeToRefs(useAppLoading())
// rail state
const railState = ref(true)
const toggleRail = () => (railState.value = !railState.value)

// provide for Sidebar toggle
provide("railState", railState)
provide("toggleRail", toggleRail)

// invite modal
const isInviteOpen = ref(false)
const openInviteModal = () => (isInviteOpen.value = true)
</script>
