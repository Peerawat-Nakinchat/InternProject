# Controller Unit Tests Documentation

## ภาพรวม

เอกสารนี้อธิบายรายละเอียดของ Unit Tests สำหรับ Controllers ทั้งหมด 6 ตัว ที่ใช้ **Dependency Injection Pattern** เพื่อให้ได้ **Branch Coverage 90%+**

### ผลลัพธ์ Coverage รวม

| Controller | Stmts | Branch | Funcs | Lines | Tests |
|------------|-------|--------|-------|-------|-------|
| AuditLogController.js | 100% | 100% | 100% | 100% | 34 |
| AuthController.js | 100% | 90.12% | 100% | 100% | 50 |
| CompanyController.js | 100% | 100% | 100% | 100% | 25 |
| InvitationController.js | 100% | 100% | 100% | 100% | 27 |
| MemberController.js | 100% | 100% | 100% | 100% | 27 |
| TokenController.js | 100% | 100% | 100% | 100% | 5 |
| **รวม** | **100%** | **96.39%** | **100%** | **100%** | **168** |

---

## เอกสารแต่ละ Controller

- [CompanyController Tests](./CompanyController.md)
- [InvitationController Tests](./InvitationController.md)
- [MemberController Tests](./MemberController.md)
- [AuditLogController Tests](./AuditLogController.md)
- [AuthController Tests](./AuthController.md)
- [TokenController Tests](./TokenController.md)

---

## วิธีการทดสอบ

### Pattern ที่ใช้: Dependency Injection

```javascript
// Controller Factory Pattern
export const createXxxController = (service = RealService) => {
  const method = async (req, res) => {
    // ใช้ service ที่ inject เข้ามา
  };
  return { method };
};

// ใน Test
const mockService = { method: jest.fn() };
const controller = createXxxController(mockService);
```

### การรัน Tests

```bash
# รัน coverage tests ทั้งหมด
npm run test -- --coverage --testPathPattern="controllers.*coverage"

# รันเฉพาะ controller ที่ต้องการ
npm run test -- --coverage --collectCoverageFrom="src/controllers/CompanyController.js" __tests__/controllers/CompanyController.coverage.test.js
```

---

## โครงสร้างไฟล์

```
backend/
├── src/controllers/
│   ├── AuditLogController.js    (refactored with DI)
│   ├── AuthController.js        (refactored with DI)
│   ├── CompanyController.js     (refactored with DI)
│   ├── InvitationController.js  (refactored with DI)
│   ├── MemberController.js      (refactored with DI)
│   └── TokenController.js       (refactored with DI)
│
├── __tests__/controllers/
│   ├── AuditLogController.coverage.test.js
│   ├── AuthController.coverage.test.js
│   ├── CompanyController.coverage.test.js
│   ├── InvitationController.coverage.test.js
│   ├── MemberController.coverage.test.js
│   └── TokenController.coverage.test.js
│
└── docs/testing/
    ├── CONTROLLER_TESTS_SUMMARY.md (this file)
    ├── CompanyController.md
    ├── InvitationController.md
    ├── MemberController.md
    ├── AuditLogController.md
    ├── AuthController.md
    └── TokenController.md
```
