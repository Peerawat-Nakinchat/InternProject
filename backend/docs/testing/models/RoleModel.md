# RoleModel Tests

## ภาพรวม

| Metric | Value |
|--------|-------|
| **File** | `src/models/RoleModel.js` |
| **Test Files** | `RoleModel.test.js`, `RoleModel.esmock.test.js`, `RoleModel.pure.test.js` |
| **Total Tests** | 120 |
| **Branch Coverage** | 100% |
| **Statement Coverage** | 100% |
| **Line Coverage** | 100% |

## คำอธิบาย Model

`RoleModel` ใช้สำหรับจัดการ Role-Based Access Control (RBAC):
- กำหนด Roles (OWNER, ADMIN, USER, VIEWER, AUDITOR)
- จัดการ Permissions สำหรับแต่ละ Role
- เปรียบเทียบ Role hierarchy
- ตรวจสอบสิทธิ์

---

## Constants

### ROLES

| Role | ID | Level | Permissions |
|------|----|-------|-------------|
| OWNER | 1 | 5 | manage_users, manage_roles, create, read, update, delete_own, system_config |
| ADMIN | 2 | 4 | manage_users, create, read, update, delete_own |
| USER | 3 | 3 | create, read, update, delete_own |
| VIEWER | 4 | 1 | read |
| AUDITOR | 5 | 2 | read, audit, view_logs |

---

## Static Methods และ Test Cases

### 1. `hasPermission` - ตรวจสอบสิทธิ์

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | OWNER has manage_roles | Return true |
| 2 | OWNER has system_config | Return true |
| 3 | ADMIN lacks system_config | Return false |
| 4 | ADMIN has manage_users | Return true |
| 5 | USER lacks manage_users | Return false |
| 6 | USER has delete_own | Return true |
| 7 | VIEWER has read | Return true |
| 8 | VIEWER lacks create | Return false |
| 9 | AUDITOR has audit | Return true |
| 10 | AUDITOR has view_logs | Return true |
| 11 | Unknown role | Return false |
| 12 | Unknown permission | Return false |

### 2. `isHigherThan` - เปรียบเทียบ Role สูงกว่า

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | OWNER > ADMIN | Return true |
| 2 | OWNER > USER | Return true |
| 3 | OWNER > VIEWER | Return true |
| 4 | ADMIN > USER | Return true |
| 5 | USER > VIEWER | Return true |
| 6 | USER < ADMIN | Return false |
| 7 | OWNER = OWNER | Return false |
| 8 | VIEWER < OWNER | Return false |
| 9 | Unknown first role (level 0) | Return false |
| 10 | Unknown second role (level 0) | Return true (if known > 0) |
| 11 | Both unknown | Return false |

### 3. `isHigherOrEqual` - เปรียบเทียบ Role สูงกว่าหรือเท่ากับ

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | OWNER >= ADMIN | Return true |
| 2 | OWNER = OWNER | Return true |
| 3 | USER < ADMIN | Return false |
| 4 | OWNER >= VIEWER | Return true |
| 5 | Unknown = Unknown | Return true (0 >= 0) |
| 6 | Known >= Unknown | Return true |

### 4. `getPermissions` - ดึง Permissions ของ Role

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | OWNER permissions | Return 7 permissions |
| 2 | ADMIN permissions | Return 5 permissions |
| 3 | USER permissions | Return 4 permissions |
| 4 | VIEWER permissions | Return 1 permission |
| 5 | AUDITOR permissions | Return 3 permissions |
| 6 | Unknown role | Return empty array |
| 7 | null | Return empty array |
| 8 | undefined | Return empty array |

### 5. `isOwner` - ตรวจสอบว่าเป็น OWNER

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | OWNER | Return true |
| 2 | ADMIN | Return false |
| 3 | USER | Return false |
| 4 | VIEWER | Return false |
| 5 | AUDITOR | Return false |
| 6 | Unknown | Return false |

### 6. `isAdminOrHigher` - ตรวจสอบว่าเป็น ADMIN หรือสูงกว่า

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | OWNER | Return true |
| 2 | ADMIN | Return true |
| 3 | USER | Return false |
| 4 | VIEWER | Return false |
| 5 | AUDITOR | Return false |
| 6 | Unknown | Return false |

### 7. `getDefaultRole` - ดึง Default Role

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Get default role | Return 'USER' |

### 8. `getRoleHierarchy` - ดึงลำดับ Role

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Return sorted roles | [OWNER, ADMIN, USER, AUDITOR, VIEWER] |
| 2 | VIEWER เป็นต่ำสุด | Last in array |
| 3 | Include all 5 roles | Length = 5 |

### 9. `isValidRole` - ตรวจสอบ Role ถูกต้อง

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | OWNER | Return true |
| 2 | ADMIN | Return true |
| 3 | USER | Return true |
| 4 | VIEWER | Return true |
| 5 | AUDITOR | Return true |
| 6 | INVALID | Return false |
| 7 | Empty string | Return false |
| 8 | null | Return false |
| 9 | undefined | Return false |
| 10 | Lowercase 'owner' | Return false |
| 11 | Mixed case 'Owner' | Return false |

### 10. `getPermissionsByRoleName` - ดึง Permissions ด้วยชื่อ

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | OWNER | Return 7 permissions |
| 2 | ADMIN | Return 5 permissions |
| 3 | USER | Return 4 permissions |
| 4 | VIEWER | Return 1 permission |
| 5 | AUDITOR | Return 3 permissions |
| 6 | Invalid role | Return empty array |

### 11. `compareRoles` - เปรียบเทียบ 2 Roles

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | OWNER vs ADMIN | Return 1 (higher) |
| 2 | OWNER vs USER | Return 1 |
| 3 | OWNER vs VIEWER | Return 1 |
| 4 | USER vs ADMIN | Return -1 (lower) |
| 5 | VIEWER vs OWNER | Return -1 |
| 6 | OWNER vs OWNER | Return 0 (equal) |
| 7 | Unknown first role | Return based on level 0 |
| 8 | Unknown second role | Return based on level 0 |
| 9 | Both unknown | Return 0 |

---

## Instance Methods

### `toSafeJSON` - แปลงเป็น Safe JSON

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | OWNER structure | Correct structure with permissions |
| 2 | ADMIN permissions | Correct admin permissions |
| 3 | USER permissions | Correct user permissions |
| 4 | VIEWER permissions | Correct viewer permissions |
| 5 | Handle inactive role | Include is_active: false |
| 6 | Handle unknown role | Return empty permissions |

---

## Model Definition Tests

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | role_id เป็น primary key | primaryKey: true |
| 2 | role_name required | allowNull: false |
| 3 | role_name unique | unique: true |
| 4 | is_active default true | defaultValue: true |
| 5 | tableName เป็น sys_role | tableName correct |

---

## Constants Validation

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | 5 roles defined | ROLES has 5 entries |
| 2 | Permissions for all roles | All roles have permissions |
| 3 | Hierarchy levels for all roles | All have levels |
| 4 | Unique hierarchy levels | No duplicates |
| 5 | OWNER has highest hierarchy | Level 5 |
| 6 | VIEWER has lowest hierarchy | Level 1 |
| 7 | OWNER has system_config | Includes permission |
| 8 | OWNER has manage_roles | Includes permission |
| 9 | ADMIN lacks system_config | Doesn't include |
| 10 | ADMIN lacks manage_roles | Doesn't include |

---

## วิธีรัน Tests

```bash
# รัน tests ทั้งหมดสำหรับ RoleModel
npm test -- --coverage --collectCoverageFrom="src/models/RoleModel.js" --testPathPattern="RoleModel"

# รันเฉพาะ pure function tests
npm test -- --testPathPattern="RoleModel.pure"

# รันเฉพาะ esmock tests
npm test -- --testPathPattern="RoleModel.esmock"
```

---

## Model Fields

| Field | Type | Description |
|-------|------|-------------|
| role_id | INTEGER | Primary key (auto increment) |
| role_name | STRING(50) | ชื่อ role (unique, required) |
| description | STRING(255) | คำอธิบาย |
| is_active | BOOLEAN | สถานะ active (default: true) |
| created_at | DATE | เวลาที่สร้าง |
| updated_at | DATE | เวลาที่อัปเดต |

---

## Associations

| Association | Type | Target Model |
|-------------|------|--------------|
| users | hasMany | User |
