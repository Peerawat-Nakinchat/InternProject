# 📦 Supabase Storage Integration - สรุปการติดตั้ง

## ✅ สิ่งที่ได้ทำเสร็จแล้ว

### 1. ติดตั้ง Dependencies
- ✅ `@supabase/supabase-js` - Supabase client library
- ✅ `multer` - Middleware สำหรับจัดการ file uploads

### 2. ไฟล์ที่สร้างขึ้นใหม่

#### Backend Core Files
```
backend/src/
├── config/
│   └── supabase.js                    # Supabase client configuration
├── services/
│   └── StorageService.js              # Service สำหรับจัดการ upload/delete รูปภาพ
├── middleware/
│   └── uploadMiddleware.js            # Multer middleware สำหรับรับไฟล์
├── controllers/
│   └── ProfileController.js           # Controller จัดการ API โปรไฟล์
└── routes/
    └── profileRoutes.js               # Routes สำหรับ profile API
```

#### Documentation Files
```
backend/
├── docs/
│   ├── SUPABASE_SETUP.md                      # คู่มือการตั้งค่า Supabase (ภาษาไทย)
│   ├── FRONTEND_INTEGRATION.md                # คู่มือเชื่อมต่อ Frontend
│   └── VAULT_SUPABASE_SETUP.md                # คู่มือตั้งค่า Vault (NEW)
├── vault-agent-config/
│   └── env.ctmpl                              # อัพเดทเพิ่ม Supabase env vars
├── setup-supabase-vault.ps1                   # PowerShell script (NEW)
└── .env.supabase.example                      # ตัวอย่าง environment variables
```

### 3. ไฟล์ที่แก้ไข
- ✅ `backend/server.js` - เพิ่ม profile routes
- ✅ `backend/vault-agent-config/env.ctmpl` - เพิ่ม Supabase config

---

## 🔌 API Endpoints ที่พร้อมใช้งาน

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile` | ดูข้อมูลโปรไฟล์ |
| PUT | `/api/profile` | อัพเดทข้อมูลโปรไฟล์ |
| POST | `/api/profile/upload-image` | อัพโหลดรูปโปรไฟล์ |
| DELETE | `/api/profile/delete-image` | ลบรูปโปรไฟล์ |

---

## 🚀 ขั้นตอนการใช้งาน

### ขั้นตอนที่ 1: ตั้งค่า Supabase

1. สร้างโปรเจค Supabase ที่ https://supabase.com
2. สร้าง Storage Bucket ชื่อ `profile-images`
3. ตั้งค่า bucket เป็น Public
4. คัดลอก Project URL และ Anon Key

📖 **คู่มือละเอียด:** `backend/docs/SUPABASE_SETUP.md`

---

### ขั้นตอนที่ 2: ตั้งค่า Environment Variables

#### ✨ วิธีที่ 1: ใช้ PowerShell Script (แนะนำ)
```powershell
# รัน script อัตโนมัติ
.\setup-supabase-vault.ps1 `
  -SupabaseUrl "https://your-project.supabase.co" `
  -SupabaseAnonKey "your-anon-key" `
  -VaultToken "your-vault-token"
```

#### วิธีที่ 2: ตั้งค่าด้วยตัวเอง (Vault)
```powershell
# ตั้งค่า Vault token
$env:VAULT_ADDR = "http://127.0.0.1:8200"
$env:VAULT_TOKEN = "your-vault-token"

# เพิ่ม Supabase credentials
vault kv put kv/backend/supabase `
  SUPABASE_URL="https://your-project.supabase.co" `
  SUPABASE_ANON_KEY="your-anon-key"

# Restart vault-agent
docker compose -f docker-compose.agent.yml restart vault-agent
```

📖 **คู่มือ Vault ละเอียด:** `backend/docs/VAULT_SUPABASE_SETUP.md`

#### ถ้าไม่ใช้ Vault (Development):
สร้างไฟล์ `.env` ใน `backend/`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

---

### ขั้นตอนที่ 3: Restart Backend Server

```powershell
# หยุด server
Ctrl + C

# Start server ใหม่
npm run dev
```

ควรเห็นข้อความ:
```
✅ Database synced successfully
🚀 Server running on port 3000
```

---

### ขั้นตอนที่ 4: ทดสอบ API

#### ใช้ cURL:
```bash
# อัพโหลดรูป
curl -X POST http://localhost:3000/api/profile/upload-image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "profileImage=@/path/to/image.jpg"
```

#### ใช้ Postman/Thunder Client:
1. สร้าง request ใหม่
2. Method: POST
3. URL: `http://localhost:3000/api/profile/upload-image`
4. Headers: `Authorization: Bearer <your-token>`
5. Body: form-data
   - Key: `profileImage`
   - Type: File
   - Value: เลือกไฟล์รูปภาพ

---

### ขั้นตอนที่ 5: เชื่อมต่อ Frontend

📖 **คู่มือ Frontend:** `backend/docs/FRONTEND_INTEGRATION.md`

**ตัวอย่างสั้นๆ (Vue.js):**
```vue
<script setup>
import { ref } from 'vue';
import axios from 'axios';

const handleUpload = async (file) => {
  const formData = new FormData();
  formData.append('profileImage', file);

  const { data } = await axios.post('/api/profile/upload-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
    }
  });
  
  console.log('Upload success:', data);
};
</script>

<template>
  <input type="file" @change="(e) => handleUpload(e.target.files[0])" />
</template>
```

---

## 📁 โครงสร้างข้อมูลใน Supabase

```
profile-images/              # Bucket name
└── profiles/                # Root folder
    └── {userId}/            # User-specific folder
        └── {uuid}.jpg       # Unique filename
```

**ตัวอย่าง URL:**
```
https://xxxxx.supabase.co/storage/v1/object/public/profile-images/profiles/123e4567-e89b-12d3-a456-426614174000/a1b2c3d4.jpg
```

---

## 🔒 Security Features

- ✅ JWT Authentication required
- ✅ File type validation (image only)
- ✅ File size limit (5MB)
- ✅ Unique filename (UUID)
- ✅ Auto-delete old images
- ✅ Organized by user ID

---

## 🐛 Troubleshooting

### ปัญหา: "Supabase storage is not configured"
**วิธีแก้:**
1. ตรวจสอบว่าตั้งค่า `SUPABASE_URL` และ `SUPABASE_ANON_KEY` แล้ว
2. Restart server

### ปัญหา: "Failed to upload image to storage"
**วิธีแก้:**
1. ตรวจสอบว่าสร้าง bucket ชื่อ `profile-images` แล้ว
2. ตั้งค่า bucket เป็น Public
3. ตรวจสอบ API Key ว่าถูกต้อง

### ปัญหา: อัพโหลดได้แต่ไม่เห็นรูป
**วิธีแก้:**
1. ตรวจสอบว่า bucket เป็น Public
2. หรือตั้งค่า RLS policies (ดูใน `SUPABASE_SETUP.md`)

---

## 📊 Database Schema

ฟิลด์ที่ใช้ในตาราง `sys_users`:

| Field | Type | Description |
|-------|------|-------------|
| `profile_image_url` | TEXT | URL รูปโปรไฟล์ใน Supabase Storage |

ฟิลด์นี้มีอยู่แล้วในระบบ ไม่ต้องเปลี่ยนแปลง database schema

---

## ✨ Features

### ✅ อัพโหลดรูปโปรไฟล์
- รองรับ: JPEG, PNG, GIF, WebP
- ขนาดสูงสุด: 5MB
- จัดเก็บใน Supabase Storage
- สร้างชื่อไฟล์แบบ unique (UUID)

### ✅ จัดการรูปอัตโนมัติ
- ลบรูปเก่าเมื่ออัพโหลดรูปใหม่
- จัดเก็บแยกตาม user_id
- URL แบบ public accessible

### ✅ ความปลอดภัย
- ตรวจสอบ JWT token
- ตรวจสอบประเภทไฟล์
- จำกัดขนาดไฟล์
- Validate file upload

---

## 📚 เอกสารเพิ่มเติม

1. **การตั้งค่า Supabase:** `backend/docs/SUPABASE_SETUP.md`
2. **การเชื่อมต่อ Frontend:** `backend/docs/FRONTEND_INTEGRATION.md`
3. **ตัวอย่าง Environment Variables:** `backend/.env.supabase.example`

---

## 🎉 พร้อมใช้งาน!

ระบบพร้อมใช้งานแล้ว คุณสามารถ:
- อัพโหลดรูปโปรไฟล์ผ่าน API
- ลบรูปโปรไฟล์
- ดึงข้อมูลโปรไฟล์พร้อมรูป
- เชื่อมต่อกับ Frontend

---

## 📞 Support

หากมีปัญหาหรือคำถาม:
1. ตรวจสอบ error logs ใน console
2. อ่านคู่มือใน `docs/`
3. ตรวจสอบ Supabase dashboard
4. ดู Network tab ใน browser DevTools

---

**Created:** December 2025  
**Version:** 1.0.0  
**Status:** ✅ Ready for Production
