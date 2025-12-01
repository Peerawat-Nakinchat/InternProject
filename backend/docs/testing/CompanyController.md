# CompanyController Tests

## ภาพรวม

| Metric | Value |
|--------|-------|
| **File** | `src/controllers/CompanyController.js` |
| **Test File** | `__tests__/controllers/CompanyController.coverage.test.js` |
| **Total Tests** | 25 |
| **Branch Coverage** | 100% |
| **Statement Coverage** | 100% |

## Factory Function

```javascript
export const createCompanyController = (companyService = CompanyService) => {
  // ... methods
  return { createCompany, getCompanyById, getUserCompanies, updateCompany, deleteCompany };
};
```

---

## Methods และ Test Cases

### 1. `createCompany` (8 tests)

สร้างบริษัทใหม่สำหรับผู้ใช้

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | user is null | Return `Unauthorized` | 401 |
| 2 | user exists but no user_id | Return `Unauthorized` | 401 |
| 3 | user_id is undefined | Return `Unauthorized` | 401 |
| 4 | Create company successfully | Return created company data | 201 |
| 5 | Duplicate company (error code 23505) | Return `Company already exists` | 409 |
| 6 | General errors with message | Return error message | 400 |
| 7 | Error message is empty | Return default message `เกิดข้อผิดพลาดในการสร้างบริษัท` | 400 |
| 8 | Error has no message property | Return default message | 400 |

**Branches Covered:**
- `!req.user` → true/false
- `!req.user.user_id` → true/false
- `error.code === '23505'` → true/false
- `error.message || 'default'` → both paths

---

### 2. `getCompanyById` (3 tests)

ดึงข้อมูลบริษัทด้วย orgId

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Get company successfully | Return company data | 200 |
| 2 | Company not found (message contains `ไม่พบ`) | Return not found error | 404 |
| 3 | Server errors (message doesn't contain `ไม่พบ`) | Return server error | 500 |

**Branches Covered:**
- `error.message.includes('ไม่พบ')` → true/false

---

### 3. `getUserCompanies` (5 tests)

ดึงรายการบริษัททั้งหมดของผู้ใช้

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | user is null | Return `Unauthorized` | 401 |
| 2 | user_id is missing | Return `Unauthorized` | 401 |
| 3 | user_id is undefined | Return `Unauthorized` | 401 |
| 4 | Get companies successfully | Return companies list | 200 |
| 5 | Server errors | Return default error message | 500 |

**Branches Covered:**
- `!req.user` → true/false
- `!req.user.user_id` → true/false

---

### 4. `updateCompany` (5 tests)

อัปเดตข้อมูลบริษัท

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Update company successfully | Return updated company | 200 |
| 2 | Duplicate company name (error code 23505) | Return duplicate error | 409 |
| 3 | Company not found (message contains `ไม่พบ`) | Return not found | 404 |
| 4 | User is not OWNER (message contains `OWNER`) | Return forbidden | 403 |
| 5 | Other server errors | Return server error | 500 |

**Branches Covered:**
- `error.code === '23505'` → true/false
- `error.message.includes('ไม่พบ')` → true/false
- `error.message.includes('OWNER')` → true/false

---

### 5. `deleteCompany` (4 tests)

ลบบริษัท

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Delete company successfully | Return success message | 200 |
| 2 | Company not found (message contains `ไม่พบ`) | Return not found | 404 |
| 3 | User is not OWNER (message contains `OWNER`) | Return forbidden | 403 |
| 4 | Other server errors | Return server error | 500 |

**Branches Covered:**
- `error.message.includes('ไม่พบ')` → true/false
- `error.message.includes('OWNER')` → true/false

---

## วิธีรัน Tests

```bash
# รัน coverage tests สำหรับ CompanyController
npm run test -- --coverage --collectCoverageFrom="src/controllers/CompanyController.js" __tests__/controllers/CompanyController.coverage.test.js
```

## Mock Dependencies

```javascript
mockCompanyService = {
  createCompany: jest.fn(),
  getCompanyById: jest.fn(),
  getUserCompanies: jest.fn(),
  updateCompany: jest.fn(),
  deleteCompany: jest.fn()
};
```
