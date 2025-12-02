# Model Unit Tests Documentation

## ภาพรวม

เอกสารนี้อธิบายรายละเอียดของ Unit Tests สำหรับ Models ทั้งหมด 8 ไฟล์ ที่ใช้ **esmock Pattern** เพื่อ mock ES Modules และหลีกเลี่ยงการเชื่อมต่อ Database จริง

### ผลลัพธ์ Coverage รวม

| Model | Stmts | Branch | Funcs | Lines | Tests | หมายเหตุ |
|-------|-------|--------|-------|-------|-------|----------|
| AuditLogModel.js | 100% | 100% | 100% | 100% | 85 | ✅ ครบถ้วน |
| CompanyModel.js | 86.15% | 89.13% | 87.5% | 86.15% | 95 | ⚠️ getMemberCounts ต้องใช้ DB |
| InvitationModel.js | 100% | 100% | 100% | 100% | 76 | ✅ ครบถ้วน |
| MemberModel.js | 100% | 100% | 100% | 100% | 85 | ✅ ครบถ้วน |
| RoleModel.js | 100% | 100% | 100% | 100% | 120 | ✅ ครบถ้วน |
| TokenModel.js | 100% | 100% | 100% | 100% | 95 | ✅ ครบถ้วน |
| UserModel.js | 82.92% | 69.69% | 80.95% | 83.95% | 110 | ⚠️ Validators ต้องใช้ DB |
| dbModels.js | 59.25% | 0% | 0% | 59.25% | 45 | ⚠️ syncDatabase ต้องใช้ DB |
| **รวม** | **91.98%** | **88.84%** | **92.79%** | **91.87%** | **711** | |

---

## เอกสารแต่ละ Model

- [AuditLogModel Tests](./AuditLogModel.md)
- [CompanyModel Tests](./CompanyModel.md)
- [InvitationModel Tests](./InvitationModel.md)
- [MemberModel Tests](./MemberModel.md)
- [RoleModel Tests](./RoleModel.md)
- [TokenModel Tests](./TokenModel.md)
- [UserModel Tests](./UserModel.md)
- [dbModels Tests](./dbModels.md)

---

## วิธีการทดสอบ

### Pattern ที่ใช้: esmock (ES Module Mocking)

เนื่องจาก `dbConnection.js` จะเชื่อมต่อ Database ทันทีที่ import จึงใช้ `esmock` เพื่อ mock module ก่อนที่จะ import Model:

```javascript
import esmock from 'esmock';

// Mock sequelize.define เพื่อจับ model definition
const mockSequelize = {
  define: (tableName, attributes, options) => {
    capturedDefinition = attributes;
    capturedOptions = options;
    return MockModel;
  },
  Op: mockOp,
  literal: (sql) => ({ literal: sql }),
  fn: (name, col) => ({ fn: name, col }),
  col: (name) => ({ col: name }),
};

// Import Model ด้วย mocked dependencies
const module = await esmock('../../src/models/XxxModel.js', {
  '../../src/config/dbConnection.js': {
    default: mockSequelize,
  },
  'sequelize': {
    DataTypes: {
      UUID: 'UUID',
      STRING: (size) => `STRING(${size})`,
      // ...
    },
    Op: mockOp,
  },
});
```

### รูปแบบ Test Files

แต่ละ Model มี 2-3 ไฟล์ทดสอบ:

| ไฟล์ | วัตถุประสงค์ |
|------|-------------|
| `XxxModel.test.js` | Unit tests พื้นฐาน (mock-based) |
| `XxxModel.esmock.test.js` | Tests ด้วย esmock สำหรับ coverage |
| `XxxModel.integration.test.js` | Integration tests กับ Database จริง (optional) |

### การรัน Tests

```bash
# รัน coverage tests สำหรับ Models ทั้งหมด
npm test -- --coverage --collectCoverageFrom="src/models/**/*.js"

# รันเฉพาะ Model ที่ต้องการ
npm test -- --coverage --collectCoverageFrom="src/models/RoleModel.js" --testPathPattern="RoleModel"

# รัน esmock tests เท่านั้น
npm test -- --testPathPattern="esmock"

# รัน integration tests (ต้องมี test database)
npm test -- --testPathPattern="integration"
```

---

## โครงสร้างไฟล์

```
backend/
├── src/models/
│   ├── AuditLogModel.js     (Audit logging)
│   ├── CompanyModel.js      (Organization management)
│   ├── InvitationModel.js   (Invitation system)
│   ├── MemberModel.js       (Organization members)
│   ├── RoleModel.js         (Role-based access control)
│   ├── TokenModel.js        (Refresh token management)
│   ├── UserModel.js         (User accounts)
│   └── dbModels.js          (Model associations & sync)
│
├── __tests__/models/
│   ├── AuditLogModel.test.js
│   ├── AuditLogModel.esmock.test.js
│   ├── CompanyModel.test.js
│   ├── CompanyModel.esmock.test.js
│   ├── CompanyModel.integration.test.js
│   ├── InvitationModel.test.js
│   ├── InvitationModel.esmock.test.js
│   ├── MemberModel.test.js
│   ├── MemberModel.esmock.test.js
│   ├── RoleModel.test.js
│   ├── RoleModel.esmock.test.js
│   ├── RoleModel.pure.test.js
│   ├── TokenModel.test.js
│   ├── TokenModel.esmock.test.js
│   ├── UserModel.test.js
│   ├── UserModel.esmock.test.js
│   ├── UserModel.integration.test.js
│   ├── dbModels.test.js
│   └── dbModels.integration.test.js
│
└── docs/testing/models/
    ├── MODELS_TESTS_SUMMARY.md (ไฟล์นี้)
    ├── AuditLogModel.md
    ├── CompanyModel.md
    ├── InvitationModel.md
    ├── MemberModel.md
    ├── RoleModel.md
    ├── TokenModel.md
    ├── UserModel.md
    └── dbModels.md
```

---

## ข้อจำกัดของ Unit Tests

### Lines ที่ไม่สามารถ Unit Test ได้

บาง lines ต้องการ Database connection จริงจึงไม่สามารถ unit test ได้:

| Model | Lines | เหตุผล |
|-------|-------|--------|
| UserModel.js | 52-137 | Sequelize validators & hooks ต้องผ่าน real Sequelize instance |
| CompanyModel.js | 335-355 | `getMemberCounts` ใช้ `OrganizationMember.findAll` จริง |
| dbModels.js | 87-96, 102-116 | `syncDatabase` และ `seedRoles` ต้องเชื่อมต่อ Database |

### วิธีแก้ไข (สำหรับ Integration Tests)

สามารถใช้ `docker-compose.test.yml` เพื่อสร้าง test database:

```bash
# เริ่ม test database
docker compose -f docker-compose.test.yml up -d

# รัน integration tests
npm test -- --testPathPattern="integration"

# หยุด test database
docker compose -f docker-compose.test.yml down
```

---

## สรุป Coverage ตามประเภท

### ✅ Models ที่ได้ 100% Coverage

| Model | คำอธิบาย |
|-------|----------|
| AuditLogModel | บันทึก Audit logs สำหรับ security |
| InvitationModel | จัดการระบบเชิญเข้าองค์กร |
| MemberModel | จัดการสมาชิกในองค์กร |
| RoleModel | จัดการ roles และ permissions |
| TokenModel | จัดการ refresh tokens |

### ⚠️ Models ที่ต้องการ Integration Tests

| Model | Coverage | สิ่งที่ขาด |
|-------|----------|-----------|
| UserModel | 82.92% | Validators (email, sex, phone) และ Hooks |
| CompanyModel | 86.15% | `getMemberCounts` method |
| dbModels | 59.25% | `syncDatabase` และ `seedRoles` functions |

---

## หมายเหตุ

- Tests ทั้งหมดผ่าน **2,025 tests**
- ใช้ **Jest** เป็น Test Framework
- ใช้ **esmock** สำหรับ ES Module mocking
- รองรับ **ISO 27001** compliance สำหรับ security-related tests
