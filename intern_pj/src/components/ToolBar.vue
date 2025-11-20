<template>
  <div
    class="w-full h-12 bg-linear-to-r from-[#fdc9ff]/80 to-[#fdc9ff]/70 backdrop-blur-md border-b border-[#4B1E89]/50 flex items-center px-4 justify-between shadow-b-md"
  >
    <!-- Left side -->
    <div class="flex items-center gap-4">
      <h2 class="text-white font-semibold tracking-wide text-lg">Toolbar</h2>
      <span class="text-purple-200 text-sm">Admin Panel</span>
    </div>

    <!-- Right side -->
    <div class="flex items-center gap-3">
      <!-- Company Selector -->
      <CompanySelector />

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

      <!-- Action Button -->
      <button
        class="px-4 py-2 rounded-lg bg-linear-to-r from-[#682DB5] to-[#8F3ED0] hover:from-[#7F39D1] hover:to-[#9B5DE5] text-white font-medium shadow-md transition-all duration-300"
      >
        Action
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import CompanySelector from './CompanySelector.vue'
</script>
