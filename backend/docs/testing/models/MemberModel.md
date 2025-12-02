# MemberModel (OrganizationMember) Tests

## ภาพรวม

| Metric | Value |
|--------|-------|
| **File** | `src/models/MemberModel.js` |
| **Test Files** | `MemberModel.test.js`, `MemberModel.esmock.test.js` |
| **Total Tests** | 85 |
| **Branch Coverage** | 100% |
| **Statement Coverage** | 100% |
| **Line Coverage** | 100% |

## คำอธิบาย Model

`MemberModel` (OrganizationMember) ใช้สำหรับจัดการสมาชิกในองค์กร:
- เพิ่ม/ลบสมาชิก
- อัปเดต role ของสมาชิก
- ค้นหาสมาชิกในองค์กร
- ตรวจสอบการมีอยู่ของสมาชิก

---

## Methods และ Test Cases

### 1. `create` - เพิ่มสมาชิกใหม่

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | สร้างสมาชิกด้วย camelCase data | Return created member |
| 2 | สร้างสมาชิกด้วย snake_case data | Return created member |
| 3 | Convert roleId เป็น number | roleId as number |
| 4 | สร้างด้วย transaction | Pass transaction |
| 5 | Upsert on conflict | Use findOrCreate |

### 2. `findOne` - ค้นหาสมาชิก

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | ค้นหาด้วย org_id และ user_id | Return member |
| 2 | ไม่พบสมาชิก | Return null |
| 3 | Include associations | Include user, role |

### 3. `exists` - ตรวจสอบการมีอยู่

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | สมาชิกมีอยู่ | Return true |
| 2 | สมาชิกไม่มีอยู่ | Return false |

### 4. `getRole` - ดึง role ของสมาชิก

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | พบสมาชิก | Return role_id |
| 2 | ไม่พบสมาชิก | Return null |

### 5. `findByOrganization` - ค้นหาสมาชิกในองค์กร

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | ค้นหาทุกสมาชิกในองค์กร | Return all members |
| 2 | Filter ด้วย role_id | Apply role filter |
| 3 | ไม่ส่ง role_id filter | No role filter |
| 4 | ไม่มีสมาชิก | Return empty array |

### 6. `findByUser` - ค้นหาสมาชิกภาพของผู้ใช้

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | ค้นหาทุกสมาชิกภาพ | Return memberships |
| 2 | ไม่มีสมาชิกภาพ | Return empty array |

### 7. `updateRole` - อัปเดต role

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | อัปเดต role สำเร็จ | Return updated member |
| 2 | อัปเดตด้วย transaction | Pass transaction |
| 3 | ไม่พบสมาชิก | Return null |

### 8. `remove` - ลบสมาชิก

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | ลบสมาชิกสำเร็จ | Return true |
| 2 | ไม่พบสมาชิก | Return false |
| 3 | ลบด้วย transaction | Pass transaction |

### 9. `removeAllByOrganization` - ลบทุกสมาชิกในองค์กร

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | ลบทุกสมาชิก | Return deleted count |
| 2 | ไม่มีสมาชิก | Return 0 |

### 10. `bulkRemove` - ลบหลายสมาชิก

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | ลบหลายสมาชิก | Return deleted count |
| 2 | ไม่พบสมาชิก | Return 0 |

### 11. `countByOrganization` - นับสมาชิกในองค์กร

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | นับสมาชิก | Return count |
| 2 | ไม่มีสมาชิก | Return 0 |

### 12. `findByOrganizationPaginated` - ค้นหาแบบ Paginated

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Apply role_id filter | Filter by role |
| 2 | ไม่มี role_id filter | No role filter |
| 3 | Apply search filter | Search in user fields |
| 4 | Return paginated results | Return with pagination |

### 13. `findByRole` - ค้นหาด้วย Role

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | ค้นหาสมาชิกด้วย role | Return members |
| 2 | ไม่มีสมาชิกด้วย role นี้ | Return empty array |

### 14. `countByRole` - นับสมาชิกด้วย Role

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | นับสมาชิกด้วย role | Return count |
| 2 | ไม่มีสมาชิก | Return 0 |

### 15. `getRoleDistribution` - ดึงการกระจาย Role

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | ดึงการกระจาย role | Return distribution object |
| 2 | ไม่มีสมาชิก | Return empty object |

### 16. `bulkCreate` - สร้างหลายสมาชิก

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | สร้างหลายสมาชิก | Return created members |
| 2 | Pass validate option | Validate all |

### 17. `findByMembershipId` - ค้นหาด้วย Membership ID

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | พบด้วย membership ID | Return member |
| 2 | ไม่พบ | Return null |
| 3 | Include all associations | Include user, org, role |

---

## Model Definition Tests

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | membership_id เป็น primary key | primaryKey: true |
| 2 | user_id field exists | Field defined |
| 3 | role_id field พร้อม validation | Validate 1-5 |
| 4 | unique constraint on org_id + user_id | Unique constraint |
| 5 | tableName เป็น sys_organization_members | tableName correct |

---

## Validation Tests

### role_id validation

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Accept valid role_id (1-5) | Accept |
| 2 | Reject invalid role_id | Reject |
| 3 | Reject role_id = 0 | Reject |
| 4 | Reject negative role_id | Reject |

### user_id validation

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Require user_id | Required field |

---

## Edge Cases

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Handle role_id as string | Convert to number |
| 2 | Handle foreign key constraint violation | Throw error |
| 3 | Include user association | Include user data |
| 4 | Include role association | Include role data |
| 5 | Handle null transaction | Accept null |

---

## วิธีรัน Tests

```bash
# รัน tests ทั้งหมดสำหรับ MemberModel
npm test -- --coverage --collectCoverageFrom="src/models/MemberModel.js" --testPathPattern="MemberModel"

# รันเฉพาะ esmock tests
npm test -- --testPathPattern="MemberModel.esmock"
```

---

## Model Fields

| Field | Type | Description |
|-------|------|-------------|
| membership_id | UUID | Primary key |
| org_id | UUID | องค์กร (required) |
| user_id | UUID | ผู้ใช้ (required) |
| role_id | INTEGER | Role ในองค์กร (1-5) |
| created_at | DATE | เวลาที่เข้าร่วม |
| updated_at | DATE | เวลาที่อัปเดต |

---

## Associations

| Association | Type | Target Model |
|-------------|------|--------------|
| user | belongsTo | User |
| organization | belongsTo | Organization |
| role | belongsTo | Role |

---

## Indexes

| Index | Fields | Type |
|-------|--------|------|
| org_user_unique | org_id, user_id | Unique |
