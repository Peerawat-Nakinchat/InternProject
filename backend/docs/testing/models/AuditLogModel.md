# AuditLogModel Tests

## ภาพรวม

| Metric | Value |
|--------|-------|
| **File** | `src/models/AuditLogModel.js` |
| **Test Files** | `AuditLogModel.test.js`, `AuditLogModel.esmock.test.js` |
| **Total Tests** | 85 |
| **Branch Coverage** | 100% |
| **Statement Coverage** | 100% |
| **Line Coverage** | 100% |

## คำอธิบาย Model

`AuditLogModel` ใช้สำหรับบันทึก audit logs ของระบบ รองรับ:
- บันทึกการกระทำของผู้ใช้
- ติดตาม security events
- รายงานกิจกรรมที่ล้มเหลว
- สถิติการใช้งาน

---

## Methods และ Test Cases

### 1. `create` - สร้าง Audit Log Entry

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | สร้าง audit log สำเร็จ | Return created log |
| 2 | สร้างด้วย transaction | Pass transaction to create |
| 3 | รองรับ null user_id สำหรับ system actions | Allow null user_id |
| 4 | ตั้งค่า default status เป็น SUCCESS | Use default status |
| 5 | ตั้งค่า default severity เป็น INFO | Use default severity |

### 2. `bulkCreate` - สร้างหลาย Logs พร้อมกัน

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | สร้างหลาย audit logs | Return array of logs |
| 2 | สร้างด้วย transaction | Pass transaction |
| 3 | Validate ทุก records | Pass validate option |

### 3. `findById` - ค้นหา Log ด้วย ID

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | พบ audit log | Return log object |
| 2 | ไม่พบ audit log | Return null |

### 4. `query` - ค้นหาด้วย Filters

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Query ด้วย default pagination | Return paginated results |
| 2 | Filter ด้วย user_id | Apply user_id filter |
| 3 | Filter ด้วย user_email (iLike) | Apply iLike search |
| 4 | Filter ด้วย single action | Apply action filter |
| 5 | Filter ด้วย multiple actions (array) | Apply Op.in filter |
| 6 | Filter ด้วย target_type | Apply target_type filter |
| 7 | Filter ด้วย target_id | Apply target_id filter |
| 8 | Filter ด้วย target_table | Apply target_table filter |
| 9 | Filter ด้วย status | Apply status filter |
| 10 | Filter ด้วย severity | Apply severity filter |
| 11 | Filter ด้วย category | Apply category filter |
| 12 | Filter ด้วย organization_id | Apply organization_id filter |
| 13 | Filter ด้วย ip_address | Apply ip_address filter |
| 14 | Filter ด้วย startDate only | Apply gte filter |
| 15 | Filter ด้วย endDate only | Apply lte filter |
| 16 | Filter ด้วย both startDate และ endDate | Apply range filter |
| 17 | Filter ด้วย correlation_id | Apply correlation_id filter |
| 18 | Custom pagination | Apply custom page/limit |
| 19 | Custom sorting | Apply custom sortBy/sortOrder |
| 20 | คำนวณ totalPages ถูกต้อง | Calculate correct pages |

### 5. `findByUser` - ค้นหา Logs ของผู้ใช้

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | ค้นหาด้วย default limit | Return with default limit |
| 2 | ค้นหาด้วย custom limit | Return with custom limit |
| 3 | เรียงลำดับด้วย created_at DESC | Order by DESC |

### 6. `findRecent` - ค้นหา Logs ล่าสุด

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | ค้นหาด้วย default limit 100 | Return 100 logs |
| 2 | ค้นหาด้วย custom limit | Return custom limit logs |

### 7. `findSecurityEvents` - ค้นหา Security Events

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | ค้นหา security events ในช่วงวันที่ | Return security events |
| 2 | เรียงลำดับด้วย created_at DESC | Order by DESC |
| 3 | ใช้ custom limit | Apply custom limit |

### 8. `findFailedActions` - ค้นหาการกระทำที่ล้มเหลว

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | ค้นหา failed และ error actions | Return failed actions |
| 2 | เรียงลำดับด้วย created_at DESC | Order by DESC |

### 9. `deleteOldLogs` - ลบ Logs เก่า

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | ลบ logs เก่ากว่า 90 วัน (default) | Delete old logs |
| 2 | ลบด้วย custom retention period | Apply custom days |
| 3 | ลบด้วย transaction | Pass transaction |
| 4 | Return 0 เมื่อไม่มี logs เก่า | Return 0 |

### 10. `getStats` - ดึงสถิติ

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | ดึงสถิติไม่มีช่วงวันที่ | Return all stats |
| 2 | ดึงสถิติด้วยช่วงวันที่ | Apply date range |
| 3 | ดึง byAction statistics | Return action stats |
| 4 | ดึง byStatus statistics | Return status stats |
| 5 | ดึง bySeverity statistics | Return severity stats |
| 6 | ดึง byCategory statistics | Return category stats |
| 7 | Handle Promise.all สำหรับ parallel queries | Execute in parallel |

### 11. `count` - นับจำนวน Logs

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | นับทั้งหมดเมื่อไม่มีเงื่อนไข | Return total count |
| 2 | นับด้วยเงื่อนไขเฉพาะ | Apply criteria |

---

## Edge Cases และ Error Handling

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Handle empty result sets | Return empty array |
| 2 | Handle null values ใน JSONB fields | Allow null |
| 3 | Handle empty tags array | Accept empty array |
| 4 | Handle null tags | Accept null |
| 5 | Handle IPv6 addresses | Store correctly |
| 6 | Handle very long user agent strings | Store correctly |
| 7 | Handle large JSONB data | Store correctly |
| 8 | Throw error on database connection failure | Throw error |
| 9 | Throw validation error for missing action | Throw validation error |
| 10 | Handle transaction rollback on error | Rollback properly |

---

## วิธีรัน Tests

```bash
# รัน tests ทั้งหมดสำหรับ AuditLogModel
npm test -- --coverage --collectCoverageFrom="src/models/AuditLogModel.js" --testPathPattern="AuditLogModel"

# รันเฉพาะ esmock tests
npm test -- --testPathPattern="AuditLogModel.esmock"
```

---

## Model Fields

| Field | Type | Description |
|-------|------|-------------|
| log_id | UUID | Primary key |
| user_id | UUID | ผู้ใช้ที่ทำ action (nullable) |
| user_email | STRING | Email ของผู้ใช้ |
| action | STRING | ประเภท action (required) |
| target_type | STRING | ประเภท target |
| target_id | STRING | ID ของ target |
| target_table | STRING | ตารางที่เกี่ยวข้อง |
| status | STRING | SUCCESS, FAILED, ERROR |
| severity | STRING | INFO, WARNING, ERROR, CRITICAL |
| category | STRING | หมวดหมู่ของ action |
| ip_address | STRING | IP ของผู้ใช้ |
| user_agent | TEXT | Browser user agent |
| request_data | JSONB | ข้อมูล request |
| response_data | JSONB | ข้อมูล response |
| old_values | JSONB | ค่าเดิมก่อนเปลี่ยน |
| new_values | JSONB | ค่าใหม่หลังเปลี่ยน |
| correlation_id | STRING | ID สำหรับ trace request |
| organization_id | UUID | องค์กรที่เกี่ยวข้อง |
| tags | ARRAY | Tags สำหรับ filter |
| created_at | DATE | เวลาที่สร้าง |
