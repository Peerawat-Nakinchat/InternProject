<template>
  <div v-if="isOpen" 
       class="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-gray-600 bg-opacity-50 overflow-y-auto"
       @click.self="closeModal">
    
    <div class="bg-white p-6 rounded-lg shadow-2xl w-full max-w-5xl transition-all duration-300">
      
      <div class="flex justify-between items-center pb-3 border-b">
        <h3 class="text-2xl font-bold text-gray-800">จัดการสิทธิ์ Module รายบุคคล</h3>
        <button @click="closeModal" class="text-gray-400 hover:text-gray-600 text-3xl leading-none">&times;</button>
      </div>

      <div v-if="isLoading" class="p-10 text-center text-gray-500">
        <svg class="animate-spin h-6 w-6 mr-3 inline text-blue-500" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" class="opacity-25"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
        กำลังโหลดข้อมูล...
      </div>

      <div v-else-if="userData.length === 0" class="p-10 text-center text-gray-500">
          ไม่พบสมาชิกในองค์กรนี้
      </div>

      <div v-else class="mt-4 overflow-x-auto max-h-96">
        <table class="min-w-full divide-y divide-gray-200 border border-gray-100">
          <thead class="bg-gray-50 sticky top-0 z-20">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider sticky left-0 bg-gray-50 z-20 w-48">พนักงาน / บทบาท</th>
              <th v-for="mod in modulesList" :key="mod.menu_id" class="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider min-w-[100px]">
                {{ formatModuleName(mod.menu_id) }}
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="user in userData" :key="user.userId" class="hover:bg-yellow-50/50">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-100">
                {{ user.fullName }}
                <span class="text-xs text-blue-500 font-normal block">({{ user.roleName }})</span>
              </td>
              
              <td v-for="mod in modulesList" :key="mod.menu_id" class="px-6 py-4 whitespace-nowrap text-center text-sm">
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" 
                         :checked="user.modules[mod.menu_id].isEnabled"
                         @change="handleToggleChange(user.userId, mod.menu_id, $event.target.checked)"
                         class="sr-only peer">
                  <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-6 flex justify-end space-x-3 border-t pt-4">
        <button @click="closeModal" class="px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 transition duration-150">ยกเลิก</button>
        <button @click="saveChanges" 
                :disabled="Object.keys(currentChanges).length === 0 || isSaving"
                class="px-4 py-2 text-sm font-medium rounded-md text-white transition duration-150"
                :class="{
                    'bg-green-600 hover:bg-green-700': Object.keys(currentChanges).length > 0 && !isSaving, 
                    'bg-green-400 cursor-not-allowed': Object.keys(currentChanges).length === 0 || isSaving
                }">
          <span v-if="isSaving">กำลังบันทึก...</span>
          <span v-else>บันทึกการเปลี่ยนแปลง ({{ Object.keys(currentChanges).length }})</span>
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
    isOpen: { type: Boolean, required: true },
    orgId: { type: String, required: true },
    apiUrlBase: { type: String, default: '/api/permissions' },
    authToken: { type: String, required: true } 
});

const emit = defineEmits(['update:isOpen', 'saved']);

const isLoading = ref(false);
const isSaving = ref(false);
const userData = ref([]);
const initialDataSnapshot = ref([]);
const currentChanges = ref({});

const modulesList = computed(() => {
    if (userData.value.length === 0 || !userData.value[0].modules) return [];
    return Object.keys(userData.value[0].modules).map(key => ({ menu_id: key }));
});

const formatModuleName = (code) => {
    return code.replace('MOD_', '').replace('_ACCESS', '').replace(/_/g, ' ');
};

const closeModal = () => {
    if (Object.keys(currentChanges.value).length > 0 && 
        !confirm('คุณมีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก ต้องการปิดโดยไม่บันทึกหรือไม่?')) {
        return;
    }
    emit('update:isOpen', false);
};

const handleToggleChange = (userId, moduleCode, isChecked) => {
    const user = userData.value.find(u => u.userId === userId);
    if (!user) return;

    // 1. อัปเดต State ทันที
    user.modules[moduleCode].isEnabled = isChecked;

    // 2. จัดการ Change Tracking
    const key = `${userId}-${moduleCode}`;
    const originalValue = initialDataSnapshot.value.find(u => u.userId === userId).modules[moduleCode].isEnabled;
    
    if (originalValue !== isChecked) {
        currentChanges.value[key] = { userId, moduleCode, isEnabled: isChecked };
    } else {
        delete currentChanges.value[key];
    }
};

const saveChanges = async () => {
    if (Object.keys(currentChanges.value).length === 0 || isSaving.value) return;

    isSaving.value = true;
    const changesArray = Object.values(currentChanges.value);
    
    try {
        for (const change of changesArray) {
            const response = await fetch(`${props.apiUrlBase}/org/${props.orgId}/user/${change.userId}/toggle-module`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${props.authToken}`, 
                },
                body: JSON.stringify({ moduleCode: change.moduleCode, isEnabled: change.isEnabled }),
            });

            if (!response.ok) {
                const errorBody = await response.json();
                throw new Error(errorBody.message || `API Error for ${change.moduleCode}`);
            }
        }
        
        alert("บันทึกการเปลี่ยนแปลงสิทธิ์เรียบร้อย!");
        await fetchData(); // โหลดข้อมูลใหม่เพื่ออัปเดต Snapshot
        currentChanges.value = {}; 
        emit('saved');
        
    } catch (error) {
        console.error("Save Error:", error);
        alert(`เกิดข้อผิดพลาดในการบันทึกสิทธิ์: ${error.message}`);
    } finally {
        isSaving.value = false;
    }
};

async function fetchData() {
    if (!props.orgId) return;
    isLoading.value = true;
    try {
        const response = await fetch(`${props.apiUrlBase}/org/${props.orgId}/users-and-modules`, {
            headers: {
                'Authorization': `Bearer ${props.authToken}`, 
            }
        });
        const result = await response.json();

        if (response.ok) {
            userData.value = result.data;
            // Best Practice: ใช้ deep copy สำหรับ snapshot
            initialDataSnapshot.value = JSON.parse(JSON.stringify(result.data));
            currentChanges.value = {};
        } else {
            throw new Error(result.message || 'Failed to fetch data.');
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        alert(`ไม่สามารถดึงข้อมูลสิทธิ์ได้: ${error.message}`);
        userData.value = [];
    } finally {
        isLoading.value = false;
    }
}

watch(() => props.isOpen, (newVal) => {
    if (newVal) {
        fetchData();
    }
});
</script>