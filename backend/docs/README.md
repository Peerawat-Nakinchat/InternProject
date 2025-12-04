# 🚀 Backend API - Multi-tenant System

Express.js backend with JWT authentication, Supabase Storage, and PostgreSQL.

---

## 🆕 New Features - Supabase Storage Integration

### ✨ Profile Image Management
- อัพโหลดรูปโปรไฟล์ไปยัง Supabase Storage
- ลบรูปโปรไฟล์
- จัดเก็บแบบมีโครงสร้าง: `profiles/{userId}/{uniqueFileName}`
- รองรับ: JPEG, PNG, GIF, WebP (สูงสุด 5MB)

### 📖 Documentation
- **การตั้งค่า Supabase:** [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)
- **การตั้งค่า Vault (แนะนำ):** [docs/VAULT_SUPABASE_SETUP.md](docs/VAULT_SUPABASE_SETUP.md)
- **การเชื่อมต่อ Frontend:** [docs/FRONTEND_INTEGRATION.md](docs/FRONTEND_INTEGRATION.md)
- **สรุปการติดตั้ง:** [docs/SUPABASE_IMPLEMENTATION_SUMMARY.md](docs/SUPABASE_IMPLEMENTATION_SUMMARY.md)

### 🔌 New API Endpoints
```
GET    /api/profile                  # ดูข้อมูลโปรไฟล์
PUT    /api/profile                  # อัพเดทโปรไฟล์
POST   /api/profile/upload-image     # อัพโหลดรูปโปรไฟล์
DELETE /api/profile/delete-image     # ลบรูปโปรไฟล์
```

---

## 🛠️ Tech Stack

- **Framework:** Express.js
- **Database:** PostgreSQL with Sequelize ORM
- **Storage:** Supabase Storage
- **Authentication:** JWT + Passport.js
- **Security:** Helmet, CORS, Rate Limiting, XSS Protection
- **Validation:** express-validator
- **File Upload:** Multer
- **Secret Management:** HashiCorp Vault (optional)

---

## 📦 Installation

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Setup Environment Variables

#### 🌟 Option A: Using PowerShell Script + Vault (แนะนำสำหรับ Production)
```powershell
# รัน script อัตโนมัติ
.\setup-supabase-vault.ps1 `
  -SupabaseUrl "https://your-project.supabase.co" `
  -SupabaseAnonKey "your-anon-key" `
  -VaultToken "your-vault-token"
```
📖 **คู่มือ Vault:** [docs/VAULT_SUPABASE_SETUP.md](docs/VAULT_SUPABASE_SETUP.md)

#### Option B: Using Vault Manually
```powershell
# Set Vault environment
$env:VAULT_ADDR = "http://127.0.0.1:8200"
$env:VAULT_TOKEN = "your-vault-token"

# Add Supabase credentials
vault kv put kv/backend/supabase `
  SUPABASE_URL="https://your-project.supabase.co" `
  SUPABASE_ANON_KEY="your-anon-key"

# Restart Vault Agent
docker compose -f docker-compose.agent.yml restart vault-agent
```

#### Option C: Using .env file (Development Only)
```bash
cp .env.example .env
# Edit .env and add your credentials
```

Required environment variables:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=your_database
DB_USER=your_user
DB_PASSWORD=your_password

# JWT
ACCESS_TOKEN_SECRET=your_access_secret
REFRESH_TOKEN_SECRET=your_refresh_secret

# Supabase (NEW)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### 3. Setup Supabase Storage
See detailed guide: [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)

Quick steps:
1. Create Supabase project
2. Create storage bucket named `profile-images`
3. Set bucket to Public
4. Copy Project URL and Anon Key

### 4. Run Server
```bash
# Development with auto-reload
npm run dev

# Production
npm start

# With Vault Agent
npm run dev:full
```

---

## 📚 API Documentation

### Authentication Endpoints
```
POST   /api/auth/register           # สมัครสมาชิก
POST   /api/auth/login              # เข้าสู่ระบบ
POST   /api/auth/logout             # ออกจากระบบ
POST   /api/auth/refresh-token      # รีเฟรช token
GET    /api/auth/google             # Login ด้วย Google
```

### Profile Endpoints (NEW)
```
GET    /api/profile                 # ดูข้อมูลโปรไฟล์
PUT    /api/profile                 # อัพเดทข้อมูลโปรไฟล์
POST   /api/profile/upload-image    # อัพโหลดรูปโปรไฟล์
DELETE /api/profile/delete-image    # ลบรูปโปรไฟล์
```

### Company Endpoints
```
GET    /api/company                 # ดูรายการบริษัท
POST   /api/company                 # สร้างบริษัทใหม่
PUT    /api/company/:id             # แก้ไขข้อมูลบริษัท
DELETE /api/company/:id             # ลบบริษัท
```

### Full API Docs
- Swagger UI: http://localhost:3000/api-docs

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run integration tests
npm run test:integration

# Watch mode
npm run test:watch
```

---

## 🔒 Security Features

- ✅ JWT Authentication with HTTP-only cookies
- ✅ Helmet (Security Headers)
- ✅ CORS with whitelist
- ✅ Rate Limiting (IP & User-based)
- ✅ XSS Protection
- ✅ SQL Injection Prevention (Sequelize)
- ✅ Input Validation & Sanitization
- ✅ Brute Force Protection
- ✅ Audit Logging
- ✅ File Upload Validation
- ✅ Supabase Storage Integration

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── dbConnection.js
│   │   ├── passport.js
│   │   └── supabase.js           # NEW: Supabase config
│   ├── controllers/
│   │   ├── AuthController.js
│   │   ├── ProfileController.js  # NEW: Profile management
│   │   └── ...
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── uploadMiddleware.js   # NEW: File upload
│   │   └── ...
│   ├── models/
│   │   ├── UserModel.js
│   │   └── ...
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── profileRoutes.js      # NEW: Profile routes
│   │   └── ...
│   ├── services/
│   │   ├── StorageService.js     # NEW: Supabase Storage
│   │   └── ...
│   └── utils/
├── docs/
│   ├── SUPABASE_SETUP.md         # NEW: Supabase setup guide
│   ├── FRONTEND_INTEGRATION.md   # NEW: Frontend integration
│   └── ...
├── __tests__/
├── server.js
└── package.json
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. "Supabase storage is not configured"
- ตรวจสอบว่าตั้งค่า `SUPABASE_URL` และ `SUPABASE_ANON_KEY`
- Restart server

#### 2. "Failed to upload image"
- ตรวจสอบว่าสร้าง bucket `profile-images` แล้ว
- ตั้งค่า bucket เป็น Public
- ตรวจสอบ API Key

#### 3. File size too large
- ไฟล์ต้องไม่เกิน 5MB
- ลดขนาดรูปก่อนอัพโหลด

See detailed troubleshooting: [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)

---

## 📄 License

ISC

---

## 👥 Team

Intern Project 2025

---

## 🔗 Links

- [Supabase Dashboard](https://supabase.com)
- [API Documentation](http://localhost:3000/api-docs)
- [Frontend Repository](../intern_pj)

---

**Last Updated:** December 2025  
**Version:** 2.0.0
