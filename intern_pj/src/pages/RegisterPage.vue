<template>
  <div class="min-h-screen bg-linear-to-br from-gray-100 to-blue-50 flex items-center justify-center p-6">
    <div class="bg-white/90 backdrop-blur shadow-2xl rounded-2xl p-10 w-full max-w-4xl border border-gray-200">

      <h2 class="text-3xl font-semibold mb-8 text-center text-gray-700 tracking-wide">
        Registration
      </h2>

      <div class="w-200 h-1 bg-linear-to-r from-blue-300 to-blue-500 mx-auto mt-2 mb-8 rounded-full"></div>

      <form @submit.prevent="submitForm" class="grid grid-cols-1 md:grid-cols-2 gap-6">

        <!-- Name -->
        <div>
          <label class="block mb-1 font-medium text-gray-600">Name</label>
          <input
            v-model="form.name"
            type="text"
            placeholder="First Name"
            class="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white shadow-sm
                   focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all duration-200"
          />
        </div>

        <!-- Surname -->
        <div>
          <label class="block mb-1 font-medium text-gray-600">Surname</label>
          <input
            v-model="form.surname"
            type="text"
            placeholder="Surname"
            class="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white shadow-sm
                   focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all duration-200"
          />
        </div>

        <!-- Gender -->
        <div>
          <label class="block mb-1 font-medium text-gray-600">Gender</label>
          <select
            v-model="form.sex"
            class="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white shadow-sm
                   focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all duration-200"
          >
            <option disabled value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        <div></div>

        <!-- Address -->
        <div class="md:col-span-2">
          <label class="block mb-1 font-medium text-gray-600">Address</label>

          <input
            v-model="form.address1"
            type="text"
            placeholder="Address line 1"
            class="w-full mb-3 border border-gray-300 rounded-lg px-4 py-2 bg-white shadow-sm
                   focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all duration-200"
          />

          <input
            v-model="form.address2"
            type="text"
            placeholder="Address line 2"
            class="w-full mb-3 border border-gray-300 rounded-lg px-4 py-2 bg-white shadow-sm
                   focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all duration-200"
          />

          <input
            v-model="form.address3"
            type="text"
            placeholder="Address line 3"
            class="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white shadow-sm
                   focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all duration-200"
          />
        </div>

        <!-- Email -->
        <div>
          <label class="block mb-1 font-medium text-gray-600">E-mail</label>
          <input
            v-model="form.email"
            type="email"
            placeholder="email@example.com"
            class="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white shadow-sm
                   focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all duration-200"
          />
        </div>

        <!-- Role Level -->
        <div>
          <label class="block mb-1 font-medium text-gray-600">Role Level</label>
          <select
            v-model="form.role_id"
            class="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white shadow-sm
                   focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all duration-200"
          >
            <option disabled value="">Select role</option>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
            <option value="view">View</option>
          </select>
        </div>

        <!-- Password -->
        <div>
          <label class="block mb-1 font-medium text-gray-600">Password</label>
          <input
            v-model="form.password"
            type="password"
            placeholder="********"
            class="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white shadow-sm
                   focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all duration-200"
          />
        </div>

        <!-- User Active -->
        <div>
          <label class="block mb-1 font-medium text-gray-600">User Active</label>
          <select
            v-model="form.is_active"
            class="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white shadow-sm
                   focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all duration-200"
          >
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </div>

        <!-- Confirm Password -->
        <div class="md:col-span-2">
          <label class="block mb-1 font-medium text-gray-600">Confirm Password</label>
          <input
            v-model="form.confirm_password"
            type="password"
            placeholder="********"
            class="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white shadow-sm
                   focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all duration-200"
          />
        </div>

        <!-- Submit button -->
        <div class="md:col-span-2 flex justify-center mt-4">
          <button
            type="submit"
            class="px-10 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-lg shadow-md 
                   transition transform hover:-translate-y-0.5 active:scale-95"
          >
            Create
          </button>
        </div>

      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive } from "vue"

const form = reactive({
  name: "",
  surname: "",
  sex: "",
  address1: "",
  address2: "",
  address3: "",
  email: "",
  role_id: "",
  password: "",
  confirm_password: "",
  is_active: "1",
});

const submitForm = () => {
  console.log("Form data:", form);
  alert("Created!");
};
</script>
