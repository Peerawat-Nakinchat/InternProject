<template>
  <div class="flex items-center justify-center">
    <div class="loader-ring-white-purple"></div>
  </div>
</template>

<style scoped>

.loader-ring-white-purple {
  display: inline-block;
  width: 80px;
  height: 80px;
}
.loader-ring-white-purple:after {
  content: " ";
  display: block;
  width: 64px;
  height: 64px;
  margin: 8px;
  border-radius: 50%;
  border: 6px solid #FFFFFF; 
  border-color: #6f30c1 transparent #ece5f6 transparent; 
  animation: spin-v2 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
}

@keyframes spin-v2 {
  0% {
    transform: rotate(0deg);
  }
  50% {
    transform: rotate(180deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>