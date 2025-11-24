<template>
  <div
    class="w-full h-[55px] overflow-visible bg-linear-to-tr from-[#1C244B] to-[#682DB5] backdrop-blur-md border-t-white border-t border-b border-[#4B1E89]/50 flex items-center px-4 justify-between shadow-b-md"
  >
    <!-- Left side -->
    <!-- Company Selector -->
    <div class="relative">
      <CompanySelector />
    </div>


    <!-- Right side -->
    <div class="flex items-center gap-3">

      <button
        @click="$emit('open-invite')"
        class="
          flex items-center gap-2 justify-center h-10
          rounded-lg shadow-md font-medium text-white
          bg-linear-to-r from-[#682DB5] to-[#8F3ED0]
          hover:from-[#7F39D1] hover:to-[#9B5DE5]
          transition-all duration-300

          /* Responsive spacing */
          px-3 py-1.5               /* mobile */
          sm:px-4 sm:py-2        /* tablet */
          md:px-5 md:py-2.5        /* desktop */

          /* Responsive font */
          text-sm                 /* mobile */
          sm:text-base            /* tablet */
          md:text-md              /* desktop */
        "
      >
        <i class="mdi mdi-account-plus 
                  text-base sm:text-lg md:text-xl"></i>
        <span>Invite Member</span>
      </button>



    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import CompanySelector from './CompanySelector.vue'
import InviteModal from "@/components/modals/InviteModal.vue";

const isInviteModalOpen = ref(false);


</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes fade-in {
  from { opacity: 0; transform: scale(0.97); }
  to { opacity: 1; transform: scale(1); }
}
.animate-fade-in {
  animation: fade-in 0.2s ease-out;
}
</style>