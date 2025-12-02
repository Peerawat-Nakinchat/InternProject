# InvitationModel Tests

## ภาพรวม

| Metric | Value |
|--------|-------|
| **File** | `src/models/InvitationModel.js` |
| **Test Files** | `InvitationModel.test.js`, `InvitationModel.esmock.test.js` |
| **Total Tests** | 76 |
| **Branch Coverage** | 100% |
| **Statement Coverage** | 100% |
| **Line Coverage** | 100% |

## คำอธิบาย Model

`InvitationModel` ใช้สำหรับจัดการระบบเชิญผู้ใช้เข้าองค์กร:
- สร้างคำเชิญใหม่
- ตรวจสอบสถานะคำเชิญ
- อัปเดตสถานะ (accepted, rejected, expired, cancelled)
- จัดการคำเชิญที่หมดอายุ

---

## Methods และ Test Cases

### 1. `create` - สร้างคำเชิญใหม่

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | สร้างคำเชิญสำเร็จ | Return created invitation |
| 2 | สร้างด้วย transaction | Pass transaction to create |
| 3 | ตั้งค่า default status เป็น pending | Use default status |
| 4 | Reject email ที่ไม่ถูกต้อง | Throw validation error |
| 5 | Reject duplicate token | Throw unique constraint error |

### 2. `findByToken` - ค้นหาด้วย Token

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | พบคำเชิญด้วย token | Return invitation |
| 2 | ไม่พบ token | Return null |
| 3 | พบคำเชิญ pending status | Return invitation with pending |
| 4 | พบคำเชิญ accepted status | Return invitation with accepted |
| 5 | พบคำเชิญ rejected status | Return invitation with rejected |
| 6 | พบคำเชิญ expired status | Return invitation with expired |
| 7 | พบคำเชิญ cancelled status | Return invitation with cancelled |
| 8 | Handle database error | Throw error |

### 3. `findByEmail` - ค้นหาด้วย Email

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | ค้นหา pending invitations ด้วย email | Return pending invitations |
| 2 | ค้นหาด้วย email และ org_id | Apply both filters |
| 3 | ไม่พบ pending invitations | Return empty array |
| 4 | คืนเฉพาะ pending status | Only return pending |
| 5 | Handle database error | Throw error |

### 4. `updateStatus` - อัปเดตสถานะ

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | อัปเดตเป็น accepted และตั้ง accepted_at | Update with accepted_at |
| 2 | อัปเดตเป็น rejected (ไม่ตั้ง accepted_at) | Update without accepted_at |
| 3 | อัปเดตเป็น expired | Update to expired |
| 4 | อัปเดตเป็น cancelled | Update to cancelled |
| 5 | อัปเดตด้วย transaction | Pass transaction |
| 6 | ไม่พบ invitation | Return [0] |
| 7 | Handle database error | Throw error |
| 8 | Handle invalid status value | Throw error |

### 5. `findPendingByOrg` - ค้นหา Pending Invitations ขององค์กร

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | ค้นหา pending invitations สำหรับ org | Return pending invitations |
| 2 | Filter out expired invitations | Only non-expired |
| 3 | คืนเฉพาะ pending status | Only return pending |
| 4 | ไม่พบ pending invitations | Return empty array |
| 5 | Handle database error | Throw error |

### 6. `expireOldInvitations` - ทำให้คำเชิญเก่าหมดอายุ

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Expire old pending invitations | Update to expired |
| 2 | ไม่มี invitations ให้ expire | Return [0] |
| 3 | อัปเดตเฉพาะ pending status | Only update pending |
| 4 | Handle database error | Throw error |
| 5 | อัปเดตหลาย invitations พร้อมกัน | Update multiple |

### 7. `deleteById` - ลบคำเชิญ

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | ลบ invitation สำเร็จ | Return 1 |
| 2 | ลบด้วย transaction | Pass transaction |
| 3 | ไม่พบ invitation | Return 0 |
| 4 | Handle database error | Throw error |
| 5 | Handle connection timeout | Throw error |
| 6 | Handle foreign key constraint error | Throw error |

---

## Edge Cases

### Status Transitions

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | pending → accepted | Allow transition |
| 2 | pending → rejected | Allow transition |

### UUID Handling

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Handle valid UUID สำหรับ invitation_id | Accept UUID |

### Role ID Handling

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Handle role_id เป็น 1 (Owner) | Accept role_id 1 |
| 2 | Handle role_id เป็น 5 (Auditor) | Accept role_id 5 |

### Token Uniqueness

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Reject duplicate token | Throw unique error |
| 2 | Find exact token match | Find by exact token |

### Concurrent Operations

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Handle multiple concurrent findByEmail | All succeed |
| 2 | Handle concurrent status updates | All succeed |

### Error Recovery

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Properly propagate database errors | Throw original error |
| 2 | Handle timeout errors | Throw timeout error |

---

## Model Definition Tests

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | invitation_id เป็น primary key | primaryKey: true |
| 2 | role_id field exists | Field defined |
| 3 | token unique | unique: true |
| 4 | timestamps enabled | timestamps: true |
| 5 | tableName เป็น sys_invitations | tableName correct |

---

## วิธีรัน Tests

```bash
# รัน tests ทั้งหมดสำหรับ InvitationModel
npm test -- --coverage --collectCoverageFrom="src/models/InvitationModel.js" --testPathPattern="InvitationModel"

# รันเฉพาะ esmock tests
npm test -- --testPathPattern="InvitationModel.esmock"
```

---

## Model Fields

| Field | Type | Description |
|-------|------|-------------|
| invitation_id | UUID | Primary key |
| org_id | UUID | องค์กรที่เชิญ (required) |
| email | STRING(255) | Email ผู้ถูกเชิญ (required) |
| role_id | INTEGER | Role ที่จะได้รับ (required) |
| token | STRING(255) | Token สำหรับยืนยัน (unique) |
| status | STRING(20) | สถานะ: pending, accepted, rejected, expired, cancelled |
| invited_by | UUID | ผู้เชิญ (required) |
| expires_at | DATE | เวลาหมดอายุ |
| accepted_at | DATE | เวลาที่ยอมรับ |
| created_at | DATE | เวลาที่สร้าง |
| updated_at | DATE | เวลาที่อัปเดต |

---

## Indexes

| Index | Fields | Type |
|-------|--------|------|
| email_idx | email | Normal |
| org_id_idx | org_id | Normal |
| status_idx | status | Normal |
| token_unique | token | Unique |
