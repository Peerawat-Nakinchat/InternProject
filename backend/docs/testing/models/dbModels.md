# dbModels Tests

## ภาพรวม

| Metric | Value |
|--------|-------|
| **File** | `src/models/dbModels.js` |
| **Test Files** | `dbModels.test.js`, `dbModels.integration.test.js` |
| **Total Tests** | 45 |
| **Branch Coverage** | 0% ⚠️ |
| **Statement Coverage** | 59.25% ⚠️ |
| **Line Coverage** | 59.25% ⚠️ |

## คำอธิบาย Model

`dbModels.js` เป็นไฟล์หลักที่รวบรวม Models ทั้งหมดและตั้งค่า:
- Associations ระหว่าง Models
- Function สำหรับ sync database
- Function สำหรับ seed roles

---

## ⚠️ Lines ที่ไม่สามารถ Unit Test ได้

**Lines 87-96, 102-116** ประกอบด้วย functions ที่ต้องใช้ real database:

### syncDatabase (Lines 87-96)
```javascript
export async function syncDatabase(options = {}) {
  await sequelize.sync(options);
  await seedRoles();
}
```

### seedRoles (Lines 102-116)
```javascript
async function seedRoles() {
  const roles = [
    { role_id: 1, role_name: 'OWNER', ... },
    // ...
  ];
  for (const role of roles) {
    await Role.findOrCreate({ where: { role_id: role.role_id }, defaults: role });
  }
}
```

**ทางแก้:** ใช้ Integration Tests กับ real database

---

## Model Exports Tests

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Export User model | User defined |
| 2 | Export Role model | Role defined |
| 3 | Export Organization model | Organization defined |
| 4 | Export OrganizationMember model | OrganizationMember defined |
| 5 | Export RefreshToken model | RefreshToken defined |
| 6 | Export AuditLog model | AuditLog defined |
| 7 | Export Invitation model | Invitation defined |

---

## Associations Tests

### User <-> Role Associations

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | User belongsTo Role | Association defined |
| 2 | Role hasMany User | Association defined |
| 3 | Use 'role' alias for User belongsTo Role | Alias correct |
| 4 | Use 'users' alias for Role hasMany User | Alias correct |
| 5 | Use role_id as foreign key | FK correct |

### Organization <-> User (Owner) Associations

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Organization belongsTo User as owner | Association defined |
| 2 | User hasMany Organization as ownedOrganizations | Association defined |
| 3 | Use 'owner' alias | Alias correct |
| 4 | Use 'ownedOrganizations' alias | Alias correct |
| 5 | Use owner_user_id as foreign key | FK correct |

### Organization <-> User (Members) Many-to-Many

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Organization belongsToMany User through OrganizationMember | Association defined |
| 2 | User belongsToMany Organization through OrganizationMember | Association defined |
| 3 | Use 'members' alias | Alias correct |
| 4 | Use 'organizations' alias | Alias correct |
| 5 | Use OrganizationMember as through table | Through correct |

### OrganizationMember Associations

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | OrganizationMember belongsTo User | Association defined |
| 2 | OrganizationMember belongsTo Organization | Association defined |
| 3 | OrganizationMember belongsTo Role | Association defined |

### RefreshToken <-> User Associations

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | RefreshToken belongsTo User with CASCADE | Association defined |
| 2 | User hasMany RefreshToken with CASCADE | Association defined |
| 3 | Set CASCADE onDelete | onDelete: CASCADE |
| 4 | Use 'refreshTokens' alias | Alias correct |
| 5 | Use user_id as foreign key | FK correct |

### Invitation Associations

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Invitation belongsTo User as inviter | Association defined |
| 2 | Invitation belongsTo Organization | Association defined |
| 3 | Invitation belongsTo Role | Association defined |
| 4 | Use 'inviter' alias | Alias correct |
| 5 | Use invited_by as foreign key | FK correct |

---

## seedRoles Tests

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Seed OWNER role with id 1 | OWNER created |
| 2 | Seed ADMIN role with id 2 | ADMIN created |
| 3 | Seed USER role with id 3 | USER created |
| 4 | Seed VIEWER role with id 4 | VIEWER created |
| 5 | Seed AUDITOR role with id 5 | AUDITOR created |
| 6 | Handle existing roles without error | No error |
| 7 | Create all 5 roles | 5 roles total |
| 8 | Process roles in correct order | Order correct |
| 9 | Seed with correct role names | Names correct |
| 10 | Seed with correct role IDs | IDs correct |
| 11 | Use where clause with role_id | Where correct |

---

## Foreign Key Tests

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Use role_id as FK for User-Role | FK correct |
| 2 | Use owner_user_id as FK for Organization-Owner | FK correct |
| 3 | Use user_id as FK for RefreshToken-User | FK correct |
| 4 | Use invited_by as FK for Invitation-User | FK correct |

---

## Model Reference Tests

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Reference same User model in all associations | Same reference |
| 2 | Reference same Role model in all associations | Same reference |

---

## Integration Tests (ต้องมี Database)

### syncDatabase functionality

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Sync database schema successfully | No error |
| 2 | Create tables when sync is called | Tables created |
| 3 | Handle alter sync mode | No error |

### seedRoles functionality

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Seed OWNER role with id 1 | Created |
| 2 | Seed ADMIN role with id 2 | Created |
| 3 | Seed USER role with id 3 | Created |
| 4 | Seed VIEWER role with id 4 | Created |
| 5 | Seed AUDITOR role with id 5 | Created |
| 6 | Not duplicate roles when seeding multiple times | No duplicates |
| 7 | Create all 5 roles | 5 roles |
| 8 | Seed with correct is_active default | is_active: true |

### Database Connection

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Authenticate successfully | No error |
| 2 | Handle connection pool | Pool works |

### Transaction Support

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Support transactions | Transaction works |
| 2 | Rollback transaction on error | Rollback works |

---

## วิธีรัน Tests

```bash
# รัน unit tests
npm test -- --coverage --collectCoverageFrom="src/models/dbModels.js" --testPathPattern="dbModels"

# รัน integration tests (ต้องมี test database)
docker compose -f docker-compose.test.yml up -d
npm test -- --testPathPattern="dbModels.integration"
```

---

## Exported Items

| Export | Type | Description |
|--------|------|-------------|
| User | Model | User model |
| Role | Model | Role model |
| Organization | Model | Organization model |
| OrganizationMember | Model | Member join table |
| RefreshToken | Model | Refresh token model |
| AuditLog | Model | Audit log model |
| Invitation | Model | Invitation model |
| sequelize | Instance | Sequelize instance |
| syncDatabase | Function | Sync database และ seed roles |

---

## Association Diagram

```
┌─────────┐     belongs_to     ┌──────┐
│  User   │ ─────────────────► │ Role │
└────┬────┘                    └──────┘
     │                              ▲
     │ has_many                     │ belongs_to
     ▼                              │
┌──────────────┐              ┌─────────────────────┐
│ RefreshToken │              │ OrganizationMember  │
└──────────────┘              └─────────────────────┘
                                    ▲         ▲
     ┌──────────────────────────────┘         │
     │ belongs_to                  belongs_to │
     │                                        │
┌────┴────────┐                         ┌─────┴────┐
│ Organization│ ◄─────────────────────► │   User   │
└─────────────┘    belongs_to_many      └──────────┘
     │
     │ has_many
     ▼
┌────────────┐
│ Invitation │
└────────────┘
```
