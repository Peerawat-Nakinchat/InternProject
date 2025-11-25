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

      <!-- Invite Button -->
      <transition name="invite-button">
        <button
          v-if="companyStore.selectedCompany?.role_id === 1 || companyStore.selectedCompany?.role_id === 2"
          @click="isInviteModalOpen = true"
          class="flex items-center justify-center
                 h-9 w-9 md:w-auto md:px-4 md:py-2 lg:h-10 lg:px-4 lg:py-2
                 rounded-full md:rounded-lg shadow-md font-medium text-white
                 bg-linear-to-r from-[#682DB5] to-[#8F3ED0]
                 hover:from-[#7F39D1] hover:to-[#9B5DE5]
                 transition-all duration-300 ease-in-out overflow-hidden"
        >
          <i class="mdi mdi-account-plus text-lg md:text-base lg:text-xl transform transition-transform duration-300"></i>
          <span class="hidden md:inline ml-2 truncate text-sm font-semibold tracking-wide uppercase">
            Invite Member
          </span>
        </button>
      </transition>

      <InviteModal v-if="isInviteModalOpen" @close="isInviteModalOpen = false" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import CompanySelector from './CompanySelector.vue'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import InviteModal from '@/components/modals/InviteModal.vue'

const isInviteModalOpen = ref(false)
const authStore = useAuthStore()
const companyStore = useCompanyStore()
const user = computed(() => authStore.user)
</script>

<style>
/* Invite button animation */
.invite-button-enter-from {
  width: 40px;             /* mobile */
  opacity: 0;
}
.invite-button-enter-to {
  width: auto;             /* iPad+ ปุ่มเต็ม */
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
  transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
}
button span.md:inline {
  opacity: 1;
  transform: translateX(0);
}
</style>
