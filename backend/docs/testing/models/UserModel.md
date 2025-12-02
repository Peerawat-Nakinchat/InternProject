# UserModel Tests

## ภาพรวม

| Metric | Value |
|--------|-------|
| **File** | `src/models/UserModel.js` |
| **Test Files** | `UserModel.test.js`, `UserModel.esmock.test.js`, `UserModel.integration.test.js` |
| **Total Tests** | 110 |
| **Branch Coverage** | 69.69% ⚠️ |
| **Statement Coverage** | 82.92% ⚠️ |
| **Line Coverage** | 83.95% ⚠️ |

## คำอธิบาย Model

`UserModel` ใช้สำหรับจัดการข้อมูลผู้ใช้:
- สร้างและจัดการบัญชีผู้ใช้
- Authentication (email/password, OAuth)
- Password reset
- Profile management

---

## ⚠️ Lines ที่ไม่สามารถ Unit Test ได้

**Lines 52-137** ประกอบด้วย Sequelize validators และ hooks ที่ต้องใช้ real Sequelize instance:

### Validators (Lines 52-96)
- `sex.validate.isValidSex` - ตรวจสอบค่า M/F/O
- `profile_image_url.validate.isUrlOrEmpty` - ตรวจสอบ URL format
- `auth_provider.validate.isIn` - ตรวจสอบ local/google/facebook

### Hooks (Lines 127-137)
- `beforeCreate` - ตั้งค่า full_name จาก name + surname
- `beforeUpdate` - อัปเดต full_name เมื่อ name หรือ surname เปลี่ยน

**ทางแก้:** ใช้ Integration Tests กับ real database หรือ test validators logic โดยตรง (Pure Logic Tests)

---

## Methods และ Test Cases

### 1. `findById` - ค้นหา User ด้วย ID

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | พบ user | Return user without password_hash |
| 2 | ไม่พบ user | Return null |
| 3 | Include role association | Include role data |
| 4 | Exclude sensitive fields | Exclude password_hash, reset_token |

### 2. `findByEmail` - ค้นหาด้วย Email

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | พบ user (case insensitive) | Return user |
| 2 | Trim email whitespace | Trimmed before search |
| 3 | Include role association | Include role |

### 3. `findByEmailWithPassword` - ค้นหาพร้อม Password Hash

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | พบ user พร้อม password_hash | Return user with hash |
| 2 | สำหรับ authentication | Include password |

### 4. `create` - สร้าง User ใหม่

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | สร้าง user สำเร็จ | Return created user |
| 2 | สร้างด้วย transaction | Pass transaction |
| 3 | ใช้ default role_id 3 | Default role USER |
| 4 | สร้างพร้อมทุก fields | All fields saved |

### 5. `updatePassword` - อัปเดต Password

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | อัปเดต password และ clear reset tokens | Update and clear |
| 2 | อัปเดตด้วย transaction | Pass transaction |
| 3 | ตั้ง reset_token เป็น null | Clear token |
| 4 | ตั้ง reset_token_expire เป็น null | Clear expiry |

### 6. `setResetToken` - ตั้งค่า Reset Token

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | ตั้ง reset token และ expiration | Set both values |
| 2 | ตั้งด้วย transaction | Pass transaction |

### 7. `findByResetToken` - ค้นหาด้วย Reset Token

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | พบ user ด้วย valid token | Return user |
| 2 | ไม่พบ expired token | Return null |
| 3 | ไม่พบ non-existent token | Return null |
| 4 | Check token และ expiry | Both conditions |

### 8. `deactivateUser` - Deactivate User

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Deactivate user สำเร็จ | Return true |
| 2 | ไม่พบ user | Return false |

### 9. `activateUser` - Activate User

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Activate user สำเร็จ | Return true |
| 2 | ไม่พบ user | Return false |

### 10. `deleteUser` - ลบ User (Hard Delete)

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | ลบ user สำเร็จ | Return true |
| 2 | ไม่พบ user | Return false |
| 3 | ลบด้วย transaction | Pass transaction |

### 11. `search` - ค้นหา Users

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | ค้นหาด้วย default pagination | Return paginated |
| 2 | ค้นหาด้วย email (iLike) | Search by email |
| 3 | ค้นหาด้วย name ใน multiple fields | Search name, surname, full_name |
| 4 | Filter ด้วย role_id | Apply role filter |
| 5 | Filter ด้วย is_active | Apply active filter |

### 12. `count` - นับ Users

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | นับทั้งหมด | Return count |
| 2 | นับด้วย criteria | Apply criteria |

### 13. `isEmailTaken` - ตรวจสอบ Email ซ้ำ

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Email ถูกใช้แล้ว | Return true |
| 2 | Email ว่าง | Return false |
| 3 | Exclude specific user ID | Allow same email for self |

### 14. `bulkCreate` - สร้างหลาย Users

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | สร้างหลาย users | Return created users |
| 2 | Pass validate option | Validate all |

### 15. `updateRole` - อัปเดต Role

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | อัปเดต role สำเร็จ | Return true |
| 2 | ไม่พบ user | Return false |
| 3 | อัปเดตด้วย transaction | Pass transaction |

---

## Pure Logic Tests (Validators)

### sex validator - isValidSex

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Accept null | Not throw |
| 2 | Accept empty string | Not throw |
| 3 | Accept M (Male) | Not throw |
| 4 | Accept F (Female) | Not throw |
| 5 | Accept O (Other) | Not throw |
| 6 | Reject invalid value | Throw error |
| 7 | Reject lowercase m | Throw error |
| 8 | Reject lowercase f | Throw error |

### profile_image_url validator - isUrlOrEmpty

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Accept null | Not throw |
| 2 | Accept undefined | Not throw |
| 3 | Accept empty string | Not throw |
| 4 | Accept whitespace only | Not throw |
| 5 | Accept http URL | Not throw |
| 6 | Accept https URL | Not throw |
| 7 | Reject invalid URL | Throw error |
| 8 | Reject ftp URL | Throw error |
| 9 | Reject URL without protocol | Throw error |
| 10 | Reject file path | Throw error |

### auth_provider validator - isIn

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Accept local | Not throw |
| 2 | Accept google | Not throw |
| 3 | Accept facebook | Not throw |
| 4 | Reject invalid provider | Throw error |
| 5 | Reject uppercase LOCAL | Throw error |

---

## Pure Logic Tests (Hooks)

### beforeCreate hook

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Set full_name from name + surname | full_name set |
| 2 | Handle Thai names | Thai full_name |
| 3 | Not set when name missing | full_name undefined |
| 4 | Not set when surname missing | full_name undefined |
| 5 | Not set when both missing | full_name undefined |
| 6 | Not set when name is null | full_name undefined |
| 7 | Not set when name is empty string | full_name undefined |

### beforeUpdate hook

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Update full_name when name changes | full_name updated |
| 2 | Update full_name when surname changes | full_name updated |
| 3 | Update full_name when both change | full_name updated |
| 4 | Not update when neither changes | full_name not updated |
| 5 | Handle Thai name updates | Thai full_name |

---

## Integration Tests (ต้องมี Database)

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Email validator - valid email | Accept |
| 2 | Email validator - invalid email | Reject |
| 3 | Email validator - empty email | Reject |
| 4 | Email - convert to lowercase | Lowercase |
| 5 | Email - trim whitespace | Trimmed |
| 6 | Password validator - valid hash | Accept |
| 7 | Password validator - empty | Reject |
| 8 | Password validator - too short | Reject |
| 9 | Sex validator - accept M/F/O | Accept |
| 10 | Sex validator - reject invalid | Reject |
| 11 | Phone validator - accept valid | Accept |
| 12 | Phone validator - reject invalid | Reject |
| 13 | Hook beforeCreate - set full_name | Set |
| 14 | Hook beforeUpdate - update full_name | Update |
| 15 | Unique email constraint | Reject duplicate |
| 16 | Role association | Include role |

---

## วิธีรัน Tests

```bash
# รัน unit tests
npm test -- --coverage --collectCoverageFrom="src/models/UserModel.js" --testPathPattern="UserModel"

# รันเฉพาะ esmock tests
npm test -- --testPathPattern="UserModel.esmock"

# รัน integration tests (ต้องมี test database)
docker compose -f docker-compose.test.yml up -d
npm test -- --testPathPattern="UserModel.integration"
```

---

## Model Fields

| Field | Type | Description |
|-------|------|-------------|
| user_id | UUID | Primary key |
| email | STRING(255) | Email (unique, required) |
| password_hash | STRING(255) | Password hash (required) |
| name | STRING(100) | ชื่อ (required) |
| surname | STRING(100) | นามสกุล (required) |
| full_name | STRING(500) | ชื่อเต็ม (auto-generated) |
| sex | STRING(10) | เพศ: M/F/O |
| phone | STRING(20) | เบอร์โทร |
| user_address_1 | STRING(1000) | ที่อยู่บรรทัด 1 |
| user_address_2 | STRING(1000) | ที่อยู่บรรทัด 2 |
| user_address_3 | STRING(1000) | ที่อยู่บรรทัด 3 |
| profile_image_url | TEXT | URL รูปโปรไฟล์ |
| auth_provider | STRING(50) | Provider: local/google/facebook |
| provider_id | STRING(255) | OAuth provider ID |
| role_id | INTEGER | Role ของผู้ใช้ (FK) |
| is_active | BOOLEAN | สถานะ active |
| reset_token | STRING(255) | Token สำหรับ reset password |
| reset_token_expire | DATE | เวลาหมดอายุ reset token |
| created_at | DATE | เวลาที่สร้าง |
| updated_at | DATE | เวลาที่อัปเดต |

---

## Associations

| Association | Type | Target Model |
|-------------|------|--------------|
| role | belongsTo | Role |
| refreshTokens | hasMany | RefreshToken |
| ownedOrganizations | hasMany | Organization |
| organizations | belongsToMany | Organization (through OrganizationMember) |
