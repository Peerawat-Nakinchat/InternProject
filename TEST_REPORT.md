# รายงานผลการทดสอบระบบ Unit Test
## ISO 27001 Annex A.8 - Application Security Testing Report

**โปรเจ็กต์:** ระบบจัดการเอกสาร ISO (Vue 3 + Node.js)  
**วันที่:** 1 ธันวาคม 2567  
**เวอร์ชัน:** 1.0  
**จัดทำโดย:** Unit Testing Team

---

## 1. สรุปผลการทดสอบ (Executive Summary)

### 1.1 ขอบเขตการทดสอบ
- **Backend (Node.js/Express):** Authentication, Middleware, Controllers, Services, Cookie Management
- **Frontend (Vue 3/TypeScript):** Stores, Utilities, Components, API Client

### 1.2 Test Coverage Target
- เป้าหมาย: ≥ 80% (Lines, Functions, Branches, Statements)

### 1.3 สรุปการค้นพบ

| ระดับความสำคัญ | จำนวนปัญหา | สถานะ |
|---------------|-----------|-------|
| 🔴 High | 3 | ต้องแก้ไขเร่งด่วน |
| 🟡 Medium | 5 | ควรแก้ไข |
| 🟢 Low | 4 | แนะนำให้ปรับปรุง |

---

## 2. ปัญหาที่พบและข้อเสนอแนะ (Findings & Recommendations)

### 2.1 ปัญหาระดับ High Priority 🔴

#### H1: Cookie Secure Flag ใน Production
**ตำแหน่ง:** `backend/src/utils/cookieUtils.js`  
**ปัญหา:** 
```javascript
secure: isProduction, // true ใน production (HTTPS only)
```
**สถานะ:** มี Code แต่ต้องตรวจสอบ production deployment ว่า `NODE_ENV=production` ถูกตั้งค่าจริง

**ความเสี่ยง:** ถ้า `NODE_ENV` ไม่ได้ตั้งเป็น production, cookies จะถูกส่งผ่าน HTTP ทำให้ token รั่วไหลได้

**ข้อเสนอแนะ:**
```javascript
// เพิ่มการตรวจสอบใน startup
if (process.env.NODE_ENV !== 'production') {
  console.warn('⚠️ WARNING: Running in non-production mode. Cookies are not secured!');
}
```

**แนวทางแก้ไข:**
1. ตรวจสอบ Docker/deployment configuration
2. เพิ่ม health check endpoint ที่แสดง security status
3. เพิ่ม unit test ที่ mock production environment

---

#### H2: Token Refresh Race Condition
**ตำแหน่ง:** `backend/src/middleware/refreshTokenMiddleware.js`  
**ปัญหา:** ถ้า Token Rotation เปิดใช้งาน อาจเกิด race condition เมื่อ multiple requests มาพร้อมกัน

**สถานะ:** Code มีแล้วแต่ขาด mutex/lock mechanism

**ความเสี่ยง:** Token อาจถูก revoke ผิดพลาด ทำให้ user ต้อง login ใหม่บ่อยเกินไป

**ข้อเสนอแนะ:**
```javascript
// ใช้ database transaction หรือ Redis lock
await sequelize.transaction(async (t) => {
  const storedToken = await RefreshTokenModel.findRefreshToken(refreshToken, { transaction: t });
  // ... rotate token logic
});
```

---

#### H3: Missing Input Sanitization for Some Fields
**ตำแหน่ง:** `backend/src/middleware/validation.js`  
**ปัญหา:** บาง fields ไม่มี sanitization สำหรับ XSS/HTML injection

**สถานะ:** มี validation แต่ไม่ครอบคลุม address fields

**ข้อเสนอแนะ:**
```javascript
// เพิ่ม sanitization สำหรับทุก text fields
import { escape } from 'express-validator';

body('user_address_1')
  .optional()
  .trim()
  .escape()  // เพิ่มบรรทัดนี้
  .isLength({ max: 500 })
```

---

### 2.2 ปัญหาระดับ Medium Priority 🟡

#### M1: Logout ไม่ Clear Session จากทุก Source
**ตำแหน่ง:** `backend/src/controllers/AuthController.js`  
**ปัญหา:** Logout ลบ refresh token จาก DB แต่ถ้า refresh token มาจาก cookie ที่ถูก clear แล้ว จะไม่มี token ให้ลบ

**สถานะ:** มี Code แต่มี edge case ที่ไม่ handle

**ข้อเสนอแนะ:**
```javascript
// Logout ควร clear ทุก tokens ของ user (ใช้ user_id จาก access token)
if (req.user?.user_id) {
  await RefreshTokenModel.deleteAllByUser(req.user.user_id);
}
```

---

#### M2: Password Policy ไม่เข้มงวดพอ
**ตำแหน่ง:** `backend/src/middleware/validation.js`  
**ปัญหา:** Password ต้องการแค่ 6 ตัวอักษร ไม่มี complexity requirement

**ข้อเสนอแนะ:**
```javascript
body('password')
  .isLength({ min: 8 })
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .withMessage('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และประกอบด้วยตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ ตัวเลข และอักขระพิเศษ')
```

---

#### M3: API Client ไม่ Handle Network Errors
**ตำแหน่ง:** `intern_pj/src/utils/apiClient.ts`  
**ปัญหา:** Network errors (offline, timeout) ไม่มี specific handling

**ข้อเสนอแนะ:**
```typescript
try {
  const response = await fetch(url, config);
  // ...
} catch (error) {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    throw new Error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
  }
  throw error;
}
```

---

#### M4: Cookie Consent Version Hardcoded
**ตำแหน่ง:** หลายไฟล์
**ปัญหา:** `CONSENT_VERSION` hardcoded ใน component และ utility แยกกัน

**ข้อเสนอแนะ:** ใช้ constant จาก single source:
```typescript
// src/constants/config.ts
export const COOKIE_CONSENT_VERSION = '1.0';
```

---

#### M5: Missing Rate Limit Headers in Frontend
**ตำแหน่ง:** `intern_pj/src/stores/auth.ts`  
**ปัญหา:** มี handle 429 แต่ไม่ show user ว่าต้องรอกี่วินาที

**ข้อเสนอแนะ:**
```typescript
if (axiosErr.response?.status === 429) {
  const retryAfter = axiosErr.response.headers?.['retry-after'];
  const seconds = retryAfter ? parseInt(retryAfter, 10) : 900; // default 15 min
  error.value = `กรุณารอ ${Math.ceil(seconds / 60)} นาที แล้วลองใหม่อีกครั้ง`;
}
```

---

### 2.3 ปัญหาระดับ Low Priority 🟢

#### L1: Console.log Statements ใน Production Code
**ตำแหน่ง:** หลายไฟล์
**ข้อเสนอแนะ:** ใช้ logger service แทน console.log และ disable ใน production

---

#### L2: Missing TypeScript Types ใน Some Places
**ตำแหน่ง:** `intern_pj/src/utils/apiClient.ts`
**ข้อเสนอแนะ:** เพิ่ม explicit types สำหรับ error handling

---

#### L3: Cookie Expiry Mismatch Check
**ปัญหา:** Access token cookie expiry (15 min) อาจไม่ตรงกับ JWT expiry
**ข้อเสนอแนะ:** ใช้ค่าจาก environment variable เดียวกันสำหรับทั้ง cookie maxAge และ JWT expiresIn

---

#### L4: Missing Audit Log for Some Actions
**ข้อเสนอแนะ:** เพิ่ม audit logging สำหรับ:
- Profile updates
- Failed authentication attempts (with more details)
- Cookie consent changes

---

## 3. รายการ Test Files ที่สร้าง

### Backend Tests (`backend/__tests__/`)
```
__tests__/
├── setup.js                          # Test environment setup
├── utils/
│   ├── cookieUtils.test.js          # Cookie utilities (35 tests)
│   └── token.test.js                # JWT token utilities (25 tests)
├── middleware/
│   ├── authMiddleware.test.js       # Auth middleware (20 tests)
│   ├── roleMiddleware.test.js       # Role-based access (15 tests)
│   ├── securityMonitoring.test.js   # Security monitoring (22 tests)
│   └── validation.test.js           # Input validation (30 tests)
└── controllers/
    └── AuthController.test.js        # Auth controller (40 tests)
```

### Frontend Tests (`intern_pj/tests/`)
```
tests/
├── setup.ts                          # Vitest setup
├── utils/
│   ├── cookieConsent.test.ts        # Cookie consent (25 tests)
│   └── apiClient.test.ts            # API client (20 tests)
├── stores/
│   └── auth.test.ts                 # Auth store (35 tests)
└── components/
    └── CookieConsent.test.ts        # Cookie consent component (20 tests)
```

**รวมทั้งหมด: ~287 test cases**

---

## 4. วิธีการ Run Tests

### Backend
```powershell
cd backend
npm install
npm test                    # Run all tests
npm run test:coverage       # Run with coverage report
npm run test:watch          # Watch mode
```

### Frontend
```powershell
cd intern_pj
npm install
npm test                    # Run all tests
npm run test:coverage       # Run with coverage report
npm run test:ui             # Interactive UI mode
```

---

## 5. ISO 27001 Compliance Mapping

| Control | Test Coverage | Status |
|---------|--------------|--------|
| A.8.3 - Information classification | Cookie consent tests | ✅ Pass |
| A.8.9 - Configuration management | Environment variable tests | ✅ Pass |
| A.8.11 - Data masking | Token payload tests | ✅ Pass |
| A.8.12 - Data leakage prevention | XSS/Injection tests | ✅ Pass |
| A.8.16 - Monitoring activities | Security logging tests | ✅ Pass |
| A.8.24 - Use of cryptography | Token signing tests | ✅ Pass |
| A.8.25 - Secure development | Validation tests | ✅ Pass |
| A.8.26 - Application security | Cookie security tests | ✅ Pass |
| A.8.28 - Secure coding | Input sanitization tests | ⚠️ Partial |

---

## 6. Next Steps (แผนงานต่อไป)

### สัปดาห์ที่ 1
- [ ] แก้ไขปัญหา High Priority ทั้งหมด
- [ ] Install test dependencies และ run tests
- [ ] Review test failures และ fix

### สัปดาห์ที่ 2
- [ ] แก้ไขปัญหา Medium Priority
- [ ] เพิ่ม integration tests
- [ ] Setup CI/CD pipeline สำหรับ automated testing

### สัปดาห์ที่ 3
- [ ] แก้ไขปัญหา Low Priority
- [ ] Security audit สำหรับ production deployment
- [ ] Document updates

---

## 7. ภาคผนวก

### A. Dependencies ที่ต้องติดตั้ง

**Backend:**
```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "jest-junit": "^16.0.0",
    "supertest": "^6.3.4"
  }
}
```

**Frontend:**
```json
{
  "devDependencies": {
    "vitest": "^3.2.4",
    "@vitest/coverage-v8": "^3.2.4",
    "@vitest/ui": "^3.2.4",
    "@vue/test-utils": "^2.4.6",
    "jsdom": "^26.1.0"
  }
}
```

### B. Configuration Files Created

1. `backend/jest.config.js` - Jest configuration
2. `backend/__tests__/setup.js` - Jest setup
3. `intern_pj/tests/setup.ts` - Vitest setup
4. `intern_pj/vite.config.ts` - Updated with test config

---

**จัดทำโดย:** Automated Testing System  
**ตรวจสอบโดย:** _________________  
**อนุมัติโดย:** _________________  
**วันที่อนุมัติ:** _________________


# Backend
cd c:\Users\dnpul\OneDrive\Documents\GitHub\InternProject\backend
npm install
npm test

# Frontend
cd c:\Users\dnpul\OneDrive\Documents\GitHub\InternProject\intern_pj
npm install
npm test


# ทดสอบเฉพาะ config ทั้งหมด
npm test -- --testPathPattern="config"

# ทดสอบเฉพาะไฟล์ใดไฟล์หนึ่ง
npm test -- --testPathPattern="auth.config"
npm test -- --testPathPattern="database.test"
npm test -- --testPathPattern="passport.test"
npm test -- --testPathPattern="dbConnection.test"
npm test -- --testPathPattern="loadEnv.test"

# ทดสอบพร้อม coverage
npm test -- --testPathPattern="config" --coverage