# TokenModel (RefreshTokenModel) Tests

## ภาพรวม

| Metric | Value |
|--------|-------|
| **File** | `src/models/TokenModel.js` |
| **Test Files** | `TokenModel.test.js`, `TokenModel.esmock.test.js` |
| **Total Tests** | 95 |
| **Branch Coverage** | 100% |
| **Statement Coverage** | 100% |
| **Line Coverage** | 100% |

## คำอธิบาย Model

`TokenModel` (RefreshToken) ใช้สำหรับจัดการ Refresh Tokens:
- สร้างและเก็บ Refresh Tokens
- Hash tokens ด้วย SHA256
- ตรวจสอบความถูกต้องของ tokens
- จัดการ token expiration

---

## Methods และ Test Cases

### 1. `hashToken` - Hash Token ด้วย SHA256

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Hash token ด้วย SHA256 | Return hashed string |
| 2 | Consistent hash สำหรับ token เดียวกัน | Same hash |
| 3 | Different hashes สำหรับ tokens ต่างกัน | Different hashes |
| 4 | Throw error เมื่อ token เป็น null | Throw error |
| 5 | Throw error เมื่อ token เป็น undefined | Throw error |
| 6 | Throw error เมื่อ token เป็น empty string | Throw error |
| 7 | Hash very long tokens | Accept long tokens |
| 8 | Hash tokens with special characters | Handle special chars |
| 9 | Hash tokens with unicode characters | Handle unicode |

### 2. `create` - สร้าง Refresh Token

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | สร้าง refresh token สำเร็จ | Return created token |
| 2 | Throw error เมื่อ userId missing | Throw error |
| 3 | Throw error เมื่อ refreshToken missing | Throw error |
| 4 | Hash token ก่อนเก็บ | Store hashed token |
| 5 | สร้างด้วย transaction | Pass transaction |

### 3. `findValid` - ค้นหา Valid Token

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | พบ valid (non-expired) token | Return token |
| 2 | ไม่พบ expired token | Return null |
| 3 | ไม่พบ non-existent token | Return null |

### 4. `findByToken` - ค้นหาด้วย Token

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | พบ token (ไม่ check expiry) | Return token |
| 2 | ไม่พบ token | Return null |
| 3 | Hash token ก่อน query | Hash before search |

### 5. `findByPk` - ค้นหาด้วย ID

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | พบ token ด้วย ID | Return token with user |
| 2 | ไม่พบ token | Return null |

### 6. `deleteByToken` - ลบด้วย Token

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | ลบ token สำเร็จ | Return true |
| 2 | ไม่พบ token | Return false |
| 3 | Hash token ก่อน query | Hash before delete |

### 7. `deleteById` - ลบด้วย ID และ User

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | ลบ token สำเร็จ | Return true |
| 2 | ไม่พบ token | Return false |
| 3 | ไม่ลบถ้า user_id ไม่ตรง | Not delete |
| 4 | Include both token_id และ user_id ใน where | Both in clause |

### 8. `deleteAllByUser` - ลบ Tokens ทั้งหมดของ User

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | ลบทุก tokens ของ user | Return deleted count |
| 2 | ไม่มี tokens | Return 0 |
| 3 | Filter ด้วย user_id | Apply user filter |

### 9. `findByUser` - ค้นหา Tokens ของ User

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | พบ active tokens ของ user | Return tokens |
| 2 | ไม่พบ tokens | Return empty array |
| 3 | Filter ด้วย user_id และ non-expired | Apply both filters |

### 10. `deleteExpired` - ลบ Expired Tokens

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | ลบ expired tokens | Return deleted count |
| 2 | ไม่มี expired tokens | Return 0 |
| 3 | Filter ด้วย expired | Apply expiry filter |

### 11. `countByUser` - นับ Tokens ของ User

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | นับ active tokens | Return count |
| 2 | ไม่มี tokens | Return 0 |
| 3 | Filter ด้วย user_id และ non-expired | Apply filters |

### 12. `getTokenStats` - ดึงสถิติ Tokens

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | ดึงสถิติ (total, active, expired) | Return stats object |
| 2 | ไม่มี tokens | Return all zeros |
| 3 | All active tokens | Active = Total |
| 4 | All expired tokens | Expired = Total |

### 13. `findExpiringSoon` - ค้นหา Tokens ที่จะหมดอายุเร็วๆนี้

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | ค้นหา tokens ที่จะหมดใน 24 ชม. (default) | Return tokens |
| 2 | ค้นหาด้วย custom hours | Apply custom hours |
| 3 | ไม่พบ tokens | Return empty array |

### 14. `updateExpiration` - อัปเดตวันหมดอายุ

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | อัปเดต expiration สำเร็จ | Return true |
| 2 | ไม่พบ token | Return false |

### 15. `deleteMany` - ลบหลาย Tokens

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | ลบหลาย tokens ด้วย IDs | Return deleted count |
| 2 | ไม่พบ tokens | Return 0 |
| 3 | ใช้ Op.in สำหรับ token_id filter | Use in operator |

### 16. `count` - นับทั้งหมด

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | นับทั้งหมดเมื่อไม่มีเงื่อนไข | Return count |
| 2 | ไม่มี tokens | Return 0 |
| 3 | นับด้วย criteria | Apply criteria |

### 17. `exists` - ตรวจสอบการมีอยู่

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Token มีอยู่ | Return true |
| 2 | Token ไม่มี | Return false |
| 3 | Hash token ก่อน query | Hash before check |

---

## Edge Cases

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Handle tokens with very long expiration | Accept |
| 2 | Handle tokens with past expiration (already expired) | Accept |
| 3 | Handle concurrent token operations | All succeed |
| 4 | Handle unique constraint violation for refresh_token | Throw error |
| 5 | Handle foreign key constraint violation for user_id | Throw error |
| 6 | Handle null transaction gracefully | Accept null |

---

## Associations

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Include user association | Include user data |
| 2 | Support cascade delete when user is deleted | Cascade works |

---

## Security Tests

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Never store raw token | Always hash |
| 2 | Use consistent hashing for token comparison | Same algorithm |
| 3 | Not expose token hash in error messages | No hash in errors |

---

## วิธีรัน Tests

```bash
# รัน tests ทั้งหมดสำหรับ TokenModel
npm test -- --coverage --collectCoverageFrom="src/models/TokenModel.js" --testPathPattern="TokenModel"

# รันเฉพาะ esmock tests
npm test -- --testPathPattern="TokenModel.esmock"
```

---

## Model Fields

| Field | Type | Description |
|-------|------|-------------|
| token_id | UUID | Primary key |
| user_id | UUID | ผู้ใช้ (required, FK) |
| refresh_token | STRING(255) | Token hash (unique, required) |
| expires_at | DATE | เวลาหมดอายุ (required) |
| created_at | DATE | เวลาที่สร้าง |
| updated_at | DATE | เวลาที่อัปเดต |

---

## Associations

| Association | Type | Target Model | Options |
|-------------|------|--------------|---------|
| user | belongsTo | User | onDelete: CASCADE |

---

## Security Notes

- **Token Hashing:** ใช้ SHA256 hash ทุก token ก่อนเก็บ
- **Never Store Raw:** ไม่เก็บ raw token ใน database
- **Cascade Delete:** เมื่อลบ user จะลบ tokens ทั้งหมด
