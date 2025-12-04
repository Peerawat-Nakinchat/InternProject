# 🖼️ Supabase Storage Integration Guide

## 📋 สารบัญ
1. [ภาพรวม](#ภาพรวม)
2. [การตั้งค่า Supabase](#การตั้งค่า-supabase)
3. [การใช้งาน API](#การใช้งาน-api)
4. [ตัวอย่างการเรียกใช้](#ตัวอย่างการเรียกใช้)
5. [การจัดการความปลอดภัย](#การจัดการความปลอดภัย)

---

## ภาพรวม

ระบบนี้ใช้ Supabase Storage สำหรับเก็บรูปโปรไฟล์ผู้ใช้ โดยมีฟีเจอร์:

- ✅ อัพโหลดรูปโปรไฟล์
- ✅ ลบรูปโปรไฟล์
- ✅ อัพเดทโปรไฟล์ (ลบรูปเก่าอัตโนมัติ)
- ✅ จำกัดขนาดไฟล์ (5MB)
- ✅ รองรับไฟล์: JPEG, PNG, GIF, WebP
- ✅ จัดเก็บแบบมีโครงสร้าง: `profiles/{userId}/{uniqueFileName}`

---

## การตั้งค่า Supabase

### 1. สร้างโปรเจค Supabase

1. ไปที่ [https://supabase.com](https://supabase.com)
2. สร้างบัญชีหรือ Login
3. คลิก "New Project"
4. กรอกข้อมูล:
   - **Project Name**: ชื่อโปรเจคของคุณ
   - **Database Password**: รหัสผ่านฐานข้อมูล (เก็บไว้ปลอดภัย)
   - **Region**: เลือกเซิร์ฟเวอร์ใกล้คุณ (แนะนำ: Southeast Asia)
5. รอสักครู่จน Supabase สร้างโปรเจคเสร็จ

### 2. สร้าง Storage Bucket

1. ในโปรเจค Supabase ไปที่เมนู **Storage**
2. คลิก "**Create a new bucket**"
3. ตั้งค่าดังนี้:
   - **Name**: `profile-images`
   - **Public bucket**: ✅ เปิด (หรือปิดแล้วตั้งค่า RLS - ดูด้านล่าง)
   - **File size limit**: 5 MB
   - **Allowed MIME types**: `image/jpeg, image/png, image/gif, image/webp`
4. คลิก "**Save**"

### 3. หา API Credentials

1. ไปที่ **Settings** > **API**
2. คัดลอกค่าเหล่านี้:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **API Key (anon public)**: `eyJhbGciOi...`

### 4. เพิ่มค่าลงใน Environment Variables

#### ถ้าใช้ Vault (Production)

รัน PowerShell script เพื่อเพิ่มค่าลง Vault:

```powershell
# ตั้งค่า Vault token
$env:VAULT_TOKEN = "your-vault-token"

# เพิ่ม Supabase credentials
vault kv put kv/backend/supabase `
  SUPABASE_URL="https://your-project.supabase.co" `
  SUPABASE_ANON_KEY="your-anon-key-here"
```

#### ถ้าไม่ใช้ Vault (Development)

สร้างไฟล์ `.env` ในโฟลเดอร์ `backend/`:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

---

## การใช้งาน API

### Authentication Required
ทุก API ต้องมี JWT Token ใน Header:
```
Authorization: Bearer <your-access-token>
```

### API Endpoints

#### 1. ดูข้อมูลโปรไฟล์
```http
GET /api/profile
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "name": "John",
    "surname": "Doe",
    "profile_image_url": "https://xxxxx.supabase.co/storage/v1/object/public/profile-images/profiles/123/abc.jpg",
    ...
  }
}
```

#### 2. อัพเดทข้อมูลโปรไฟล์
```http
PUT /api/profile
Content-Type: application/json

{
  "name": "John",
  "surname": "Doe",
  "sex": "M",
  "user_address_1": "123 Main St",
  "user_address_2": "Apt 4B",
  "user_address_3": "Bangkok 10110"
}
```

#### 3. อัพโหลดรูปโปรไฟล์
```http
POST /api/profile/upload-image
Content-Type: multipart/form-data

profileImage: <file>
```

**Response:**
```json
{
  "success": true,
  "message": "อัพโหลดรูปภาพสำเร็จ",
  "data": {
    "profile_image_url": "https://xxxxx.supabase.co/storage/v1/object/public/profile-images/profiles/123/abc.jpg",
    "user": { ... }
  }
}
```

**หมายเหตุ:**
- ไฟล์ต้องมีขนาดไม่เกิน 5MB
- รองรับเฉพาะ: JPEG, PNG, GIF, WebP
- จะลบรูปเก่าอัตโนมัติ (ถ้ามี)

#### 4. ลบรูปโปรไฟล์
```http
DELETE /api/profile/delete-image
```

**Response:**
```json
{
  "success": true,
  "message": "ลบรูปภาพสำเร็จ"
}
```

---

## ตัวอย่างการเรียกใช้

### JavaScript (Fetch API)
```javascript
// อัพโหลดรูปโปรไฟล์
const uploadProfileImage = async (file) => {
  const formData = new FormData();
  formData.append('profileImage', file);

  const response = await fetch('http://localhost:3000/api/profile/upload-image', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: formData
  });

  return await response.json();
};

// ใช้งาน
const fileInput = document.getElementById('file-input');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const result = await uploadProfileImage(file);
  console.log(result);
});
```

### Vue.js (Composition API)
```vue
<script setup>
import { ref } from 'vue';
import axios from 'axios';

const profileImage = ref(null);
const uploading = ref(false);

const handleFileChange = (event) => {
  profileImage.value = event.target.files[0];
};

const uploadImage = async () => {
  if (!profileImage.value) return;
  
  uploading.value = true;
  const formData = new FormData();
  formData.append('profileImage', profileImage.value);

  try {
    const { data } = await axios.post('/api/profile/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
      }
    });
    
    console.log('Upload success:', data);
    alert('อัพโหลดสำเร็จ!');
  } catch (error) {
    console.error('Upload error:', error);
    alert('เกิดข้อผิดพลาด');
  } finally {
    uploading.value = false;
  }
};
</script>

<template>
  <div>
    <input type="file" @change="handleFileChange" accept="image/*" />
    <button @click="uploadImage" :disabled="uploading">
      {{ uploading ? 'กำลังอัพโหลด...' : 'อัพโหลดรูป' }}
    </button>
  </div>
</template>
```

### cURL
```bash
# อัพโหลดรูป
curl -X POST http://localhost:3000/api/profile/upload-image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "profileImage=@/path/to/image.jpg"

# ลบรูป
curl -X DELETE http://localhost:3000/api/profile/delete-image \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## การจัดการความปลอดภัย

### ระดับ 1: Public Bucket (ง่ายที่สุด)
- ใครก็เห็นรูปได้ทั้งหมด
- เหมาะกับ: รูปโปรไฟล์สาธารณะ

**ไม่ต้องตั้งค่าอะไรเพิ่ม** - ใช้งานได้เลย

---

### ระดับ 2: Row Level Security (RLS) - แนะนำ
ควบคุมว่าใครสามารถอัพโหลด/ลบไฟล์ได้

1. ไปที่ Storage > `profile-images` > **Policies**
2. คลิก "**New Policy**"

#### Policy 1: อนุญาตให้อัพโหลดเฉพาะโฟลเดอร์ของตัวเอง
```sql
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-images' AND
  (storage.foldername(name))[1] = 'profiles' AND
  (storage.foldername(name))[2] = auth.uid()::text
);
```

#### Policy 2: ทุกคนดูรูปได้
```sql
CREATE POLICY "Anyone can view profile images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-images');
```

#### Policy 3: ลบได้เฉพาะของตัวเอง
```sql
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-images' AND
  (storage.foldername(name))[1] = 'profiles' AND
  (storage.foldername(name))[2] = auth.uid()::text
);
```

**หมายเหตุ:** ถ้าใช้ RLS จะต้องส่ง Supabase JWT token ด้วย ซึ่งอาจต้องปรับ code เพิ่มเติม

---

### ระดับ 3: Service Role Key (สำหรับ Backend เท่านั้น)
ถ้าต้องการควบคุมเต็มที่จาก Backend:

1. ใช้ **Service Role Key** แทน Anon Key
2. ไปที่ Settings > API > **Service Role Key**
3. เปลี่ยนใน `.env`:
```env
SUPABASE_ANON_KEY=<service-role-key>
```

⚠️ **คำเตือน:** Service Role Key มีสิทธิ์เต็ม ห้ามเผยแพร่หรือส่งไปฝั่ง Frontend!

---

## 📁 โครงสร้างไฟล์ที่สร้างขึ้น

```
backend/
├── src/
│   ├── config/
│   │   └── supabase.js          # Supabase client configuration
│   ├── services/
│   │   └── StorageService.js    # Service จัดการ upload/delete
│   ├── middleware/
│   │   └── uploadMiddleware.js  # Multer middleware สำหรับรับไฟล์
│   ├── controllers/
│   │   └── ProfileController.js # Controller จัดการโปรไฟล์
│   └── routes/
│       └── profileRoutes.js     # Routes สำหรับ API
└── .env.supabase.example        # ตัวอย่าง env config
```

---

## 🐛 Troubleshooting

### ปัญหา: "Supabase storage is not configured"
**สาเหตุ:** ไม่ได้ตั้งค่า environment variables

**วิธีแก้:**
1. ตรวจสอบว่ามี `SUPABASE_URL` และ `SUPABASE_ANON_KEY` ใน `.env`
2. Restart server

---

### ปัญหา: "Failed to upload image to storage"
**สาเหตุ:** Bucket ไม่มีหรือไม่มีสิทธิ์

**วิธีแก้:**
1. ตรวจสอบว่าสร้าง bucket ชื่อ `profile-images` แล้ว
2. ตั้งค่า bucket เป็น Public หรือตั้ง RLS policies ให้ถูกต้อง
3. ตรวจสอบ API Key ว่าถูกต้อง

---

### ปัญหา: อัพโหลดได้แต่ไม่เห็นรูป
**สาเหตุ:** Bucket เป็น Private

**วิธีแก้:**
1. ไปที่ Storage > `profile-images`
2. ตั้งค่า "**Public bucket**" เป็น **ON**
3. หรือตั้งค่า RLS policy ให้อนุญาต SELECT

---

### ปัญหา: "รองรับเฉพาะไฟล์รูปภาพ"
**สาเหตุ:** ไฟล์ที่อัพโหลดไม่ใช่รูปภาพ

**วิธีแก้:**
- ใช้ไฟล์ .jpg, .png, .gif, .webp เท่านั้น

---

## 📚 อ้างอิง

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Multer Documentation](https://github.com/expressjs/multer)
- [Supabase Storage RLS](https://supabase.com/docs/guides/storage/security/access-control)

---

## ✅ Checklist การตั้งค่า

- [ ] สร้างโปรเจค Supabase
- [ ] สร้าง bucket ชื่อ `profile-images`
- [ ] คัดลอก Project URL และ Anon Key
- [ ] เพิ่มค่าลง `.env` หรือ Vault
- [ ] ตั้งค่า bucket เป็น Public (หรือตั้ง RLS)
- [ ] Restart backend server
- [ ] ทดสอบอัพโหลดรูป

---

🎉 **ตั้งค่าเสร็จแล้ว! พร้อมใช้งาน**
