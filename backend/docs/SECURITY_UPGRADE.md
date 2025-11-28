# 🔐 Security Upgrade - Token Rotation & Monitoring

## สรุปการอัปเกรด

### 1. Backend: Refresh Token Rotation ✅
**ไฟล์ที่แก้ไข:** `src/controllers/AuthController.js`

**ทำงานยังไง:**
- เมื่อ Frontend มาขอต่ออายุบัตร (refresh token) → Backend จะเช็คบัตรเก่า
- ถ้าถูกต้อง → **ฉีกบัตรเก่าทิ้งทันที** (ลบจาก DB) → ออกบัตรใหม่ให้
- ถ้าตรวจพบว่าบัตรเก่าถูกใช้ซ้ำ (Token Reuse Attack) → **Revoke ทุก session ของ user ทันที**

**Security Benefits:**
- ป้องกันการใช้บัตรซ้ำ (Reuse Attack)
- ตรวจจับและป้องกัน Token Theft
- ลดหน้าต่างเวลาที่โจรสามารถใช้ token ที่ขโมยมาได้

---

### 2. Frontend: Centralized Axios ✅
**ไฟล์ที่แก้ไข:** `src/utils/axios.ts`

**ทำงานยังไง:**
- **ขาไป (Request):** แปะ Access Token ให้เองทุกครั้ง
- **ขากลับ (Response):** คอยดักฟัง Error
  - ถ้าเจอ 401 (บัตรหมดอายุ): หยุดรอ → วิ่งไปขอต่ออายุบัตรใหม่ → รับ Refresh Token ใบใหม่มาเก็บ → Retry Request เดิมอัตโนมัติ
- **Queue System:** ถ้ามีหลาย request พร้อมกัน จะรอ refresh เสร็จแล้วค่อยยิงทั้งหมด

**User Experience:**
- User จะไม่รู้สึกเลยว่าบัตรหมดอายุ (Seamless Experience)

---

### 3. Frontend: Integration ✅
**ไฟล์ที่แก้ไข:** `src/stores/auth.ts`

**สิ่งที่เปลี่ยน:**
- ทุก API call ที่ต้องการ authentication ใช้ `axiosInstance` แทน axios ตรงๆ
- รับ refresh token ใหม่จาก response และบันทึกทันที
- ตรวจจับ token reuse attack และ logout อัตโนมัติ

---

### 4. Security Monitoring ✅
**ไฟล์ใหม่:** `src/routes/securityRoutes.js`, `src/middleware/securityMonitoring.js`

**Features:**
- **Security Metrics Dashboard:** `/api/security/metrics`
- **Active Alerts:** `/api/security/alerts`
- **Token Statistics:** `/api/security/tokens/stats`
- **Session Management:** `/api/security/user/:userId/sessions`
- **Session Hijacking Detection:** ตรวจจับการเปลี่ยน User Agent ผิดปกติ

**Event Types ที่ Monitor:**
- `TOKEN_REUSE_DETECTED` - ตรวจพบการใช้ token ซ้ำ
- `BRUTE_FORCE_ATTEMPT` - พยายาม login หลายครั้ง
- `SQL_INJECTION_ATTEMPT` - พยายาม SQL Injection
- `XSS_ATTEMPT` - พยายาม XSS Attack
- `SUSPICIOUS_USER_AGENT` - User Agent น่าสงสัย
- `RATE_LIMIT_EXCEEDED` - เกิน Rate Limit
- `POSSIBLE_SESSION_HIJACK` - อาจมีการขโมย Session

---

## 🧪 วิธีทดสอบ

### สำหรับ PowerShell (Windows)

### Test 1: Login และตรวจสอบ Token
```powershell
# Login
$body = @{ email = "example@gmail.com"; password = "Jj!111" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $body -ContentType "application/json"

# หรือใช้ curl.exe (ไม่ใช่ alias)
curl.exe -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"test@test.com\",\"password\":\"123456\"}"
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiM2Q4ZDgwNDctZTc5OS00OTFlLTllZmMtMGRlM2VmZmMyZTk3IiwiaWF0IjoxNzY0MzEzMDEyLCJleHAiOjE3NjQ5MTc4MTJ9.mig4stq7bEpiLIB0R6-uCslNq-pLzdWIqXP3hx4wwNU
### Test 2: Token Refresh (Rotation)
```powershell
# ใช้ refreshToken จาก login
$body = @{ refreshToken = "<old_refresh_token>" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/refresh" -Method POST -Body $body -ContentType "application/json"

# หรือใช้ curl.exe
curl.exe -X POST http://localhost:3000/api/auth/refresh -H "Content-Type: application/json" -d "{\"refreshToken\":\"<old_refresh_token>\"}"
```

### Test 3: Token Reuse Attack Detection
```powershell
# ลองใช้ refreshToken เก่าอีกครั้ง (หลังจาก refresh ไปแล้ว)
$body = @{ refreshToken = "<old_refresh_token>" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/refresh" -Method POST -Body $body -ContentType "application/json"

# ต้องได้ error: "Refresh Token ถูกใช้งานแล้ว กรุณาเข้าสู่ระบบใหม่"
```

### Test 4: Security Metrics
```powershell
# ดู security metrics (ต้อง login ก่อน)
$headers = @{ Authorization = "Bearer <access_token>" }
Invoke-RestMethod -Uri "http://localhost:3000/api/security/metrics" -Method GET -Headers $headers
```

### Test 5: User Sessions
```powershell
# ดู sessions ของ user
$headers = @{ Authorization = "Bearer <access_token>" }
Invoke-RestMethod -Uri "http://localhost:3000/api/security/user/<user_id>/sessions" -Method GET -Headers $headers
```

---

### สำหรับ Bash/Linux/Mac

### Test 1: Login และตรวจสอบ Token
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'
```

### Test 2: Token Refresh (Rotation)
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<old_refresh_token>"}'
```

### Test 3: Token Reuse Attack Detection
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<old_refresh_token>"}'
```

### Test 4: Security Metrics
```bash
curl -X GET http://localhost:3000/api/security/metrics \
  -H "Authorization: Bearer <access_token>"
```

### Test 5: User Sessions
```bash
curl -X GET "http://localhost:3000/api/security/user/<user_id>/sessions" \
  -H "Authorization: Bearer <access_token>"
```

---

## 📊 ตรวจสอบใน Database

### ดู Refresh Tokens
```sql
SELECT * FROM refresh_tokens ORDER BY created_at DESC;
```

### ตรวจสอบว่า Token เก่าถูกลบ
```sql
-- หลัง refresh ต้องเห็นแค่ token ใหม่
SELECT COUNT(*) FROM refresh_tokens WHERE user_id = '<user_id>';
```

### ดู Security Logs
```bash
# ดู log file
cat backend/logs/security.log | tail -50
```

---

## 🔧 Environment Variables ที่ต้องมี
```env
ACCESS_TOKEN_SECRET=your_access_secret
REFRESH_TOKEN_SECRET=your_refresh_secret
ACCESS_EXPIRES=15m
REFRESH_EXPIRES=7d
```

---

## ⚠️ หมายเหตุสำคัญ

1. **Token Rotation** - ทุกครั้งที่ refresh จะได้ refresh token ใหม่ ต้องเก็บไว้แทนตัวเก่า
2. **Token Reuse** - ถ้าใช้ refresh token เก่า = ถือว่าถูกขโมย = logout ทุก session
3. **Seamless UX** - Frontend จัดการ auto refresh ให้ user ไม่รู้สึกสะดุด
4. **Monitoring** - ทุก suspicious activity จะถูก log และสร้าง alert
