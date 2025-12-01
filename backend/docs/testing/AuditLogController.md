# AuditLogController Tests

## ภาพรวม

| Metric | Value |
|--------|-------|
| **File** | `src/controllers/AuditLogController.js` |
| **Test File** | `__tests__/controllers/AuditLogController.coverage.test.js` |
| **Total Tests** | 34 |
| **Branch Coverage** | 100% |
| **Statement Coverage** | 100% |

## Factory Function

```javascript
export const createAuditLogController = (auditLogService = AuditLogService) => {
  // ... methods
  return { 
    queryAuditLogs, getUserActivity, getMyActivity, getRecentActivity,
    getSecurityEvents, getFailedActions, getSuspiciousActivity, getStatistics,
    getCorrelatedActions, exportLogs, cleanupLogs 
  };
};
```

---

## Methods และ Test Cases

### 1. `queryAuditLogs` (4 tests)

ค้นหา audit logs ด้วย filters หลายตัว

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Query with all filters | Return filtered logs | 200 |
| 2 | Query with default options (no filters provided) | Return logs with defaults | 200 |
| 3 | Remove null/undefined filters | Call service without null values | 200 |
| 4 | Database error | Return server error | 500 |

**Supported Filters:**
- `user_id`, `user_email`, `action`, `target_type`, `target_id`
- `status`, `severity`, `category`, `organization_id`, `ip_address`
- `start_date`, `end_date`, `correlation_id`
- `page`, `limit`, `sort_by`, `sort_order`

---

### 2. `getUserActivity` (4 tests)

ดูประวัติการใช้งานของผู้ใช้

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Get own user activity | Return activity logs | 200 |
| 2 | Admin views other user activity | Return activity logs | 200 |
| 3 | Non-admin views other user (role_id ≠ 1) | Return forbidden error | 403 |
| 4 | Database error | Return server error | 500 |

**Branches Covered:**
- `userId !== req.user.user_id` → true/false
- `req.user.role_id === 1` (admin check) → true/false

---

### 3. `getMyActivity` (3 tests)

ดูประวัติการใช้งานของตัวเอง

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Get my activity with custom limit | Return activity logs | 200 |
| 2 | Get my activity with default limit (50) | Return activity logs | 200 |
| 3 | Database error | Return server error | 500 |

---

### 4. `getRecentActivity` (3 tests)

ดึงกิจกรรมล่าสุด

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Get recent activity with custom limit | Return activity logs | 200 |
| 2 | Get recent activity with default limit (100) | Return activity logs | 200 |
| 3 | Database error | Return server error | 500 |

---

### 5. `getSecurityEvents` (3 tests)

ดึง security events

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Get events with custom dates | Return security events | 200 |
| 2 | Get events with default dates (last 7 days) | Return security events | 200 |
| 3 | Database error | Return server error | 500 |

**Branches Covered:**
- `req.query.start_date` → provided/default
- `req.query.end_date` → provided/default

---

### 6. `getFailedActions` (3 tests)

ดึง failed actions

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Get failed actions with custom limit | Return failed actions | 200 |
| 2 | Get failed actions with default limit (100) | Return failed actions | 200 |
| 3 | Database error | Return server error | 500 |

---

### 7. `getSuspiciousActivity` (3 tests)

ดึงกิจกรรมน่าสงสัย

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Get suspicious activity with custom hours | Return suspicious data | 200 |
| 2 | Get suspicious activity with default (24 hours) | Return suspicious data | 200 |
| 3 | Database error | Return server error | 500 |

---

### 8. `getStatistics` (3 tests)

ดึงสถิติ audit logs

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Get statistics with custom dates | Return statistics | 200 |
| 2 | Get statistics with default dates (last 30 days) | Return statistics | 200 |
| 3 | Database error | Return server error | 500 |

---

### 9. `getCorrelatedActions` (2 tests)

ดึง actions ที่เกี่ยวข้องกันด้วย correlation ID

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Get correlated actions successfully | Return correlated logs | 200 |
| 2 | Database error | Return server error | 500 |

---

### 10. `exportLogs` (3 tests)

Export logs เป็น JSON file

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Export with all filters | Return JSON file with headers | 200 |
| 2 | Remove null/empty filters | Call service without null values | 200 |
| 3 | Database error | Return server error | 500 |

**Response Headers:**
- `Content-Type: application/json`
- `Content-Disposition: attachment; filename=audit-logs-{timestamp}.json`

---

### 11. `cleanupLogs` (3 tests)

ลบ logs เก่า

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Cleanup with custom retention days | Return deleted count | 200 |
| 2 | Cleanup with default retention (90 days) | Return deleted count | 200 |
| 3 | Database error | Return server error | 500 |

---

## วิธีรัน Tests

```bash
# รัน coverage tests สำหรับ AuditLogController
npm run test -- --coverage --collectCoverageFrom="src/controllers/AuditLogController.js" __tests__/controllers/AuditLogController.coverage.test.js
```

## Mock Dependencies

```javascript
mockAuditLogService = {
  query: jest.fn(),
  getUserActivity: jest.fn(),
  getRecentActivity: jest.fn(),
  getSecurityEvents: jest.fn(),
  getFailedActions: jest.fn(),
  getSuspiciousActivity: jest.fn(),
  getStatistics: jest.fn(),
  getCorrelatedActions: jest.fn(),
  exportLogs: jest.fn(),
  cleanup: jest.fn()
};
```
