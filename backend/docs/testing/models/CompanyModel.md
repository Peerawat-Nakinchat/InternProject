# CompanyModel (OrganizationModel) Tests

## ภาพรวม

| Metric | Value |
|--------|-------|
| **File** | `src/models/CompanyModel.js` |
| **Test Files** | `CompanyModel.test.js`, `CompanyModel.esmock.test.js`, `CompanyModel.integration.test.js` |
| **Total Tests** | 95 |
| **Branch Coverage** | 89.13% |
| **Statement Coverage** | 86.15% |
| **Line Coverage** | 86.15% |

## คำอธิบาย Model

`CompanyModel` (หรือ `OrganizationModel`) ใช้สำหรับจัดการข้อมูลองค์กร/บริษัท:
- สร้างและจัดการองค์กร
- ค้นหาองค์กรของผู้ใช้
- นับจำนวนสมาชิกในองค์กร
- ตรวจสอบความเป็นเจ้าของ

---

## Methods และ Test Cases

### 1. `create` - สร้างองค์กรใหม่

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | สร้างองค์กรสำเร็จ | Return created organization |
| 2 | สร้างด้วย transaction | Pass transaction to create |
| 3 | กำหนด org_id อัตโนมัติ (UUID) | Generate UUID |
| 4 | ตั้งค่า org_integrate เป็น 'N' default | Use default value |

### 2. `findByPk` - ค้นหาด้วย Primary Key

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | พบองค์กร | Return organization |
| 2 | ไม่พบองค์กร | Return null |
| 3 | Include owner association | Include owner data |

### 3. `findOne` - ค้นหาด้วยเงื่อนไข

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | ค้นหาด้วย org_code | Return organization |
| 2 | ค้นหาด้วย owner_user_id | Return organization |
| 3 | ไม่พบ | Return null |

### 4. `findByOwner` - ค้นหาองค์กรที่เป็นเจ้าของ

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | ค้นหาองค์กรที่ผู้ใช้เป็นเจ้าของ | Return array of organizations |
| 2 | ไม่มีองค์กร | Return empty array |
| 3 | Filter ด้วย owner_user_id | Apply correct filter |

### 5. `findByMember` - ค้นหาองค์กรที่เป็นสมาชิก

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | ค้นหาองค์กรที่ผู้ใช้เป็นสมาชิก | Return organizations |
| 2 | ไม่มีองค์กร | Return empty array |
| 3 | Include through OrganizationMember | Use join table |

### 6. `findAll` - ค้นหาทั้งหมด

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | ค้นหาทุกองค์กร | Return all organizations |
| 2 | Filter ด้วย owner_user_id | Apply filter |
| 3 | Include owner and members | Include associations |

### 7. `getMemberCounts` - นับจำนวนสมาชิก ⚠️

**หมายเหตุ:** Method นี้ต้องใช้ Database จริง เนื่องจากใช้ `OrganizationMember.findAll` กับ `sequelize.fn`

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Function exists และเป็น async | Function is defined |
| 2 | Return empty map เมื่อไม่มี orgIds | Return {} |
| 3 | Return member counts สำหรับ specific orgIds | Return counts map |
| 4 | Return all org counts เมื่อ orgIds เป็น null | Return all counts |
| 5 | Return empty map เมื่อ orgIds เป็น empty array | Return {} |
| 6 | Convert member_count strings to numbers | Return numbers |

**Lines ที่ไม่ครอบคลุม:** 335-355 (ต้องใช้ Integration Test)

### 8. `isOwner` - ตรวจสอบความเป็นเจ้าของ

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | ผู้ใช้เป็นเจ้าของ | Return true |
| 2 | ผู้ใช้ไม่ใช่เจ้าของ | Return false |
| 3 | องค์กรไม่มีอยู่ | Return false |

### 9. `update` - อัปเดตข้อมูลองค์กร

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | อัปเดตสำเร็จ | Return updated organization |
| 2 | อัปเดตด้วย transaction | Pass transaction |
| 3 | อัปเดต org_name | Update name |
| 4 | อัปเดต org_code | Update code |

### 10. `destroy` - ลบองค์กร

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | ลบองค์กรสำเร็จ | Return deleted count |
| 2 | ลบด้วย transaction | Pass transaction |
| 3 | องค์กรไม่มีอยู่ | Return 0 |

### 11. `count` - นับจำนวนองค์กร

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | นับทั้งหมด | Return count |
| 2 | นับด้วย where clause | Apply filter |

### 12. `bulkCreate` - สร้างหลายองค์กร

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | สร้างหลายองค์กร | Return array |
| 2 | Validate ทุก records | Pass validate option |

---

## Model Definition Tests

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | org_id เป็น primary key | primaryKey: true |
| 2 | org_name required | allowNull: false |
| 3 | org_code unique | unique: true |
| 4 | owner_user_id required | allowNull: false |
| 5 | org_address fields nullable | allowNull: true |
| 6 | org_integrate default 'N' | defaultValue: 'N' |
| 7 | timestamps enabled | timestamps: true |
| 8 | tableName เป็น sys_organizations | tableName correct |

---

## Integration Tests (ต้องมี Database)

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | getMemberCounts returns empty map เมื่อไม่มีองค์กร | {} |
| 2 | getMemberCounts returns correct count สำหรับ single org | Correct count |
| 3 | getMemberCounts returns counts สำหรับ multiple orgs | Multiple counts |
| 4 | getMemberCounts returns all counts เมื่อ orgIds null | All org counts |
| 5 | getMemberCounts converts to number | typeof === 'number' |

---

## วิธีรัน Tests

```bash
# รัน unit tests
npm test -- --coverage --collectCoverageFrom="src/models/CompanyModel.js" --testPathPattern="CompanyModel"

# รัน esmock tests
npm test -- --testPathPattern="CompanyModel.esmock"

# รัน integration tests (ต้องมี test database)
docker compose -f docker-compose.test.yml up -d
npm test -- --testPathPattern="CompanyModel.integration"
```

---

## Model Fields

| Field | Type | Description |
|-------|------|-------------|
| org_id | UUID | Primary key |
| org_name | STRING(200) | ชื่อองค์กร (required) |
| org_code | STRING(50) | รหัสองค์กร (unique) |
| owner_user_id | UUID | เจ้าขององค์กร (required) |
| org_address_1 | STRING(1000) | ที่อยู่บรรทัดที่ 1 |
| org_address_2 | STRING(1000) | ที่อยู่บรรทัดที่ 2 |
| org_address_3 | STRING(1000) | ที่อยู่บรรทัดที่ 3 |
| org_integrate | STRING(1) | สถานะ integrate (default: 'N') |
| created_at | DATE | เวลาที่สร้าง |
| updated_at | DATE | เวลาที่อัปเดต |

---

## Associations

| Association | Type | Target Model |
|-------------|------|--------------|
| owner | belongsTo | User |
| members | belongsToMany | User (through OrganizationMember) |
