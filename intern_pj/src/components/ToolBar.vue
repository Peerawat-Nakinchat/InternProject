<template>
  <div
    class="w-full h-[55px] bg-linear-to-tr from-[#1C244B] to-[#682DB5] backdrop-blur-md border-t-white border-t border-b border-[#4B1E89]/50 flex items-center px-4 justify-between shadow-b-md"
  >
    <!-- Left side -->
    <!-- Company Selector -->
      <CompanySelector />

    <!-- Right side -->
    <div class="flex items-center gap-3">
      

      <!-- Search Input -->
      <div class="relative">
        <input
          type="text"
          placeholder="Search..."
          class="bg-[#682DB5]/30 text-white placeholder-purple-200 px-3 py-2 rounded-lg border border-[#682DB5]/50 focus:ring-2 focus:ring-[#A16CE0] focus:outline-none transition duration-300 backdrop-blur-sm"
        />
        <svg
          class="w-5 h-5 text-purple-300 absolute right-2 top-1/2 -translate-y-1/2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
          />
        </svg>
      </div>

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