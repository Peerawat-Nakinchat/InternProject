<template>
  <div class="flex min-h-screen bg-gray-100">
    <!-- PAGE CONTENT -->
    <div class="flex-1 flex flex-col">
      <div class="px-4 mt-4">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-semibold tracking-tight">
              <span
                class="bg-linear-to-br from-[#1C244B] to-[#682DB5] bg-clip-text text-transparent inline-flex items-center gap-2"
              >
                <i class="mdi mdi-account text-3xl leading-none"></i>
                โปรไฟล์ของฉัน
              </span>
            </h1>
          </div>
        </div>
        <p class="text-neutral-500 text-sm mt-1">กรอกข้อมูลสำหรับการแก้ไขโปรไฟล์ในระบบของคุณ</p>
      </div>

      <div class="w-full max-w-full mx-auto p-4">
        <div class="relative bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <div class="h-36 bg-linear-to-r from-purple-600 to-[#1C244B]"></div>

          <div class="px-6 pb-6">
            <div class="flex flex-col md:flex-row items-start md:items-end gap-4 -mt-12">
              <div class="relative">
                <img
                  v-if="profileImageUrl && !imageError"
                  :src="profileImageUrl"
                  @error="onImageError"
                  class="w-28 h-28 rounded-full object-cover border-4 border-white shadow"
                />

                <div
                  v-else
                  class="w-28 h-28 rounded-full bg-purple-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow"
                >
                  {{ userInitials }}
                </div>

                <label
                  class="absolute bottom-1 right-1 bg-gray-100 shadow p-1.5 rounded-full cursor-pointer hover:bg-gray-200 transition"
                >
                  <i class="mdi mdi-camera text-gray-700 text-xl"></i>
                  <input type="file" class="hidden" @change="onImageUpload" />
                </label>
              </div>

              <div
                class="flex flex-col md:flex-row items-center md:items-center gap-3 w-full md:w-auto flex-1"
              >
                <div class="flex-1 text-left md:text-left">
                  <h1 class="text-2xl font-bold text-gray-900">
                    {{ form.full_name || userInitials }}
                  </h1>
                  <p class="text-gray-500 text-sm">{{ authStore.user?.email }}</p>
                </div>

                <!-- RIGHT: ปุ่ม -->
                <div class="hidden md:flex items-center gap-3 ml-auto">
                  <base-button class="bg-neutral-400 hover:bg-gray-500" @click="openResetConfirm"
                    >รีเซ็ต</base-button
                  >
                  <base-button
                    class="bg-primary text-white px-4 py-2 inline-flex whitespace-nowrap rounded-mb"
                    @click="updateProfile"
                    >บันทึกการเปลี่ยนแปลง</base-button
                  >
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm p-6 mt-6">
          <div class="flex flex-col md:flex-row gap-6">
            <!-- ด้านซ้าย: เมนูหมวด -->
            <div class="hidden md:block md:w-1/3">
              <h3 class="text-lg font-semibold text-black tracking-wide mb-2">เกี่ยวกับ</h3>
              <div
                class="bg-gray-50 rounded-lg border border-gray-100 divide-y divide-gray-100 shadow-inner"
              >
                <button
                  v-for="section in sectionList"
                  :key="section.key"
                  class="w-full px-4 py-3 text-left flex items-center justify-between transition"
                  :class="[
                    activeSection === section.key
                      ? 'bg-linear-to-r from-purple-600/10 to-[#1C244B]/10 text-[#1C244B]'
                      : 'hover:bg-gray-100 text-gray-700',
                  ]"
                  @click="activeSection = section.key"
                >
                  <div class="flex items-center gap-3">
              <span
                      class="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white border border-purple-100 text-[#1C244B]"
              >
                      <i :class="section.icon" class="text-xl"></i>
              </span>
                    <div class="flex flex-col">
                      <span class="font-semibold text-sm">{{ section.label }}</span>
                      <span class="text-xs text-gray-500">{{ section.description }}</span>
                    </div>
                  </div>
                  <i
                    class="mdi text-lg"
                    :class="
                      activeSection === section.key ? 'mdi-chevron-right' : 'mdi-chevron-left'
                    "
                  ></i>
                </button>
              </div>
            </div>

            <!-- ด้านขวา: ฟิลด์รายละเอียด -->
            <!-- Desktop detail (ตาม activeSection) -->
            <div class="hidden md:block flex-1">
              <div class="flex items-center justify-between pb-4 border-b-2 border-gray-200">
                <div class="flex items-center gap-3">
                  <span
                    class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-linear-to-r from-purple-600 to-purple-500 text-white text-lg"
                  >
                    <i :class="currentSection.icon"></i>
                  </span>
                  <div>
                    <h2 class="text-lg font-semibold text-gray-800">{{ currentSection.label }}</h2>
                    <p class="text-sm text-gray-500">{{ currentSection.description }}</p>
                  </div>
                </div>

                <!-- Right: Company Selector -->
                <!-- Company Selector (แสดงเฉพาะเมื่อ activeSection === 'company' และมีหลายบริษัท) -->
                <div
                  v-if="activeSection === 'company' && companyStore.companies.length > 1"
                  class="flex flex-col items-end"
                >
                  <label class="block text-sm font-medium text-gray-700 mb-1">เลือกบริษัทที่ต้องการดู/แก้ไข</label>
                  <div class="relative w-72">
                    <div
                      class="w-full h-10 rounded-md px-4 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm shadow-sm cursor-pointer flex items-center justify-between transition-all hover:border-purple-400"
                      @click="companyDropdownOpen = !companyDropdownOpen"
                    >
                      <span class="truncate">{{ selectedCompanyLabel }}</span>
                      <svg
                        class="w-4 h-4 text-slate-500 transition-transform"
                        :class="companyDropdownOpen ? 'rotate-180' : ''"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <div
                      v-if="companyDropdownOpen"
                      class="absolute z-30 mt-0.5 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-auto"
                    >
                      <div
                        v-for="company in companyStore.companies"
                        :key="company.org_id"
                        class="px-4 py-2 text-sm text-slate-700 hover:bg-purple-50 cursor-pointer transition flex items-center justify-between"
                        @click="selectCompany(company.org_id)"
                      >
                        <span class="truncate">{{ company.org_name }}</span>
                        <span v-if="company.owner_user_id === authStore.user?.user_id" class="text-xs text-purple-600 ml-2">(เจ้าของ)</span>
                      </div>
                    </div>
                  </div>

                  <p v-if="!isCompanyOwner && companyStore.selectedCompany"
                    class="text-xs text-amber-600 mt-1 flex items-center gap-1"
                  >
                    <i class="mdi mdi-information-outline"></i>
                    คุณสามารถดูได้เท่านั้น ไม่สามารถแก้ไขได้
                  </p>
                </div>
              </div>

              <div class="divide-y-2 divide-gray-200">
                <div
                  v-for="field in sectionFields[activeSection]"
                  :key="field.key"
                  class="py-4 flex flex-col gap-2"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <span
                        class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-linear-to-r from-purple-600/10 to-[#1C244B]/10 text-[#1C244B]"
                      >
                        <i :class="field.icon" class="text-lg"></i>
                      </span>
                      <div>
                        <p class="text-sm font-semibold text-gray-800">{{ field.label }}</p>
                        <p
                          v-if="!isEditableField(field.key) || !editState[field.key as EditableKey]"
                          class="text-gray-600 text-sm"
                        >
                          {{ displayStaticValue(field.key) }}
                        </p>
                      </div>
                </div>

                    <div class="flex items-center gap-2">
                      <button
                        v-if="field.key === 'email'"
                        class="p-2 rounded-full bg-red-100 hover:bg-red-200 text-red-500"
                        @click="changeEmail()"
                      >
                        <i class="mdi mdi-pencil text-lg"></i>
                      </button>
                      <button
                        v-else-if="field.key === 'password'"
                        class="p-2 rounded-full bg-red-100 hover:bg-red-200 text-red-500"
                        @click="changePassword()"
                      >
                        <i class="mdi mdi-pencil text-lg"></i>
                      </button>
                      <!-- MFA Toggle Button -->
                      <template v-else-if="field.key === 'mfa'">
                        <button
                          v-if="!mfaEnabled"
                          class="px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                          @click="openMfaSetup()"
                        >
                          <i class="mdi mdi-shield-check mr-1"></i>เปิดใช้งาน
                        </button>
                        <button
                          v-else
                          class="px-3 py-1 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                          @click="openMfaDisable()"
                        >
                          <i class="mdi mdi-shield-off mr-1"></i>ปิด 2FA
                        </button>
                      </template>
                      <!-- ✅ Trusted Devices Button -->
                      <template v-else-if="field.key === 'trusted_devices'">
                        <button
                          class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                          @click="openDevicesPopup()"
                        >
                          <i class="mdi mdi-cog mr-1"></i>จัดการ
                        </button>
                      </template>
                      <button

                        v-else-if="isEditableField(field.key) && !editState[field.key as EditableKey] && !(isCompanyField(field.key) && !isCompanyOwner)"
                       
                        class="p-2 rounded-full hover:bg-gray-100 text-gray-500"

                        @click="startEdit(field.key as EditableKey)"
                      >
                        <i class="mdi mdi-pencil text-lg"></i>
                      </button>
                    </div>
                  </div>

                  <div
                    v-if="
                      field.key === 'email' || field.key === 'password'
                        ? false
                        : isEditableField(field.key) && editState[field.key as EditableKey]
                    "
                    class="pl-12"
                  >

                    <div v-if="field.key === 'sex'" class="mb-4 relative">
                      <label class="block text-sm font-medium text-neutral-700 mb-1">{{ field.label }}</label>
                      <!-- Custom Dropdown (match RegisterPage style) -->
                      <div
                        class="w-full h-10 rounded-md px-4 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm shadow-sm cursor-pointer flex items-center justify-between transition-all hover:border-purple-400"
                        @click="genderDropdownOpen = !genderDropdownOpen"
                      >
                        <span>
                          {{ getGenderLabel(editableValues.sex) || 'เลือกเพศ' }}
                        </span>
                        <svg
                          class="w-4 h-4 text-slate-500 transition-transform"
                          :class="genderDropdownOpen ? 'rotate-180' : ''"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                      <!-- Dropdown -->
                      <div
                        v-if="genderDropdownOpen"
                        class="absolute z-20 mt-0.5 w-full bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden"
                      >
                        <div
                          v-for="opt in genderOptions"
                          :key="opt.value"
                          class="px-4 py-2 text-sm text-slate-700 hover:bg-purple-50 cursor-pointer transition"
                          @click="selectGender(opt.value)"
                        >
                          {{ opt.label }}
                        </div>
                      </div>
                    </div>
                    <BaseInput
                      v-else-if="field.key !== 'password'"
                      v-model="editableValues[field.key as EditableKey]"
                      :placeholder="field.placeholder || field.label"
                      :type="field.type || 'text'"
                    />
                    <BaseInput
                      v-else
                      v-model="editableValues[field.key as EditableKey]"
                      type="password"
                      placeholder="********"
                    />

                    <div class="flex justify-end gap-2">
                      <base-button
                        class="bg-neutral-400 text-neutral-700 hover:bg-neutral-500 px-4"
                        @click="cancelEdit(field.key as EditableKey)"
                      >
                        ยกเลิก
                      </base-button>
                      <base-button class="px-4" @click="saveField(field.key as EditableKey)"
                        >บันทึก</base-button
                      >
                    </div>
                  </div>
                </div>
              </div>

              <!-- ปุ่มสำหรับ mobile -->
              <div class="mt-6 flex gap-3 md:hidden">
                <base-button class="w-full bg-neutral-400" @click="openResetConfirm"
                  >รีเซ็ต</base-button
                >
                <base-button class="w-full" @click="updateProfile">บันทึก</base-button>
              </div>
            </div>

            <!-- Mobile detail (แสดงทุกหมวดเรียงกัน) -->
            <div class="md:hidden flex-1">
              <div
                v-for="section in sectionList"
                :key="section.key"
                class="border border-gray-100 rounded-xl p-4 mb-4 shadow-sm"
              >
                <div class="flex items-center gap-3 mb-3">
                <span
                      class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-linear-to-r from-purple-600 to-purple-500 text-white text-lg"
                >
                      <i :class="section.icon"></i>
                </span>
                  <div>
                    <h2 class="text-base font-semibold text-gray-800">{{ section.label }}</h2>
                    <p class="text-xs text-gray-500">{{ section.description }}</p>
                  </div>
                </div>

                <!-- Company Selector (แสดงเฉพาะเมื่อ section.key === 'company' และมีหลายบริษัท) -->
        <div
          v-if="section.key === 'company' && companyStore.companies.length > 1"
          class="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200"
        >
          <label class="block text-sm font-medium text-gray-700 mb-2">เลือกบริษัทที่ต้องการดู/แก้ไข</label>
          <div class="relative">
            <div
              class="w-full h-10 rounded-md px-4 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm shadow-sm cursor-pointer flex items-center justify-between transition-all hover:border-purple-400"
              @click="companyDropdownOpen = !companyDropdownOpen"
            >
              <span class="truncate">{{ selectedCompanyLabel }}</span>
              <svg
                class="w-4 h-4 text-slate-500 transition-transform"
                :class="companyDropdownOpen ? 'rotate-180' : ''"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <div
              v-if="companyDropdownOpen"
              class="absolute z-30 mt-0.5 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-auto"
            >
              <div
                v-for="company in companyStore.companies"
                :key="company.org_id"
                class="px-4 py-2 text-sm text-slate-700 hover:bg-purple-50 cursor-pointer transition flex items-center justify-between"
                @click="selectCompany(company.org_id)"
              >
                <span class="truncate">{{ company.org_name }}</span>
                <span v-if="company.owner_user_id === authStore.user?.user_id" class="text-xs text-purple-600 ml-2">(เจ้าของ)</span>
              </div>
            </div>
          </div>
          <p v-if="!isCompanyOwner && companyStore.selectedCompany" class="text-xs text-amber-600 mt-2 flex items-center gap-1">
            <i class="mdi mdi-information-outline"></i>
            คุณสามารถดูข้อมูลได้เท่านั้น ไม่สามารถแก้ไขได้ (เฉพาะเจ้าของบริษัทเท่านั้นที่แก้ไขได้)
          </p>
        </div>

                <div class="divide-y-2 divide-gray-200">
                  <div
                    v-for="field in sectionFields[section.key]"
                    :key="field.key"
                    class="py-3 flex flex-col gap-2"
                  >
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">

                        <span
                        class="inline-flex items-center justify-center w-9 h-9 rounded-full bg-linear-to-r from-purple-600/10 to-[#1C244B]/10 text-[#1C244B]"
                      >
                          <i :class="field.icon" class="text-lg"></i>
                        </span>
                        <div>
                          <p class="text-sm font-semibold text-gray-800">{{ field.label }}</p>
                          <p
                            v-if="
                              !isEditableField(field.key) || !editState[field.key as EditableKey]
                            "
                            class="text-gray-600 text-sm"
                          >
                            {{ displayStaticValue(field.key) }}
                          </p>
                        </div>
                      </div>

                      <button
                        v-if="field.key === 'email'"
                        class="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                        @click="changeEmail()"
                      >
                        <i class="mdi mdi-pencil text-lg"></i>
                      </button>
                      <button
                        v-else-if="field.key === 'password'"
                        class="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                        @click="changePassword()"
                      >
                        <i class="mdi mdi-pencil text-lg"></i>
                      </button>
                      <!-- MFA Toggle Button (Mobile) -->
                      <template v-else-if="field.key === 'mfa'">
                        <button
                          v-if="!mfaEnabled"
                          class="px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                          @click="openMfaSetup()"
                        >
                          <i class="mdi mdi-shield-check mr-1"></i>เปิดใช้งาน
                        </button>
                        <button
                          v-else
                          class="px-3 py-1 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                          @click="openMfaDisable()"
                        >
                          <i class="mdi mdi-shield-off mr-1"></i>ปิด 2FA
                        </button>
                      </template>
                      <!-- Trusted Devices Button -->
                      <template v-else-if="field.key === 'trusted_devices'">
                        <button
                          class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                          @click="openDevicesPopup()"
                        >
                          <i class="mdi mdi-cog mr-1"></i>จัดการ
                        </button>
                      </template>
                      <button
                        v-else-if="
                          isEditableField(field.key) && !editState[field.key as EditableKey]
                        "
                        class="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                        @click="startEdit(field.key as EditableKey)"
                      >
                        <i class="mdi mdi-pencil text-lg"></i>
                      </button>
                    </div>

                    <div
                      v-if="
                        field.key === 'email' || field.key === 'password'
                          ? false
                          : isEditableField(field.key) && editState[field.key as EditableKey]
                      "
                      class="pl-10"
                    >
                      <div v-if="field.key === 'sex'">
                        <label class="block text-sm font-medium text-neutral-700 mb-1">{{
                          field.label
                        }}</label>
                        <div class="relative">
                          <select
                            v-model="editableValues.sex"
                            class="w-full rounded-md px-4 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm shadow-sm cursor-pointer transition-all hover:border-purple-400 focus:outline-none focus:border-purple-500"
                          >
                            <option value="" disabled>เลือกเพศ</option>
                            <option
                              v-for="opt in genderOptions"
                              :key="opt.value"
                              :value="opt.value"
                            >
                              {{ opt.label }}
                            </option>
                          </select>
                        </div>
                      </div>

                      <button
                        v-if="field.key === 'email'"
                        class="p-1.5 rounded-full bg-red-100 hover:bg-red-200 text-red-500"
                        @click="changeEmail()"
                      >
                        <i class="mdi mdi-pencil text-lg"></i>
                      </button>
                      <button
                        v-else-if="field.key === 'password'"
                        class="p-1.5 rounded-full bg-red-100 hover:bg-red-200 text-red-500"
                        @click="changePassword()"
                      >
                        <i class="mdi mdi-pencil text-lg"></i>
                      </button>
                      <button
                        v-else-if="isEditableField(field.key) && !editState[field.key as EditableKey] && !(isCompanyField(field.key) && !isCompanyOwner)"
                        class="p-1.5 rounded-full bg-red-100 hover:bg-red-200 text-red-500"
                        @click="startEdit(field.key as EditableKey)"
                      >
                        <i class="mdi mdi-pencil text-lg"></i>
                      </button>
                      <span
                        v-else-if="isCompanyField(field.key) && !isCompanyOwner"
                        class="text-xs text-gray-400 italic"
                      >
                      </span>
                    </div>

                    <div
                      v-if="field.key === 'email' || field.key === 'password' ? false : isEditableField(field.key) && editState[field.key as EditableKey]"
                      class="pl-10"
                    >
                    <div v-if="field.key === 'sex'" class="mb-4 relative">
                      <label class="block text-sm font-medium text-neutral-700 mb-1">{{ field.label }}</label>
                      <!-- Custom Dropdown (match RegisterPage style) -->
                      <div
                        class="w-full h-10 rounded-md px-4 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm shadow-sm cursor-pointer flex items-center justify-between transition-all hover:border-purple-400"
                        @click="genderDropdownOpen = !genderDropdownOpen"
                      >
                        <span>
                          {{ getGenderLabel(editableValues.sex) || 'เลือกเพศ' }}
                        </span>
                        <svg
                          class="w-4 h-4 text-slate-500 transition-transform"
                          :class="genderDropdownOpen ? 'rotate-180' : ''"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                      <!-- Dropdown -->
                      <div
                        v-if="genderDropdownOpen"
                        class="absolute z-20 mt-0.5 w-full bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden"
                      >
                        <div
                          v-for="opt in genderOptions"
                          :key="opt.value"
                          class="px-4 py-2 text-sm text-slate-700 hover:bg-purple-50 cursor-pointer transition"
                          @click="selectGender(opt.value)"
                        >
                          {{ opt.label }}
                        </div>
                      </div>
                    </div>
                      <BaseInput
                        v-else-if="field.key !== 'password'"
                        v-model="editableValues[field.key as EditableKey]"
                        :placeholder="field.placeholder || field.label"
                        :type="field.type || 'text'"
                      />
                      <BaseInput
                        v-else
                        v-model="editableValues[field.key as EditableKey]"
                        type="password"
                        placeholder="********"
                      />

                      <div class="flex justify-end gap-2 mt-1">
                        <base-button
                          class="bg-neutral-400 text-neutral-700 hover:bg-neutral-500 px-4"
                          @click="cancelEdit(field.key as EditableKey)"
                        >
                          ยกเลิก
                        </base-button>
                        <base-button class="px-4" @click="saveField(field.key as EditableKey)"
                          >บันทึก</base-button
                        >
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="mt-4 flex gap-3">
                <base-button class="w-full bg-neutral-400" @click="openResetConfirm"
                  >รีเซ็ต</base-button
                >
                <base-button class="w-full" @click="updateProfile">บันทึก</base-button>
              </div>
            </div>
          </div>
        </div>

        <!-- Popup: เปลี่ยนอีเมล -->
        <div
          v-if="showEmailPopup"
          class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
        >
          <div class="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 class="text-xl font-semibold text-gray-800 mb-4">เปลี่ยนอีเมล</h2>
            <BaseInput
              v-model="newEmail"
              type="email"
              label="อีเมลใหม่"
              placeholder="example@mail.com"
              class="mb-2"
            />
            <BaseInput
              v-model="passwordForEmail"
              type="password"
              label="รหัสผ่านปัจจุบัน (เพื่อยืนยัน)"
              placeholder="********"
            />
            <p v-if="emailError" class="text-red-500 text-sm mt-2">{{ emailError }}</p>

            <div class="flex justify-end gap-3 mt-2">
              <base-button
                class="w-full bg-neutral-400 text-neutral-700 hover:bg-neutral-500"
                @click="closeEmailPopup"
                >ยกเลิก</base-button
              >
              <base-button class="w-full" @click="openEmailConfirm" :disabled="authStore.isLoading"
                >บันทึก</base-button
              >
            </div>
          </div>
        </div>

        <!-- Popup: เปลี่ยนรหัสผ่าน -->
        <div
          v-if="showPasswordPopup"
          class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
        >
          <div class="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 class="text-xl font-semibold text-gray-800 mb-4">
              <i class="mdi mdi-lock-reset text-purple-600 mr-2"></i>
              เปลี่ยนรหัสผ่าน
            </h2>

        <BaseInput v-model="oldPassword" label="รหัสผ่านเดิม" type="password" class="mb-2" />

            <hr class="border-t border-gray-200 mb-4" />

        <BaseInput v-model="newPassword" label="รหัสผ่านใหม่" type="password" class="mb-2" />

            <div class="mb-4 p-3 bg-gray-50 rounded-lg">
              <div class="flex items-center gap-2 mb-3">
                <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    class="h-full transition-all duration-300 rounded-full"
                    :style="{ width: passwordStrength.percentage + '%' }"
                    :class="passwordStrength.colorClass"
                  />
                </div>
                <span
                  class="text-xs font-semibold min-w-[60px] text-right"
                  :class="passwordStrength.textClass"
                >
                  {{ passwordStrength.label }}
                </span>
              </div>

              <div class="grid grid-cols-1 gap-1.5 text-xs">
                <div
                  class="flex items-center gap-2"
                  :class="passwordChecks.hasLength ? 'text-green-600' : 'text-gray-400'"
                >
                  <i
                    :class="passwordChecks.hasLength ? 'mdi mdi-check-circle' : 'mdi mdi-circle-outline'"
                    class="text-sm"
                  ></i>
                  อย่างน้อย 6 ตัวอักษร
                </div>
                <div
                  class="flex items-center gap-2"
                  :class="passwordChecks.hasUpper ? 'text-green-600' : 'text-gray-400'"
                >
                  <i
                    :class="passwordChecks.hasUpper ? 'mdi mdi-check-circle' : 'mdi mdi-circle-outline'"
                    class="text-sm"
                  ></i>
                  ตัวพิมพ์ใหญ่ (A-Z)
                </div>
                <div
                  class="flex items-center gap-2"
                  :class="passwordChecks.hasLower ? 'text-green-600' : 'text-gray-400'"
                >
                  <i
                    :class="passwordChecks.hasLower ? 'mdi mdi-check-circle' : 'mdi mdi-circle-outline'"
                    class="text-sm"
                  ></i>
                  ตัวพิมพ์เล็ก (a-z)
                </div>
                <div
                  class="flex items-center gap-2"
                  :class="passwordChecks.hasNumber ? 'text-green-600' : 'text-gray-400'"
                >
                  <i
                    :class="passwordChecks.hasNumber ? 'mdi mdi-check-circle' : 'mdi mdi-circle-outline'"
                    class="text-sm"
                  ></i>
                  ตัวเลข (0-9)
                </div>
                <div
                  class="flex items-center gap-2"
                  :class="passwordChecks.hasSpecial ? 'text-green-600' : 'text-gray-400'"
                >
                  <i
                    :class="passwordChecks.hasSpecial ? 'mdi mdi-check-circle' : 'mdi mdi-circle-outline'"
                    class="text-sm"
                  ></i>
                  อักขระพิเศษ (!@#$%^&*)
                </div>
              </div>
            </div>

            <BaseInput
              v-model="confirmPassword"
              label="ยืนยันรหัสผ่านใหม่"
              type="password"
              class=""
            />

            <div v-if="confirmPassword" class="mb-2 text-xs flex items-center gap-1">
                  <template v-if="newPassword === confirmPassword">
                    <i class="mdi mdi-check-circle text-green-600"></i>
                    <span class="text-green-600">รหัสผ่านตรงกัน</span>
                  </template>
                  <template v-else>
                    <i class="mdi mdi-close-circle text-red-500"></i>
                    <span class="text-red-500">รหัสผ่านไม่ตรงกัน</span>
                  </template>
                </div>

                <p v-if="passwordError" class="text-red-500 text-sm mb-4 p-2 bg-red-50 rounded">
                  <i class="mdi mdi-alert-circle mr-1"></i>
                  {{ passwordError }}
                </p>

            <div class="flex gap-3">
                  <base-button
                    class="flex-1 bg-neutral-400 text-neutral-700 hover:bg-neutral-500"
                    @click="closePasswordPopup"
                  >
                    ยกเลิก
                  </base-button>
                  <base-button
                    class="flex-1"
                    @click="openPasswordConfirm"
                    :disabled="!isPasswordValid"
                  >
                    บันทึก
                  </base-button>
                </div>
          </div>
        </div>
      </div>

      <!-- Popup: MFA Setup -->
      <div
        v-if="showMfaSetupPopup"
        class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      >
        <div class="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
          <h2 class="text-xl font-semibold text-gray-800 mb-4">
            <i class="mdi mdi-shield-check text-purple-600 mr-2"></i>
            ตั้งค่า Two-Factor Authentication (2FA)
          </h2>

          <div v-if="mfaQrCode" class="text-center mb-4">
            <p class="text-sm text-gray-600 mb-3">
              สแกน QR Code นี้ด้วยแอป Google Authenticator หรือ Authy
            </p>
            <img
              :src="mfaQrCode"
              alt="MFA QR Code"
              class="mx-auto border rounded-lg p-2 bg-white"
            />
            <p class="text-xs text-gray-500 mt-2">
              หรือใส่รหัสด้วยตนเอง:
              <code class="bg-gray-100 px-2 py-1 rounded">{{ mfaSecret }}</code>
            </p>
          </div>

          <BaseInput v-model="mfaOtp" label="รหัส OTP 6 หลัก" placeholder="123456" class="mb-2" />

          <p v-if="mfaError" class="text-red-500 text-sm mb-2">
            <i class="mdi mdi-alert-circle mr-1"></i>{{ mfaError }}
          </p>

          <div class="flex gap-3">
            <base-button
              class="flex-1 bg-neutral-400 text-neutral-700 hover:bg-neutral-500"
              @click="closeMfaSetupPopup"
            >
              ยกเลิก
            </base-button>
            <base-button
              class="flex-1"
              @click="confirmEnableMfa"
              :disabled="!mfaOtp || mfaOtp.length !== 6"
            >
              เปิดใช้งาน 2FA
            </base-button>
          </div>
        </div>
      </div>

      <!-- Popup: MFA Disable -->
      <div
        v-if="showMfaDisablePopup"
        class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      >
        <div class="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
          <h2 class="text-xl font-semibold text-gray-800 mb-4">
            <i class="mdi mdi-shield-off text-red-600 mr-2"></i>
            ปิดใช้งาน Two-Factor Authentication
          </h2>

          <p class="text-sm text-gray-600 mb-4">
            กรุณากรอกรหัส OTP จากแอป Authenticator เพื่อยืนยันการปิด 2FA
          </p>

          <BaseInput v-model="mfaOtp" label="รหัส OTP 6 หลัก" placeholder="123456" class="mb-2" />

          <p v-if="mfaError" class="text-red-500 text-sm mb-2">
            <i class="mdi mdi-alert-circle mr-1"></i>{{ mfaError }}
          </p>

          <div class="flex gap-3">
            <base-button
              class="flex-1 bg-neutral-400 text-neutral-700 hover:bg-neutral-500"
              @click="closeMfaDisablePopup"
            >
              ยกเลิก
            </base-button>
            <base-button
              class="flex-1 bg-red-600 hover:bg-red-700"
              @click="confirmDisableMfa"
              :disabled="!mfaOtp || mfaOtp.length !== 6"
            >
              ปิด 2FA
            </base-button>
          </div>
        </div>
      </div>

      <!-- Popup: Trusted Devices Management -->
      <div
        v-if="showDevicesPopup"
        class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
        @click.self="closeDevicesPopup"
      >
        <div class="bg-white rounded-xl shadow-lg w-full max-w-2xl p-6 h-[80vh] flex flex-col">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-semibold text-gray-800">
              <i class="mdi mdi-devices text-purple-600 mr-2"></i>
              จัดการอุปกรณ์ที่เชื่อมต่อ (Trusted Devices)
            </h2>
            <button @click="closeDevicesPopup" class="text-gray-400 hover:text-gray-600">
              <i class="mdi mdi-close text-2xl"></i>
            </button>
          </div>

          <p class="text-sm text-gray-600 mb-4">
            อุปกรณ์เหล่านี้สามารถเข้าสู่ระบบโดยไม่ต้องยืนยัน 2FA (ยกเว้นเมื่อหมดอายุ)
          </p>

          <div class="flex-1 overflow-y-auto">
            <div v-if="isLoadingDevices" class="flex justify-center py-8">
              <i class="mdi mdi-loading mdi-spin text-3xl text-purple-600"></i>
            </div>

            <div v-else-if="trustedDevices.length === 0" class="text-center py-12 text-gray-400">
              <i class="mdi mdi-laptop-off text-5xl mb-3 block"></i>
              <p>ไม่มีอุปกรณ์ที่เชื่อถือ</p>
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="device in trustedDevices"
                :key="device.device_id"
                class="flex items-center justify-between p-4 border rounded-xl hover:bg-gray-50 transition"
              >
                <div class="flex items-center gap-4">
                  <div
                    class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600"
                  >
                    <i class="mdi" :class="getDeviceIcon(device.device_name)"></i>
                  </div>
                  <div>
                    <h3 class="font-medium text-gray-900">
                      {{ device.device_name }}
                      <span
                        v-if="device.is_current"
                        class="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full"
                        >อุปกรณ์นี้</span
                      >
                    </h3>
                    <div class="flex gap-2 text-xs text-gray-500 mt-1">
                      <span
                        ><i class="mdi mdi-map-marker-outline"></i> {{ device.ip_address }}</span
                      >
                      <span>•</span>
                      <span
                        ><i class="mdi mdi-clock-outline"></i> ใช้ล่าสุด:
                        {{ formatDate(device.last_used_at) }}</span
                      >
                    </div>
                  </div>
                </div>

                <button
                  @click="removeTrustedDevice(device.device_id)"
                  class="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition"
                  title="ลบอุปกรณ์"
                >
                  <i class="mdi mdi-trash-can-outline text-xl"></i>
                </button>
              </div>
            </div>
          </div>

          <div class="mt-6 pt-4 border-t flex justify-between items-center">
            <p class="text-xs text-gray-500">
              * อุปกรณ์ที่เชื่อมต่อจะหมดอายุอัตโนมัติหากไม่ได้ใช้งานเกิน 30 วัน
            </p>
            <button
              v-if="trustedDevices.length > 0"
              @click="removeAllDevices"
              class="text-red-600 text-sm hover:underline"
            >
              ลบอุปกรณ์ทั้งหมด
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import Swal from 'sweetalert2' // ✅ ใช้ SweetAlert2 แทน ConfirmDialog
import axios from 'axios'
import type { TrustedDevice } from '@/types/auth' // Add type import

// Component Input/Button ยังคงใช้เหมือนเดิม
import BaseInput from '@/components/base/BaseInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'

const router = useRouter()
const authStore = useAuthStore()

const companyStore = useCompanyStore()

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer
    toast.onmouseleave = Swal.resumeTimer
  },
})

// =====================================================
// FORM MODEL (ข้อมูลฟอร์ม)
// =====================================================
type ProfileForm = {
  name: string
  surname: string
  full_name: string
  sex: string
  password: string
  user_address_1: string
  user_address_2: string
  user_address_3: string
  profile_image_url: string
  company_name: string
  company_position: string
  company_address_1: string
  company_address_2: string
  company_address_3: string
  company_integrate_provider: string
  company_integrate_passcode: string
  company_integrate_url: string
}

const form = reactive<ProfileForm>({
  name: '',
  surname: '',
  full_name: '',
  sex: '',
  password: '',
  user_address_1: '',
  user_address_2: '',
  user_address_3: '',
  profile_image_url: '',
  company_name: '',
  company_position: '',
  company_address_1: '',
  company_address_2: '',
  company_address_3: '',
  company_integrate_provider: '',
  company_integrate_passcode: '',
  company_integrate_url: '',
})

// =====================================================
// UI STATE สำหรับการ์ดรายละเอียด
// =====================================================
type SectionKey = 'personal' | 'address' | 'company' | 'security'
type EditableKey =
  | 'name'
  | 'surname'
  | 'sex'
  | 'user_address_1'
  | 'user_address_2'
  | 'user_address_3'
  | 'email'
  | 'password'
  | 'company_name'
  | 'company_position'
  | 'company_address_1'
  | 'company_address_2'
  | 'company_address_3'
  | 'company_integrate_provider'
  | 'company_integrate_passcode'
  | 'company_integrate_url'
type FieldKey = EditableKey | 'role' | 'mfa' | 'trusted_devices'

const formEditableKeys = [
  'name',
  'surname',
  'sex',
  'user_address_1',
  'user_address_2',
  'user_address_3',
  'company_name',
  'company_position',
  'company_address_1',
  'company_address_2',
  'company_address_3',
  'company_integrate_provider',
  'company_integrate_passcode',
  'company_integrate_url',
] as const
type FormEditableKey = (typeof formEditableKeys)[number]
type FieldConfig = {
  key: FieldKey
  label: string
  icon: string
  type?: string
  placeholder?: string
  editable?: boolean
}

type SectionItem = {
  key: SectionKey
  label: string
  icon: string
  description: string
}

const activeSection = ref<SectionKey>('personal')
const sectionList: SectionItem[] = [
  {
    key: 'personal' as const,
    label: 'ข้อมูลส่วนบุคคล',
    icon: 'mdi mdi-account',
    description: 'ชื่อ-นามสกุล เพศ, และบทบาท',
  },
  {
    key: 'address' as const,
    label: 'ที่อยู่',
    icon: 'mdi mdi-map-marker',
    description: 'ที่อยู่จัดส่ง/ติดต่อ',
  },
  {
    key: 'company' as const,
    label: 'ข้อมูลบริษัท',
    icon: 'mdi mdi-office-building',
    description: 'ข้อมูลบริษัทและตำแหน่งงาน',
  },
  {
    key: 'security' as const,
    label: 'ความปลอดภัย',
    icon: 'mdi mdi-shield-lock',
    description: 'อีเมลและรหัสผ่าน',
  },
]

const editableValues = reactive<Record<EditableKey, string>>({
  name: '',
  surname: '',
  sex: '',
  user_address_1: '',
  user_address_2: '',
  user_address_3: '',
  email: '',
  password: '',
  company_name: '',
  company_position: '',
  company_address_1: '',
  company_address_2: '',
  company_address_3: '',
  company_integrate_provider: '',
  company_integrate_passcode: '',
  company_integrate_url: '',
})

const editState = reactive<Record<EditableKey, boolean>>({
  name: false,
  surname: false,
  sex: false,
  user_address_1: false,
  user_address_2: false,
  user_address_3: false,
  email: false,
  password: false,
  company_name: false,
  company_position: false,
  company_address_1: false,
  company_address_2: false,
  company_address_3: false,
  company_integrate_provider: false,
  company_integrate_passcode: false,
  company_integrate_url: false,
})

const sectionFields: Record<SectionKey, Array<FieldConfig>> = {
  personal: [
    { key: 'name', label: 'ชื่อจริง', icon: 'mdi mdi-account-outline' },
    { key: 'surname', label: 'นามสกุล', icon: 'mdi mdi-card-account-details-outline' },
    { key: 'sex', label: 'เพศ', icon: 'mdi mdi-gender-male-female', placeholder: 'เลือกเพศ' },
    { key: 'role', label: 'บทบาท', icon: 'mdi mdi-account-badge', editable: false },
  ],
  address: [
    { key: 'user_address_1', label: 'ที่อยู่ 1', icon: 'mdi mdi-home-outline' },
    { key: 'user_address_2', label: 'ที่อยู่ 2', icon: 'mdi mdi-office-building-marker-outline' },
    { key: 'user_address_3', label: 'ที่อยู่ 3', icon: 'mdi mdi-map-outline' },
  ],
  company: [
    { key: 'company_name', label: 'ชื่อบริษัท', icon: 'mdi mdi-office-building-outline' },
    { key: 'company_position', label: 'บทบาทของคุณในบริษัท', icon: 'mdi mdi-account-badge', editable: false },
    { key: 'company_address_1', label: 'ที่อยู่บริษัท 1', icon: 'mdi mdi-map-marker-outline' },
    { key: 'company_address_2', label: 'ที่อยู่บริษัท 2', icon: 'mdi mdi-office-building-marker-outline' },
    { key: 'company_address_3', label: 'ที่อยู่บริษัท 3', icon: 'mdi mdi-map-outline' },
    { key: 'company_integrate_provider', label: 'Integration Provider', icon: 'mdi mdi-identifier', placeholder: 'Provider', type: 'text' },
    { key: 'company_integrate_passcode', label: 'Integration Passcode', icon: 'mdi mdi-lock-outline', placeholder: 'Passcode', type: 'password' },
    { key: 'company_integrate_url', label: 'Integration URL', icon: 'mdi mdi-link-variant', placeholder: 'https://...', type: 'url' },
  ],
  security: [
    { key: 'email', label: 'เปลี่ยนอีเมล', icon: 'mdi mdi-email-outline', type: 'email' },
    { key: 'password', label: 'เปลี่ยนรหัสผ่าน', icon: 'mdi mdi-lock-reset', type: 'password' },
    {
      key: 'mfa' as FieldKey,
      label: 'Two-Factor Authentication (2FA)',
      icon: 'mdi mdi-shield-check',
      editable: false,
    },
    {
      key: 'trusted_devices' as FieldKey,
      label: 'อุปกรณ์ที่เชื่อมต่อ (Trusted Devices)',
      icon: 'mdi mdi-devices',
      editable: false,
    },
    {
      key: 'user_integrate_provider_id',
      label: 'Provider ID',
      icon: 'mdi mdi-identifier',
      placeholder: 'Provider ID',
      type: 'text',
    },
    {
      key: 'user_integrate_url',
      label: 'Integration URL',
      icon: 'mdi mdi-link-variant',
      placeholder: 'https://...',
      type: 'url',
    },
  ],
}

const currentSection = computed<SectionItem>(() => {
  return sectionList.find((section) => section.key === activeSection.value) ?? sectionList[0]!
})

// ตรวจสอบว่า user เป็น owner ของบริษัทที่เลือกหรือไม่
const isCompanyOwner = computed(() => {
  if (!companyStore.selectedCompany || !authStore.user) return false
  return companyStore.selectedCompany.owner_user_id === authStore.user.user_id
})

const mapRoleIdToName = (roleId?: number) => {
  const roles: Record<number, string> = {
    1: 'OWNER',
    2: 'ADMIN',
    3: 'MEMBER',
    4: 'VIEWER',
    5: 'AUDITOR',
  }
  return roles[Number(roleId)] || 'UNKNOWN'
}

const getCompanyRoleLabel = () => {
  const company = companyStore.selectedCompany
  if (!company) return ''
  if (company.role_name) return company.role_name
  return mapRoleIdToName(company.role_id)
}

// Dropdown state for company selector
const companyDropdownOpen = ref(false)

const selectedCompanyLabel = computed(() => {
  const c = companyStore.selectedCompany
  if (!c) return 'เลือกบริษัท'
  const ownerTag = c.owner_user_id === authStore.user?.user_id ? ' (เจ้าของ)' : ''
  return `${c.org_name || 'ไม่ระบุชื่อ'}${ownerTag}`
})

const selectCompany = (orgId: string) => {
  const company = companyStore.companies.find((c) => c.org_id === orgId)
  if (company) {
    companyStore.setSelectedCompany(company)
    loadCompanyData(company)
  }
  companyDropdownOpen.value = false
}

// ตรวจสอบว่าฟิลด์นี้เป็นฟิลด์บริษัทหรือไม่
const isCompanyField = (fieldKey: FieldKey): boolean => {
  return [
    'company_name',
    'company_position',
    'company_address_1',
    'company_address_2',
    'company_address_3',
    'company_integrate_provider',
    'company_integrate_passcode',
    'company_integrate_url',
  ].includes(fieldKey)
}

// =====================================================
// STATE (ตัวแปรควบคุมสถานะ)
// =====================================================
const isLoading = ref(false)

// Image error state
const imageError = ref(false)

// Email Popup State (สำหรับหน้าต่างกรอกอีเมลใหม่)
const showEmailPopup = ref(false)
const newEmail = ref('')
const emailError = ref('')
const passwordForEmail = ref('')

// Password Popup State (สำหรับหน้าต่างเปลี่ยนรหัสผ่าน)
const showPasswordPopup = ref(false)
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref('')

// MFA State
const showMfaSetupPopup = ref(false)
const showMfaDisablePopup = ref(false)
const mfaQrCode = ref('')
const mfaSecret = ref('')
const mfaOtp = ref('')
const mfaError = ref('')
const mfaEnabled = ref(false)

// Trusted Devices State
const showDevicesPopup = ref(false)
const trustedDevices = ref<TrustedDevice[]>([])
const isLoadingDevices = ref(false)
const trustedDevicesCount = ref<number | null>(null) // ✅ Store device count

// =====================================================
// COMPUTED & HELPERS
// =====================================================
const genderLabel = computed(() => {
  switch (form.sex) {
    case 'M':
      return 'ชาย'
    case 'F':
      return 'หญิง'
    case 'O':
      return 'อื่น ๆ'
    default:
      return 'เลือกเพศ'
  }
})

const fullNameComputed = computed(() => `${form.name} ${form.surname}`.trim())

const userInitials = computed(() => {
  const name = authStore.user?.full_name || authStore.user?.email || 'U'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})

// Computed: Profile image URL - use directly from Supabase
const profileImageUrl = computed(() => {
  const url = form.profile_image_url
  if (!url) return ''
  return url
})

// Handle image loading error
const onImageError = () => {
  console.warn('Failed to load profile image, showing default avatar')
  imageError.value = true
}

// 🔐 Password Strength Computed
const passwordChecks = computed(() => ({
  hasLength: newPassword.value.length >= 6,
  hasUpper: /[A-Z]/.test(newPassword.value),
  hasLower: /[a-z]/.test(newPassword.value),
  hasNumber: /[0-9]/.test(newPassword.value),
  hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword.value),
}))

const passwordStrength = computed(() => {
  // ถ้าไม่มี password ให้แสดง 0% ไม่มีสี
  if (!newPassword.value) {
    return { percentage: 0, label: '', colorClass: '', textClass: 'text-gray-400' }
  }

  const checks = passwordChecks.value
  const score = [
    checks.hasLength,
    checks.hasUpper,
    checks.hasLower,
    checks.hasNumber,
    checks.hasSpecial,
  ].filter(Boolean).length

  if (score <= 1) return { percentage: 20, colorClass: 'bg-red-500', textClass: 'text-red-500' }
  if (score === 2)
    return {
      percentage: 40,
      colorClass: 'bg-orange-500',
      textClass: 'text-orange-500',
    }
  if (score === 3)
    return {
      percentage: 60,
      colorClass: 'bg-yellow-500',
      textClass: 'text-yellow-500',
    }
  if (score === 4)
    return {
      percentage: 80,
      colorClass: 'bg-blue-500',
      textClass: 'text-blue-500',
    }
  return {
    percentage: 100,
    colorClass: 'bg-green-500',
    textClass: 'text-green-500',
  }
})

const isPasswordValid = computed(() => {
  const checks = passwordChecks.value
  return (
    oldPassword.value.trim() !== '' &&
    checks.hasLength &&
    checks.hasUpper &&
    checks.hasLower &&
    checks.hasNumber &&
    checks.hasSpecial &&
    newPassword.value === confirmPassword.value &&
    oldPassword.value !== newPassword.value
  )
})

const genderOptions = [
  { value: 'M', label: 'ชาย' },
  { value: 'F', label: 'หญิง' },
  { value: 'O', label: 'อื่น ๆ' },
]

const genderDropdownOpen = ref(false)

const getGenderLabel = (value: string) => {
  const opt = genderOptions.find((o) => o.value === value)
  return opt?.label || ''
}

const nonEditableFields: EditableKey[] = ['company_position']

// Validate URL format when user fills Integration URL (ต้องมีโดเมน เช่น .com)
const isValidUrl = (value: string): boolean => {
  try {
    const url = new URL(value)
    // ต้องมี protocol + host และ host ต้องมีจุด (เช่น .com/.net/.co.th)
    const hasTld = /\.[a-z]{2,}$/i.test(url.hostname)
    return Boolean(url.protocol && url.hostname && hasTld)
  } catch {
    return false
  }
}

// Helper to check if a key is in formEditableKeys
const isFormEditableKey = (key: any): key is FormEditableKey => {
  return formEditableKeys.includes(key as FormEditableKey)
}

const isEditableField = (key: FieldKey) => {
  // trusted_devices and mfa are not editable in the standard way
  if (key === 'trusted_devices' || key === 'mfa' || key === 'role') return false
  return isFormEditableKey(key) || key === 'email' || key === 'password'
}


const resetEditableValue = (fieldKey: EditableKey) => {
  if (fieldKey === 'email') {
    editableValues.email = authStore.user?.email || ''
    return
  }
  if (fieldKey === 'password') {
    editableValues.password = ''
    return
  }
  if (isFormEditableKey(fieldKey)) {
    editableValues[fieldKey] = form[fieldKey] || ''
  }
}

const selectGender = (value: string) => {
  editableValues.sex = value
  genderDropdownOpen.value = false
}

const populateEditableValues = () => {
  ;(['email', 'password', ...formEditableKeys] as EditableKey[]).forEach((key) => {
    resetEditableValue(key)
  })
}

const displayValue = (fieldKey: EditableKey) => {
  if (fieldKey === 'sex') return genderLabel.value
  if (fieldKey === 'email') return authStore.user?.email || '-'
  if (fieldKey === 'password') return '********'
  if (fieldKey === 'company_position') return getCompanyRoleLabel() || '-'
  if (fieldKey === 'company_integrate_passcode') return form.company_integrate_passcode ? '********' : '-'
  if (isFormEditableKey(fieldKey)) return form[fieldKey] || '-'
  return '-'
}

const displayStaticValue = (fieldKey: FieldKey) => {
  if (fieldKey === 'role') {
    const roles: Record<number, string> = {
      1: 'เจ้าของ (Owner)',
      2: 'ผู้ดูแลระบบ (Admin)',
      3: 'ผู้ใช้ (User)',
      4: 'ผู้ดู (Viewer)',
      5: 'ผู้ตรวจสอบ (Auditor)',
    }
    return roles[authStore.user?.role_id || 3] || 'ผู้ใช้'
  }
  if (fieldKey === 'mfa') {
    return mfaEnabled.value ? '✅ เปิดใช้งานแล้ว' : '❌ ยังไม่เปิดใช้งาน'
  }
  if (fieldKey === 'trusted_devices') {
    if (trustedDevicesCount.value === null) return 'กำลังโหลด...'
    if (trustedDevicesCount.value === 0) return 'ไม่มีอุปกรณ์ที่เชื่อมต่อ'
    return `📱 มี ${trustedDevicesCount.value} อุปกรณ์`
  }
  return displayValue(fieldKey as EditableKey)
}

const startEdit = (fieldKey: EditableKey) => {
  resetEditableValue(fieldKey)
  editState[fieldKey] = true
}

const cancelEdit = (fieldKey: EditableKey) => {
  resetEditableValue(fieldKey)
  editState[fieldKey] = false
}

const saveField = (fieldKey: EditableKey) => {
  if (fieldKey === 'email') {
    editState[fieldKey] = false
    changeEmail(editableValues.email)
    return
  }
  if (fieldKey === 'password') {
    editState[fieldKey] = false
    changePassword(editableValues.password)
    return
  }

  if (fieldKey === 'sex') {
    form.sex = (editableValues.sex || '').toUpperCase()
  } else if (fieldKey === 'company_integrate_url') {
    const value = (editableValues.company_integrate_url || '').trim()
    if (value && !isValidUrl(value)) {
      Swal.fire({
        icon: 'warning',
        title: 'รูปแบบ URL ไม่ถูกต้อง',
        text: 'กรุณากรอก Integration URL เป็น URL ที่ถูกต้อง เช่น https://example.com',
        confirmButtonText: 'ตกลง',
      })
      return
    }
    form.company_integrate_url = value
  } else if (isFormEditableKey(fieldKey)) {
    form[fieldKey] = editableValues[fieldKey]
  }

  editState[fieldKey] = false
}

// =====================================================
// EVENTS: General (จัดการ Event ทั่วไป)
// =====================================================
const onImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // Reset image error state when uploading new image
  imageError.value = false

  const reader = new FileReader()
  reader.onload = () => {
    form.profile_image_url = reader.result as string
  }
  reader.readAsDataURL(file)
}

// =====================================================
// COMPANY SELECTOR (เลือกบริษัท)
// =====================================================
const loadCompanyData = (company: { org_name?: string; org_address_1?: string; org_address_2?: string; org_address_3?: string; org_integrate_provider_id?: string; org_integrate_passcode?: string; org_integrate_url?: string }) => {
  form.company_name = company.org_name || ''
  form.company_position = getCompanyRoleLabel()
  form.company_address_1 = company.org_address_1 || ''
  form.company_address_2 = company.org_address_2 || ''
  form.company_address_3 = company.org_address_3 || ''
  form.company_integrate_provider = company.org_integrate_provider_id || ''
  form.company_integrate_passcode = company.org_integrate_passcode || ''
  form.company_integrate_url = company.org_integrate_url || ''
  
  // รีเซ็ต editState และ editableValues สำหรับฟิลด์บริษัท
  const companyFields: EditableKey[] = [
    'company_name',
    'company_position',
    'company_address_1',
    'company_address_2',
    'company_address_3',
    'company_integrate_provider',
    'company_integrate_passcode',
    'company_integrate_url',
  ]
  
  companyFields.forEach((key) => {
    editState[key] = false
    if (key === 'company_name') editableValues[key] = form.company_name
    else if (key === 'company_position') editableValues[key] = form.company_position
    else if (key === 'company_address_1') editableValues[key] = form.company_address_1
    else if (key === 'company_address_2') editableValues[key] = form.company_address_2
    else if (key === 'company_address_3') editableValues[key] = form.company_address_3
    else if (key === 'company_integrate_provider') editableValues[key] = form.company_integrate_provider
    else if (key === 'company_integrate_passcode') editableValues[key] = form.company_integrate_passcode
    else if (key === 'company_integrate_url') editableValues[key] = form.company_integrate_url
  })
}

// =====================================================
// 1. FLOW: RESET FORM (รีเซ็ตข้อมูล)
// =====================================================

// ฟังก์ชันสำหรับดึงข้อมูลจาก Store มาใส่ Form (ใช้ตอนโหลดหน้าและตอนกดรีเซ็ต)
const fillFormData = () => {
  const u = authStore.user
  if (!u) return

  if (u.full_name) {
    const parts = u.full_name.split(' ')
    form.name = parts[0] || ''
    form.surname = parts.slice(1).join(' ') || ''
  }

  form.full_name = u.full_name || ''
  form.sex = u.sex || ''
  form.user_address_1 = u.user_address_1 || ''
  form.user_address_2 = u.user_address_2 || ''
  form.user_address_3 = u.user_address_3 || ''
  form.profile_image_url = u.profile_image_url || ''
  // ดึงข้อมูลบริษัทจาก company store หรือ user object
  const company = companyStore.selectedCompany || (u as Record<string, unknown>)
  
  form.company_name = (company?.org_name as string) || (u as Record<string, unknown>).company_name as string || ''
  form.company_position = getCompanyRoleLabel()
  form.company_address_1 = (company?.org_address_1 as string) || (u as Record<string, unknown>).company_address_1 as string || ''
  form.company_address_2 = (company?.org_address_2 as string) || (u as Record<string, unknown>).company_address_2 as string || ''
  form.company_address_3 = (company?.org_address_3 as string) || (u as Record<string, unknown>).company_address_3 as string || ''
  form.company_integrate_provider = (company?.org_integrate_provider_id as string) || (u as Record<string, unknown>).company_integrate_provider as string || ''
  form.company_integrate_passcode = (company?.org_integrate_passcode as string) || (u as Record<string, unknown>).company_integrate_passcode as string || ''
  form.company_integrate_url = (company?.org_integrate_url as string) || (u as Record<string, unknown>).company_integrate_url as string || ''

  populateEditableValues()
}

// ฟังก์ชันกดปุ่ม "รีเซ็ต"
const openResetConfirm = async () => {
  const result = await Swal.fire({
    title: 'ยืนยันการรีเซ็ตข้อมูล',
    text: 'ข้อมูลในฟอร์มจะถูกคืนค่าเป็นข้อมูลล่าสุดจากระบบ',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33', // สีแดงสื่อถึงการล้างค่า
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'รีเซ็ตข้อมูล',
    cancelButtonText: 'ยกเลิก',
  })

  if (result.isConfirmed) {
    fillFormData() // เรียกใช้ฟังก์ชันเติมข้อมูล
    Swal.fire({
      icon: 'success',
      title: 'รีเซ็ตเรียบร้อย',
      timer: 1500,
      showConfirmButton: false,
    })
  }
}

// =====================================================
// 2. FLOW: CHANGE EMAIL (เปลี่ยนอีเมล)
// =====================================================
const changeEmail = (initialEmail?: string) => {
  newEmail.value = initialEmail ?? authStore.user?.email ?? ''
  passwordForEmail.value = ''
  emailError.value = ''
  showEmailPopup.value = true
}

const closeEmailPopup = () => (showEmailPopup.value = false)

// ฟังก์ชันกดปุ่ม "บันทึก" ใน Popup เปลี่ยนอีเมล
const openEmailConfirm = async () => {
  emailError.value = ''

  // 1. ตรวจสอบข้อมูลเบื้องต้น (Validation)
  if (!newEmail.value.trim() || !passwordForEmail.value.trim()) {
    emailError.value = 'กรุณากรอกอีเมลใหม่และรหัสผ่านเพื่อยืนยัน'
    return
  }
  if (newEmail.value.trim() === authStore.user?.email) {
    emailError.value = 'อีเมลใหม่ต้องไม่ซ้ำกับอีเมลเดิม'
    return
  }

  // ซ่อน Popup กรอกข้อมูลชั่วคราว เพื่อแสดง SweetAlert
  showEmailPopup.value = false

  // 2. ถามยืนยัน (Confirmation)
  const confirmResult = await Swal.fire({
    title: 'ยืนยันการเปลี่ยนอีเมล',
    html: `คุณต้องการเปลี่ยนเป็น <b>${newEmail.value}</b> ใช่หรือไม่?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#1C244B',
    cancelButtonColor: '#d33',
    confirmButtonText: 'ยืนยัน, เปลี่ยนเลย',
    cancelButtonText: 'ยกเลิก',
  })

  // ถ้ากดยกเลิก -> เปิด Popup กรอกข้อมูลกลับมา
  if (!confirmResult.isConfirmed) {
    showEmailPopup.value = true
    return
  }

  // 3. แสดง Loading และเรียก API
  Swal.fire({
    title: 'กำลังตรวจสอบ...',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  })

  // เรียก API ผ่าน Store
  const result = await authStore.changeEmail({
    newEmail: newEmail.value.trim(),
    password: passwordForEmail.value,
  })

  // 4. จัดการผลลัพธ์ (Result Handling)
  if (result.success) {
    await Swal.fire({
      icon: 'success',
      title: 'เปลี่ยนอีเมลสำเร็จ',
      timer: 2000,
      showConfirmButton: false,
    })
    // (Optional) อาจจะต้อง Redirect หรือทำอะไรต่อที่นี่
  } else {
    // ดักจับ Error message
    let displayError = result.error || 'เกิดข้อผิดพลาดในการเปลี่ยนอีเมล'

    // แปลงข้อความ Error ภาษาอังกฤษเป็นไทย (ถ้ามี pattern ตรงกัน)
    if (displayError.match(/password|credential|authen/i) || displayError.includes('รหัสผ่าน')) {
      displayError = 'รหัสผ่านปัจจุบันไม่ถูกต้อง'
    }

    // แสดง Error ใน Swal
    await Swal.fire({
      icon: 'error',
      title: 'เปลี่ยนอีเมลไม่สำเร็จ',
      text: displayError,
      confirmButtonText: 'ลองใหม่',
    })

    // เปิด Popup กรอกข้อมูลกลับมา พร้อมแสดง Error
    emailError.value = displayError
    showEmailPopup.value = true
  }
}

// =====================================================
// 3. FLOW: CHANGE PASSWORD (เปลี่ยนรหัสผ่าน)
// =====================================================
const changePassword = (initialNewPassword = '') => {
  oldPassword.value = ''
  newPassword.value = initialNewPassword
  confirmPassword.value = ''
  passwordError.value = ''
  showPasswordPopup.value = true
}

const closePasswordPopup = () => (showPasswordPopup.value = false)

// ฟังก์ชันกดปุ่ม "บันทึก" ใน Popup เปลี่ยนรหัสผ่าน
const openPasswordConfirm = async () => {
  passwordError.value = ''

  // 1. ตรวจสอบข้อมูลเบื้องต้น
  if (!oldPassword.value.trim()) {
    passwordError.value = 'กรุณากรอกรหัสผ่านเดิม'
    return
  }
  if (newPassword.value.length < 6) {
    passwordError.value = 'รหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร'
    return
  }
  if (!/[A-Z]/.test(newPassword.value)) {
    passwordError.value = 'รหัสผ่านใหม่ต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว'
    return
  }
  if (!/[a-z]/.test(newPassword.value)) {
    passwordError.value = 'รหัสผ่านใหม่ต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว'
    return
  }
  if (!/[0-9]/.test(newPassword.value)) {
    passwordError.value = 'รหัสผ่านใหม่ต้องมีตัวเลขอย่างน้อย 1 ตัว'
    return
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword.value)) {
    passwordError.value = 'รหัสผ่านใหม่ต้องมีอักขระพิเศษอย่างน้อย 1 ตัว'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'รหัสผ่านใหม่ไม่ตรงกัน'
    return
  }
  if (oldPassword.value === newPassword.value) {
    passwordError.value = 'รหัสผ่านใหม่ต้องไม่ซ้ำกับเดิม'
    return
  }

  // ซ่อน Popup กรอกข้อมูล
  showPasswordPopup.value = false

  // 2. ถามยืนยัน
  const confirmResult = await Swal.fire({
    title: 'ยืนยันการเปลี่ยนรหัสผ่าน',
    text: 'ระบบจะนำคุณออกจากระบบอัตโนมัติหลังเปลี่ยนสำเร็จ',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#1C244B',
    confirmButtonText: 'เปลี่ยนรหัสผ่าน',
    cancelButtonText: 'ยกเลิก',
  })

  if (!confirmResult.isConfirmed) {
    showPasswordPopup.value = true
    return
  }

  // 3. Loading
  Swal.fire({
    title: 'กำลังดำเนินการ...',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  })

  // 4. เรียก API
  const result = await authStore.changePassword({
    oldPassword: oldPassword.value,
    newPassword: newPassword.value,
  })

  if (result.success) {
    await Swal.fire({
      icon: 'success',
      title: 'สำเร็จ',
      text: 'กรุณาเข้าสู่ระบบใหม่ด้วยรหัสผ่านใหม่',
      confirmButtonText: 'ตกลง',
      confirmButtonColor: '#01E184',
      allowOutsideClick: false,
    })
    router.push('/login')
  } else {
    await Swal.fire({
      icon: 'error',
      title: 'ผิดพลาด',
      text: result.error || 'เปลี่ยนรหัสผ่านไม่สำเร็จ',
    })
    // เปิด Popup กลับมาให้แก้
    passwordError.value = result.error || 'เปลี่ยนรหัสผ่านไม่สำเร็จ'
    showPasswordPopup.value = true
  }
}

// =====================================================
// 4. FLOW: MFA (Two-Factor Authentication)
// =====================================================

// Load MFA status on mount
const loadMfaStatus = async () => {
  const result = await authStore.getMfaStatus()
  mfaEnabled.value = result.mfa_enabled || false
}

// Open MFA Setup popup
const openMfaSetup = async () => {
  mfaOtp.value = ''
  mfaError.value = ''

  const result = await authStore.setupMfa()
  if (result.success) {
    mfaQrCode.value = result.qrCodeUrl || ''
    mfaSecret.value = result.secret || ''
    showMfaSetupPopup.value = true
  } else {
    Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาด',
      text: result.error || 'ไม่สามารถตั้งค่า 2FA ได้',
    })
  }
}

const closeMfaSetupPopup = () => {
  showMfaSetupPopup.value = false
  mfaQrCode.value = ''
  mfaSecret.value = ''
  mfaOtp.value = ''
  mfaError.value = ''
}

const confirmEnableMfa = async () => {
  mfaError.value = ''

  const result = await authStore.enableMfa(mfaOtp.value)
  if (result.success) {
    mfaEnabled.value = true
    closeMfaSetupPopup()
    Swal.fire({
      icon: 'success',
      title: 'เปิดใช้งาน 2FA สำเร็จ',
      text: 'บัญชีของคุณได้รับการป้องกันด้วย Two-Factor Authentication แล้ว',
      timer: 2500,
      showConfirmButton: false,
    })
  } else {
    mfaError.value = result.error || 'รหัส OTP ไม่ถูกต้อง'
  }
}

// Open MFA Disable popup
const openMfaDisable = () => {
  mfaOtp.value = ''
  mfaError.value = ''
  showMfaDisablePopup.value = true
}

const closeMfaDisablePopup = () => {
  showMfaDisablePopup.value = false
  mfaOtp.value = ''
  mfaError.value = ''
}

const confirmDisableMfa = async () => {
  mfaError.value = ''

  const result = await authStore.disableMfa(mfaOtp.value)
  if (result.success) {
    mfaEnabled.value = false
    closeMfaDisablePopup()
    Swal.fire({
      icon: 'success',
      title: 'ปิด 2FA สำเร็จ',
      text: 'Two-Factor Authentication ถูกปิดแล้ว',
      timer: 2500,
      showConfirmButton: false,
    })
  } else {
    mfaError.value = result.error || 'รหัส OTP ไม่ถูกต้อง'
  }
}

// =====================================================
// 5. FLOW: TRUSTED DEVICES
// =====================================================

const openDevicesPopup = async () => {
  showDevicesPopup.value = true
  await fetchTrustedDevices()
}

const closeDevicesPopup = () => {
  showDevicesPopup.value = false
  trustedDevices.value = []
}

const fetchTrustedDevices = async () => {
  isLoadingDevices.value = true
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/trusted-devices`, {
      withCredentials: true, // ✅ Send auth cookies
    })
    console.log('[DEBUG] fetchTrustedDevices response:', response.data)
    if (response.data.success) {
      trustedDevices.value = response.data.data
      trustedDevicesCount.value = response.data.data.length // ✅ Update count
    }
  } catch (error) {
    console.error('Failed to fetch trusted devices', error)
    Toast.fire({ icon: 'error', title: 'ไม่สามารถโหลดข้อมูลอุปกรณ์ได้' })
  } finally {
    isLoadingDevices.value = false
  }
}

// ✅ Fetch device count on page load (silent, no toast on error)
const fetchTrustedDevicesCount = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/trusted-devices`, {
      withCredentials: true,
    })
    if (response.data.success) {
      trustedDevicesCount.value = response.data.data.length
    }
  } catch (error) {
    console.error('Failed to fetch trusted devices count', error)
    trustedDevicesCount.value = 0 // Default to 0 if error
  }
}

const removeTrustedDevice = async (deviceId: string) => {
  const confirm = await Swal.fire({
    title: 'ยืนยันการลบ?',
    text: 'คุณต้องการลบอุปกรณ์นี้ออกจากรายการที่เชื่อถือใช่หรือไม่? หากเข้าใช้งานใหม่จะต้องยืนยันตัวตนอีกครั้ง',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'ลบอุปกรณ์',
    cancelButtonText: 'ยกเลิก',
  })

  if (confirm.isConfirmed) {
    try {
      await axios.delete(`${API_BASE_URL}/auth/trusted-devices/${deviceId}`, {
        withCredentials: true, // ✅ Send auth cookies
      })
      trustedDevices.value = trustedDevices.value.filter((d) => d.device_id !== deviceId)
      Toast.fire({ icon: 'success', title: 'ลบอุปกรณ์เรียบร้อยแล้ว' })
    } catch (error) {
      console.error(error)
      Toast.fire({ icon: 'error', title: 'เกิดข้อผิดพลาดในการลบอุปกรณ์' })
    }
  }
}

const removeAllDevices = async () => {
  const confirm = await Swal.fire({
    title: 'ลบทั้งหมด?',
    text: 'คุณต้องการลบอุปกรณ์ที่เชื่อถือ "ทั้งหมด" ใช่หรือไม่?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'ลบทั้งหมด',
    cancelButtonText: 'ยกเลิก',
  })

  if (confirm.isConfirmed) {
    try {
      await axios.delete(`${API_BASE_URL}/auth/trusted-devices`, {
        withCredentials: true, // ✅ Send auth cookies
      })
      trustedDevices.value = []
      Toast.fire({ icon: 'success', title: 'ลบอุปกรณ์ทั้งหมดเรียบร้อยแล้ว' })
    } catch (error) {
      console.error(error)
      Toast.fire({ icon: 'error', title: 'เกิดข้อผิดพลาดในการลบอุปกรณ์' })
    }
  }
}

const getDeviceIcon = (deviceName: string) => {
  const name = deviceName.toLowerCase()
  if (name.includes('mobile') || name.includes('android') || name.includes('iphone'))
    return 'mdi-cellphone'
  if (name.includes('ipad') || name.includes('tablet')) return 'mdi-tablet'
  if (name.includes('mac') || name.includes('windows') || name.includes('linux'))
    return 'mdi-laptop'
  return 'mdi-monitor'
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// =====================================================
// 6. FLOW: UPDATE PROFILE (บันทึกข้อมูลหลัก)
// =====================================================
const updateProfile = async () => {
  // 1. ตรวจสอบข้อมูลเบื้องต้น
  if (!form.name.trim() || !form.surname.trim()) {
    Swal.fire({
      icon: 'warning',
      title: 'ข้อมูลไม่ครบถ้วน',
      text: 'กรุณากรอกชื่อและนามสกุลก่อนบันทึก',
      confirmButtonText: 'ตกลง',
      confirmButtonColor: '#f59e0b',
    })
    return
  }

  // 2. ถามยืนยัน
  const result = await Swal.fire({
    title: 'ยืนยันการบันทึกข้อมูล?',
    text: 'ข้อมูลของคุณจะถูกอัปเดตเข้าระบบ',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#1C244B',
    cancelButtonColor: '#d33',
    confirmButtonText: 'ใช่, บันทึกเลย',
    cancelButtonText: 'ยกเลิก',
  })

  if (result.isConfirmed) {
    // 3. แสดง Loading
    Swal.fire({
      title: 'กำลังบันทึกข้อมูล...',
      html: 'กรุณารอสักครู่',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    })

    try {
      // เตรียมข้อมูล Full Name
      form.full_name = fullNameComputed.value

      // 4. อัปเดตข้อมูลผู้ใช้
      const apiResult = await authStore.updateProfile({
        name: form.name,
        surname: form.surname,
        full_name: form.full_name,
        sex: form.sex,
        user_address_1: form.user_address_1,
        user_address_2: form.user_address_2,
        user_address_3: form.user_address_3,
        profile_image_url: form.profile_image_url,
      })

      if (!apiResult.success) {
        throw new Error(apiResult.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลผู้ใช้')
      }

      // 5. อัปเดตข้อมูลบริษัท (ถ้ามี selectedCompany และ user เป็น owner)
      let companyUpdateSuccess = true
      let companyError = null

      if (companyStore.selectedCompany?.org_id && isCompanyOwner.value) {
        // ตรวจ validation ฝั่งฟอร์ม ก่อนยิง API บริษัท
        if (!form.company_name.trim()) {
          await Swal.fire({
            icon: 'warning',
            title: 'ข้อมูลบริษัทไม่ครบถ้วน',
            text: 'กรุณากรอกชื่อบริษัท',
            confirmButtonText: 'ตกลง',
          })
          return
        }

        if (form.company_integrate_url && !isValidUrl(form.company_integrate_url.trim())) {
          await Swal.fire({
            icon: 'warning',
            title: 'รูปแบบ URL ไม่ถูกต้อง',
            text: 'กรุณากรอก Integration URL เป็น URL ที่ถูกต้อง เช่น https://example.com (ต้องมี .com หรือโดเมนที่มีจุด)',
            confirmButtonText: 'ตกลง',
          })
          return
        }

        try {
          // แปลง empty string เป็น null สำหรับฟิลด์ที่ allowNull: true เพื่อหลีกเลี่ยง validation error
          const normalizeValue = (value: string) => {
            return value && value.trim() !== '' ? value.trim() : null
          }

          const companyUpdateData = {
            org_name: form.company_name.trim(),
            org_address_1: normalizeValue(form.company_address_1),
            org_address_2: normalizeValue(form.company_address_2),
            org_address_3: normalizeValue(form.company_address_3),
            org_integrate_provider_id: normalizeValue(form.company_integrate_provider),
            org_integrate_passcode: normalizeValue(form.company_integrate_passcode),
            org_integrate_url: normalizeValue(form.company_integrate_url),
          }

          await companyStore.updateCompanyById(
            companyStore.selectedCompany.org_id,
            companyUpdateData
          )

          // รีเฟรชข้อมูลบริษัท
          await companyStore.fetchCompanies()
        } catch (companyErr: unknown) {
          companyUpdateSuccess = false
          companyError = companyErr instanceof Error ? companyErr.message : 'ไม่สามารถอัปเดตข้อมูลบริษัทได้'
          console.error('Error updating company:', companyErr)
        }
      }

      // 6. แสดงผลลัพธ์
      if (companyUpdateSuccess) {
        await Swal.fire({
          icon: 'success',
          title: 'บันทึกสำเร็จ!',
          text: 'ข้อมูลของคุณถูกอัปเดตเรียบร้อยแล้ว',
          timer: 2000,
          showConfirmButton: false,
        })
      } else {
        // แสดง warning แต่ไม่ throw error เพื่อให้ข้อมูลผู้ใช้บันทึกสำเร็จ
        await Swal.fire({
          icon: 'warning',
          title: 'บันทึกข้อมูลผู้ใช้สำเร็จ',
          text: `แต่ไม่สามารถอัปเดตข้อมูลบริษัทได้: ${companyError}`,
          confirmButtonText: 'ตกลง',
        })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'
      Swal.fire({
        icon: 'error',
        title: 'บันทึกไม่สำเร็จ',
        text: message,
        confirmButtonText: 'ลองใหม่',
      })
    }
  }
}

// =====================================================
// INIT (เริ่มทำงานเมื่อเข้าหน้าเว็บ)
// =====================================================
onMounted(async () => {
  isLoading.value = true
  try {
    console.log('🔄 Fetching fresh profile data...')
    await authStore.fetchProfile() // ดึงข้อมูลล่าสุด
    // ดึงข้อมูลบริษัทถ้ายังไม่มี
    if (!companyStore.selectedCompany && companyStore.companies.length === 0) {
      await companyStore.fetchCompanies()
    }
    fillFormData() // นำข้อมูลใส่ Form
    await loadMfaStatus() // โหลดสถานะ MFA
    await fetchTrustedDevicesCount() // ✅ โหลดจำนวนอุปกรณ์ที่เชื่อมต่อ
    console.log('✅ Profile updated from API')
  } catch (error) {
    console.error('❌ Failed to fetch profile:', error)
  } finally {
    isLoading.value = false
  }
})
</script>
