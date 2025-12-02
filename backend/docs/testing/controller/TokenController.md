# TokenController Tests

## ภาพรวม

| Metric | Value |
|--------|-------|
| **File** | `src/controllers/TokenController.js` |
| **Test File** | `__tests__/controllers/TokenController.coverage.test.js` |
| **Total Tests** | 5 |
| **Branch Coverage** | 100% |
| **Statement Coverage** | 100% |

## Factory Function

```javascript
export const createTokenController = ({
  userModel = User,
  tokenGenerator = generateAccessToken
} = {}) => {
  // ... methods
  return { createNewAccessToken };
};
```

---

## Methods และ Test Cases

### 1. `createNewAccessToken` (5 tests)

สร้าง access token ใหม่

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Create token successfully | Return new access token | 200 |
| 2 | User not found (null) | Return `ไม่พบผู้ใช้งาน` | 404 |
| 3 | User not found (undefined) | Return `ไม่พบผู้ใช้งาน` | 404 |
| 4 | Database error | Return generic error message | 500 |
| 5 | Token generator throws error | Return generic error message | 500 |

**Branches Covered:**
- `!user` → null/undefined
- Success path → return token
- Error path → catch block

---

## Flow ของ Method

```
┌─────────────────────────────────────────────────┐
│           createNewAccessToken                  │
├─────────────────────────────────────────────────┤
│ 1. รับ refreshUserId จาก req                     │
│ 2. ค้นหา user ด้วย userModel.findByPk()          │
│ 3. ถ้าไม่พบ user → return 404                    │
│ 4. สร้าง token ด้วย tokenGenerator()             │
│ 5. Return accessToken                           │
│ 6. ถ้า error → return 500                       │
└─────────────────────────────────────────────────┘
```

---

## วิธีรัน Tests

```bash
# รัน coverage tests สำหรับ TokenController
npm run test -- --coverage --collectCoverageFrom="src/controllers/TokenController.js" __tests__/controllers/TokenController.coverage.test.js
```

## Mock Dependencies

```javascript
// Mock User model
mockUserModel = {
  findByPk: jest.fn()
};

// Mock token generator function
mockTokenGenerator = jest.fn();
```

---

## Request/Response Format

### Request

```javascript
req = {
  refreshUserId: 'user-123'  // จาก middleware ที่ verify refresh token
};
```

### Response - Success

```javascript
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Response - User Not Found

```javascript
{
  "success": false,
  "error": "ไม่พบผู้ใช้งาน"
}
```

### Response - Server Error

```javascript
{
  "success": false,
  "error": "เกิดข้อผิดพลาดในการออก access token ใหม่"
}
```

---

## Dependency Injection Benefits

การใช้ DI pattern ช่วยให้:

1. **ทดสอบได้ง่าย** - inject mock dependencies โดยไม่ต้อง mock import
2. **ไม่ต้องเชื่อมต่อ Database** - mock User model แทน
3. **ไม่ต้องสร้าง real tokens** - mock tokenGenerator
4. **Backward compatible** - ใช้ default parameters
