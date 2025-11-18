<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-[#f5f2fa]">
    <div class="flex flex-col md:flex-row w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden">

      <!-- Image -->
      <img 
        src="@/assets/images/LoginERP.png"
        class="w-full md:w-1/2 h-48 md:h-auto object-cover"
      />

      <!-- Form -->
      <div class="w-full md:w-1/2 p-6 md:p-10 flex justify-center">
        <form class="w-full max-w-md space-y-5" @submit.prevent="submitForm">

          <h2 class="text-3xl font-semibold text-center text-slate-900">ลงทะเบียน</h2>

          <!-- Name -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BaseInput v-model="form.name" label="ชื่อ" placeholder="ใส่ชื่อจริง" required />
            <BaseInput v-model="form.surname" label="นามสกุล" placeholder="ใส่นามสกุล" required />
          </div>

          <!-- Email -->
          <BaseInput v-model="form.email" label="อีเมล" type="email" placeholder="your@example.com" required />

          <!-- Password -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BaseInput v-model="form.password" label="รหัสผ่าน" type="password" placeholder="*********" required />
            <BaseInput v-model="form.confirm_password" label="ยืนยันรหัสผ่าน" type="password" placeholder="*********" required />
          </div>

          <!-- Gender -->
          <div>
            <label class="text-sm font-medium">เพศ *</label>
            <select
              v-model="form.sex"
              required
              class="w-full mt-1 border border-gray-300 rounded-xl px-4 py-3 bg-white focus:border-purple-600"
            >
              <option disabled value="">เลือกเพศ</option>
              <option value="M">ชาย</option>
              <option value="F">หญิง</option>
              <option value="O">อื่น ๆ</option>
            </select>
          </div>

          <!-- Address -->
          <div class="space-y-2">
            <BaseInput v-model="form.address1" placeholder="บ้านเลขที่ / อาคาร / หมู่บ้าน" />
            <BaseInput v-model="form.address2" placeholder="ตำบล / อำเภอ" @input="fetchDistricts" list="d-list" />
            <datalist id="d-list">
              <option v-for="d in districtOptions" :key="d" :value="d" />
            </datalist>

            <BaseInput v-model="form.address3" placeholder="จังหวัด / รหัสไปรษณีย์" @input="fetchProvinces" list="p-list" />
            <datalist id="p-list">
              <option v-for="p in provinceOptions" :key="p" :value="p" />
            </datalist>
          </div>

          <!-- Profile Image -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">รูปโปรไฟล์</label>

            <div
              class="flex items-center gap-3 border border-gray-300 rounded-lg px-3 py-2 cursor-pointer hover:border-purple-500 transition w-full max-w-xs"
              @click="$refs.fileInput.click()"
            >
              <template v-if="previewImage">
                <img
                  :src="previewImage"
                  alt="Preview"
                  class="w-10 h-10 rounded-full object-cover shrink-0"
                />
                <span class="text-xs text-gray-500 truncate">เปลี่ยนรูป</span>
              </template>

              <template v-else>
                <svg class="w-6 h-6 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M7 16V4m0 0L3 8m4-4l4 4m6 0h2a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2v-2" />
                </svg>
                <span class="text-xs text-gray-500 truncate">เลือกไฟล์</span>
              </template>

              <input type="file" ref="fileInput" accept="image/*" @change="uploadImage" class="hidden" />
            </div>
          </div>

          <BaseButton type="submit" class="w-full">สร้างบัญชี</BaseButton>

          <p class="text-center text-sm text-slate-600">
            มีบัญชีแล้ว?
            <a href="/login" class="text-purple-600 underline">เข้าสู่ระบบ</a>
          </p>

        </form>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue"
import BaseInput from "@/components/base/BaseInput.vue"
import BaseButton from "@/components/base/BaseButton.vue"

const form = ref({
  name: "", surname: "", full_name: "",
  email: "", password: "", confirm_password: "",
  sex: "", address1: "", address2: "", address3: "",
  profile_image: null, agree: false,
})

watch([() => form.value.name, () => form.value.surname],
  () => form.value.full_name = `${form.value.name} ${form.value.surname}`.trim()
)

const previewImage = ref(null)

const uploadImage = (event) => {
  const file = event.target.files[0]
  if (file) {
    form.value.profile_image = file

    const reader = new FileReader()
    reader.onload = (e) => {
      previewImage.value = e.target.result
    }
    reader.readAsDataURL(file)
  }
}
</script>

