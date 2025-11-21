<template>
  <div class="flex flex-col items-center justify-center gap-4 py-6 select-none">

    <!-- Elegant Spinner -->
    <div class="relative flex items-center justify-center bg-transparent w-24 h-24">
      <!-- Outer Glow -->
      <div class="absolute w-20 h-20 rounded-full blur-xl"></div>

      <!-- Spinner -->
      <div class="loader-ring-enhanced"></div>
    </div>

    <!-- Text -->
    <div class="flex flex-col items-center mt-2">
      <p class="text-slate-800 font-semibold text-sm tracking-wide">
        {{ title }}
      </p>
      <p class="text-slate-500 text-xs tracking-wide mt-1 flex items-center gap-1">
        {{ subtitle }}<span class="loading-dots"></span>
      </p>
    </div>

  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  title: { type: String, default: "กำลังโหลด..." },
  subtitle: { type: String, default: "" }
})
</script>

<style scoped>
/* Glow Border + Refined Spinner */
.loader-ring-enhanced {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border-width: 6px;
  border-style: solid;
  border-color: #8e03ff transparent #8e03ff transparent;
  animation: spin-smooth 1.1s cubic-bezier(0.6, 0, 0.4, 1) infinite;
  box-shadow: 0 0 12px rgba(111, 48, 193, 0.2);
}

/* Elegant spin animation */
@keyframes spin-smooth {
  0% {
    transform: rotate(0deg) scale(0.98);
  }
  50% {
    transform: rotate(180deg) scale(1.02);
  }
  100% {
    transform: rotate(360deg) scale(0.98);
  }
}

/* Loading dots animation */
.loading-dots::after {
  content: "";
  display: inline-block;
  width: 1em;
  animation: dots 1.4s steps(4, end) infinite;
}

@keyframes dots {
  0% { content: ""; }
  25% { content: "."; }
  50% { content: ".."; }
  75% { content: "..."; }
  100% { content: ""; }
}
</style>
