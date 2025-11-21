# BaseCard Component - Generic Reusable Card

## 📦 Overview
`BaseCard` เป็น component แบบ generic ที่สามารถนำไปใช้กับข้อมูลประเภทใด ๆ ได้ ผ่านระบบ **slots** ของ Vue

---

## 🎯 Features
- ✅ **Generic & Reusable** - ไม่ผูกติดกับข้อมูลใด ๆ
- ✅ **Flexible Slots** - ปรับแต่งได้ทุกส่วน (header, content, badge, footer)
- ✅ **Customizable Styling** - รองรับ custom class สำหรับแต่ละ section
- ✅ **Click Handler** - รองรับการคลิก (optional)
- ✅ **Clean API** - ใช้งานง่าย interface ชัดเจน

---

## 📝 Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `clickable` | `boolean` | `false` | เปิด/ปิดการคลิก |
| `cardClass` | `string` | `''` | Custom class สำหรับ card container |
| `headerClass` | `string` | `''` | Custom class สำหรับ header section |
| `contentClass` | `string` | `''` | Custom class สำหรับ content section |
| `badgeClass` | `string` | `''` | Custom class สำหรับ badge section |
| `footerClass` | `string` | `''` | Custom class สำหรับ footer section |

---

## 🔌 Slots

### 1. `#header` (Optional)
ส่วนหัวของการ์ด

### 2. `#default` (Required)
เนื้อหาหลักของการ์ด

### 3. `#badge` (Optional)
ส่วนแสดง badge หรือสถานะต่าง ๆ

### 4. `#footer` (Optional)
ส่วนท้ายของการ์ด (มี background สีเทา)

---

## 💡 ตัวอย่างการใช้งาน

### 1. **CompanyCard** (ใช้กับข้อมูลบริษัท)
```vue
<template>
  <BaseCard :clickable="true" @click="handleClick">
    <template #default>
      <h2>{{ company.org_name }}</h2>
      <p>{{ company.org_code }}</p>
    </template>
    
    <template #badge>
      <span class="badge">{{ company.status }}</span>
    </template>
    
    <template #footer>
      <button>ดูรายละเอียด</button>
    </template>
  </BaseCard>
</template>
```

---

### 2. **UserCard** (ใช้กับข้อมูลผู้ใช้)
```vue
<template>
  <BaseCard clickable @click="viewProfile(user.id)">
    <template #header>
      <img :src="user.avatar" class="w-12 h-12 rounded-full" />
    </template>
    
    <template #default>
      <h3 class="font-bold">{{ user.name }}</h3>
      <p class="text-sm text-gray-500">{{ user.email }}</p>
      <p class="text-xs">{{ user.role }}</p>
    </template>
    
    <template #badge>
      <span 
        :class="user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
        class="px-2 py-1 text-xs rounded-full"
      >
        {{ user.isActive ? '🟢 Active' : '⚫ Inactive' }}
      </span>
    </template>
  </BaseCard>
</template>
```

---

### 3. **ProductCard** (ใช้กับข้อมูลสินค้า)
```vue
<template>
  <BaseCard>
    <template #header>
      <img :src="product.image" class="w-full h-48 object-cover" />
    </template>
    
    <template #default>
      <h4 class="text-lg font-semibold">{{ product.name }}</h4>
      <p class="text-sm text-gray-600 mb-2">{{ product.description }}</p>
      <p class="text-xl font-bold text-primary-600">
        ฿{{ product.price.toLocaleString() }}
      </p>
    </template>
    
    <template #badge>
      <span v-if="product.stock > 0" class="text-green-600 text-sm">
        ✅ มีสินค้า {{ product.stock }} ชิ้น
      </span>
      <span v-else class="text-red-600 text-sm">❌ สินค้าหมด</span>
    </template>
    
    <template #footer>
      <button 
        @click="addToCart(product.id)"
        :disabled="product.stock === 0"
        class="w-full bg-primary-600 text-white py-2 rounded"
      >
        เพิ่มลงตะกร้า
      </button>
    </template>
  </BaseCard>
</template>
```

---

### 4. **NotificationCard** (ใช้กับการแจ้งเตือน)
```vue
<template>
  <BaseCard 
    clickable 
    @click="markAsRead(notification.id)"
    :card-class="notification.isRead ? '' : 'border-l-4 border-blue-500'"
  >
    <template #default>
      <div class="flex items-start gap-3">
        <span class="text-2xl">{{ notification.icon }}</span>
        <div class="flex-1">
          <h5 class="font-semibold">{{ notification.title }}</h5>
          <p class="text-sm text-gray-600">{{ notification.message }}</p>
          <p class="text-xs text-gray-400 mt-1">{{ notification.time }}</p>
        </div>
      </div>
    </template>
    
    <template #badge>
      <span v-if="!notification.isRead" class="bg-blue-500 text-white px-2 py-1 text-xs rounded">
        ใหม่
      </span>
    </template>
  </BaseCard>
</template>
```

---

### 5. **StatCard** (ใช้กับสถิติ/ตัวเลข)
```vue
<template>
  <BaseCard>
    <template #default>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-500 uppercase">{{ stat.label }}</p>
          <p class="text-3xl font-bold text-gray-900 mt-1">{{ stat.value }}</p>
        </div>
        <div :class="['text-4xl', stat.color]">
          {{ stat.icon }}
        </div>
      </div>
    </template>
    
    <template #badge>
      <div class="flex items-center gap-1">
        <span :class="stat.trend === 'up' ? 'text-green-600' : 'text-red-600'">
          {{ stat.trend === 'up' ? '↗️' : '↘️' }}
        </span>
        <span class="text-sm">{{ stat.change }}%</span>
        <span class="text-xs text-gray-500">จากเดือนที่แล้ว</span>
      </div>
    </template>
  </BaseCard>
</template>
```

---

## 🎨 Custom Styling Example

```vue
<BaseCard
  :clickable="true"
  card-class="border-2 border-blue-500"
  content-class="bg-blue-50"
  footer-class="bg-blue-100"
  @click="handleAction"
>
  <!-- slots content -->
</BaseCard>
```

---

## 🚀 Benefits

1. **DRY Principle** - เขียนโค้ดครั้งเดียว ใช้ได้หลายที่
2. **Maintainability** - แก้ไขที่เดียว ส่งผลทุกที่
3. **Consistency** - UI/UX เหมือนกันทั้งแอป
4. **Flexibility** - ปรับแต่งได้ง่าย ผ่าน slots และ props
5. **Type Safety** - รองรับ TypeScript

---

## 📂 File Structure

```
components/
├── base/
│   ├── BaseCard.vue      ← Generic Card Component
│   ├── BaseButton.vue
│   └── BaseInput.vue
└── CompanyCard.vue        ← Specific implementation
```

---

## ✅ Best Practices

1. ใช้ `BaseCard` สำหรับโครงสร้างพื้นฐาน
2. สร้าง specific component (เช่น `CompanyCard`) สำหรับ business logic
3. ส่ง data เป็น props ไปยัง specific component
4. ใช้ slots เพื่อความยืดหยุ่น
5. ใช้ `clickable` prop แทนการใส่ click handler ตรง ๆ

---

**Happy Coding! 🎉**
