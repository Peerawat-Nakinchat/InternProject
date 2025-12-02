# MemberController Tests

## ภาพรวม

| Metric | Value |
|--------|-------|
| **File** | `src/controllers/MemberController.js` |
| **Test File** | `__tests__/controllers/MemberController.coverage.test.js` |
| **Total Tests** | 27 |
| **Branch Coverage** | 100% |
| **Statement Coverage** | 100% |

## Factory Function

```javascript
export const createMemberController = (memberService = MemberService) => {
  // ... methods
  return { 
    listMembers, inviteMemberToCompany, changeMemberRole, 
    removeMember, transferOwner 
  };
};
```

---

## Methods และ Test Cases

### 1. `listMembers` (6 tests)

แสดงรายชื่อสมาชิกในองค์กร

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | List members with orgId from params | Return members list | 200 |
| 2 | List members using current_org_id (orgId not in params) | Return members list | 200 |
| 3 | orgId not provided (no current_org_id) | Return `orgId required` | 400 |
| 4 | req.user is undefined and no orgId | Return `orgId required` | 400 |
| 5 | Permission errors (message contains `สิทธิ์`) | Return forbidden | 403 |
| 6 | Server errors | Return server error | 500 |

**Branches Covered:**
- `req.params.orgId` → provided/not provided
- `req.user?.current_org_id` → exists/not exists
- `error.message.includes('สิทธิ์')` → true/false

---

### 2. `inviteMemberToCompany` (6 tests)

เชิญสมาชิกใหม่เข้าร่วมบริษัท

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Invite member successfully | Return new member | 201 |
| 2 | Use current_org_id when orgId not in params | Return new member | 201 |
| 3 | Permission errors (message contains `สิทธิ์`) | Return forbidden | 403 |
| 4 | Duplicate member (message contains `อยู่แล้ว`) | Return conflict | 409 |
| 5 | Validation errors (message contains `required`) | Return bad request | 400 |
| 6 | Server errors | Return server error | 500 |

**Branches Covered:**
- `req.params.orgId || req.user?.current_org_id` → both paths
- `error.message.includes('สิทธิ์')` → true/false
- `error.message.includes('อยู่แล้ว')` → true/false
- `error.message.includes('required')` → true/false

---

### 3. `changeMemberRole` (5 tests)

เปลี่ยนสิทธิ์ของสมาชิก

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Change role successfully | Return updated member | 200 |
| 2 | Use current_org_id when orgId not in params | Return updated member | 200 |
| 3 | Permission errors (message contains `สิทธิ์`) | Return forbidden | 403 |
| 4 | Member not found (message contains `ไม่พบ`) | Return not found | 404 |
| 5 | Server errors | Return server error | 500 |

**Branches Covered:**
- `error.message.includes('สิทธิ์')` → true/false
- `error.message.includes('ไม่พบ')` → true/false

---

### 4. `removeMember` (5 tests)

ลบสมาชิกออกจากองค์กร

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Remove member successfully | Return success message | 200 |
| 2 | Use current_org_id when orgId not in params | Return success message | 200 |
| 3 | Permission errors (message contains `สิทธิ์`) | Return forbidden | 403 |
| 4 | Member not found (message contains `ไม่พบ`) | Return not found | 404 |
| 5 | Server errors | Return server error | 500 |

---

### 5. `transferOwner` (5 tests)

โอนสิทธิ์เจ้าของให้สมาชิกอื่น

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Transfer owner successfully | Return success message | 200 |
| 2 | Use current_org_id when orgId not in params | Return success message | 200 |
| 3 | Permission errors (message contains `สิทธิ์`) | Return forbidden | 403 |
| 4 | OWNER restriction (message contains `OWNER`) | Return forbidden | 403 |
| 5 | Server errors | Return server error | 500 |

**Branches Covered:**
- `error.message.includes('สิทธิ์')` → true/false
- `error.message.includes('OWNER')` → true/false

---

## วิธีรัน Tests

```bash
# รัน coverage tests สำหรับ MemberController
npm run test -- --coverage --collectCoverageFrom="src/controllers/MemberController.js" __tests__/controllers/MemberController.coverage.test.js
```

## Mock Dependencies

```javascript
mockMemberService = {
  getMembers: jest.fn(),
  inviteMember: jest.fn(),
  changeMemberRole: jest.fn(),
  removeMember: jest.fn(),
  transferOwner: jest.fn()
};
```
