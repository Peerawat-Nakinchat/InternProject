# InvitationController Tests

## ภาพรวม

| Metric | Value |
|--------|-------|
| **File** | `src/controllers/InvitationController.js` |
| **Test File** | `__tests__/controllers/InvitationController.coverage.test.js` |
| **Total Tests** | 27 |
| **Branch Coverage** | 100% |
| **Statement Coverage** | 100% |

## Factory Function

```javascript
export const createInvitationController = (invitationService = InvitationService) => {
  // ... methods
  return { 
    sendInvitation, getInvitationInfo, acceptInvitation, 
    cancelInvitation, resendInvitation, getOrganizationInvitations 
  };
};
```

---

## Methods และ Test Cases

### 1. `sendInvitation` (5 tests)

ส่งคำเชิญเข้าร่วมองค์กร

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Send invitation successfully | Return success result | 200 |
| 2 | Validation errors (message contains `กรุณากรอก`) | Return validation error | 400 |
| 3 | Duplicate errors (message contains `อยู่แล้ว`) | Return duplicate error | 400 |
| 4 | Server errors | Return server error | 500 |
| 5 | Error message is empty | Return default `Internal server error` | 500 |

**Branches Covered:**
- `error.message.includes('กรุณากรอก')` → true/false
- `error.message.includes('อยู่แล้ว')` → true/false
- `error.message || 'Internal server error'` → both paths

---

### 2. `getInvitationInfo` (5 tests)

ดึงข้อมูลคำเชิญด้วย token

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Get invitation info successfully | Return invitation info | 200 |
| 2 | Invalid token | Return invalid token error | 400 |
| 3 | Expired token | Return expired token error | 400 |
| 4 | Server errors | Return server error | 500 |
| 5 | Error message is empty | Return default message | 500 |

**Branches Covered:**
- `error.message.includes('Invalid')` → true/false
- `error.message.includes('expired')` → true/false
- `error.message || 'Internal server error'` → both paths

---

### 3. `acceptInvitation` (6 tests)

ยอมรับคำเชิญเข้าร่วมองค์กร

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Accept invitation successfully | Return success result | 200 |
| 2 | Invalid token | Return invalid token error | 400 |
| 3 | Expired token | Return expired token error | 400 |
| 4 | Already member (message contains `อยู่แล้ว`) | Return already member error | 400 |
| 5 | Server errors | Return server error | 500 |
| 6 | Error message is empty | Return default message | 500 |

**Branches Covered:**
- `error.message.includes('Invalid')` → true/false
- `error.message.includes('expired')` → true/false
- `error.message.includes('อยู่แล้ว')` → true/false

---

### 4. `cancelInvitation` (3 tests)

ยกเลิกคำเชิญ

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Cancel invitation successfully | Return success result | 200 |
| 2 | Server errors | Return error message | 500 |
| 3 | Error message is empty | Return default message | 500 |

---

### 5. `resendInvitation` (5 tests)

ส่งคำเชิญซ้ำ

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Resend invitation successfully | Return success result | 200 |
| 2 | Validation errors (message contains `กรุณากรอก`) | Return validation error | 400 |
| 3 | Duplicate errors (message contains `อยู่แล้ว`) | Return duplicate error | 400 |
| 4 | Server errors | Return server error | 500 |
| 5 | Error message is empty | Return default message | 500 |

---

### 6. `getOrganizationInvitations` (3 tests)

ดึงรายการคำเชิญทั้งหมดขององค์กร

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Get invitations successfully | Return invitations list | 200 |
| 2 | Server errors | Return error message | 500 |
| 3 | Error message is empty | Return default message | 500 |

---

## วิธีรัน Tests

```bash
# รัน coverage tests สำหรับ InvitationController
npm run test -- --coverage --collectCoverageFrom="src/controllers/InvitationController.js" __tests__/controllers/InvitationController.coverage.test.js
```

## Mock Dependencies

```javascript
mockInvitationService = {
  sendInvitation: jest.fn(),
  getInvitationInfo: jest.fn(),
  acceptInvitation: jest.fn(),
  cancelInvitation: jest.fn(),
  resendInvitation: jest.fn(),
  getOrganizationInvitations: jest.fn()
};
```
