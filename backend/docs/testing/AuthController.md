# AuthController Tests

## ภาพรวม

| Metric | Value |
|--------|-------|
| **File** | `src/controllers/AuthController.js` |
| **Test File** | `__tests__/controllers/AuthController.coverage.test.js` |
| **Total Tests** | 50 |
| **Branch Coverage** | 90.12% |
| **Statement Coverage** | 100% |

## Factory Function

```javascript
export const createAuthController = ({
  service = AuthService,
  logger = securityLogger,
  security = securityMonitoring,
  cookies = cookieUtils
} = {}) => {
  // ... methods
  return { 
    registerUser, loginUser, refreshToken, getProfile,
    forgotPassword, verifyResetToken, resetPassword,
    changeEmail, changePassword, updateProfile,
    logoutUser, logoutAllUser, googleAuthCallback 
  };
};
```

---

## Methods และ Test Cases

### 1. `registerUser` (6 tests)

ลงทะเบียนผู้ใช้ใหม่

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Register successfully with clientInfo | Return user data | 201 |
| 2 | Register with empty clientInfo (fallback to req.ip) | Return user data | 201 |
| 3 | Register with undefined clientInfo | Return user data | 201 |
| 4 | USER_EXISTS error with clientInfo | Log failed registration | 400 |
| 5 | USER_EXISTS error with empty clientInfo | Use fallback IP/UA | 400 |
| 6 | Non-USER_EXISTS errors | No failed log | 500 |

**Branches Covered:**
- `req.clientInfo?.ipAddress` → exists/fallback to req.ip
- `req.clientInfo?.userAgent` → exists/fallback to req.headers['user-agent']
- `error.code === 'USER_EXISTS'` → true/false

---

### 2. `loginUser` (4 tests)

เข้าสู่ระบบ

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Login successfully with clientInfo | Set cookies, log success | 200 |
| 2 | Login with empty clientInfo (fallback) | Use req.ip | 200 |
| 3 | Invalid credentials with clientInfo | Log failed, record failed login | 401 |
| 4 | Invalid credentials with empty clientInfo | Use fallback IP | 401 |

**Branches Covered:**
- `req.clientInfo?.ipAddress` → exists/fallback
- Success vs Error path

---

### 3. `refreshToken` (6 tests)

รีเฟรช access token

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Refresh successfully (no new refresh token) | Set access token cookie only | 200 |
| 2 | Refresh with new refresh token | Set both cookies | 200 |
| 3 | No refresh token provided (null) | Return no token error | 401 |
| 4 | Refresh token is undefined | Return error | 401 |
| 5 | Refresh token is empty string | Return error | 401 |
| 6 | Service error | Clear cookies | 401 |

**Branches Covered:**
- `!refreshToken` → null/undefined/empty string
- `result.refreshToken` → exists/not exists

---

### 4. `getProfile` (3 tests)

ดึงข้อมูลโปรไฟล์

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Get profile successfully | Return user profile | 200 |
| 2 | User not found (message contains `ไม่พบ`) | Return not found | 404 |
| 3 | Other errors | Return server error | 500 |

---

### 5. `forgotPassword` (3 tests)

ขอรีเซ็ตรหัสผ่าน

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Process request with clientInfo | Log password reset request | 200 |
| 2 | Process request with empty clientInfo | Use fallback IP/UA | 200 |
| 3 | Service error | Return server error | 500 |

---

### 6. `verifyResetToken` (2 tests)

ตรวจสอบ reset token

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Valid token | Return valid: true | 200 |
| 2 | Invalid token | Return valid: false | 400 |

---

### 7. `resetPassword` (3 tests)

รีเซ็ตรหัสผ่าน

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Reset successfully with clientInfo | Log success | 200 |
| 2 | Reset with empty clientInfo | Use fallback | 200 |
| 3 | Invalid token | Return error | 400 |

---

### 8. `changeEmail` (5 tests)

เปลี่ยนอีเมล

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Change email successfully | Return updated user | 200 |
| 2 | Email already in use (contains `ถูกใช้งานแล้ว`) | Return conflict | 409 |
| 3 | Wrong password (contains `ไม่ถูกต้อง`) | Return unauthorized | 401 |
| 4 | User not found (contains `ไม่พบ`) | Return not found | 404 |
| 5 | Other errors | Return server error | 500 |

**Branches Covered:**
- `error.message.includes('ถูกใช้งานแล้ว')` → true/false
- `error.message.includes('ไม่ถูกต้อง')` → true/false
- `error.message.includes('ไม่พบ')` → true/false

---

### 9. `changePassword` (4 tests)

เปลี่ยนรหัสผ่าน

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Change password successfully | Return success message | 200 |
| 2 | Wrong old password | Return unauthorized | 401 |
| 3 | User not found | Return not found | 404 |
| 4 | Other errors | Return server error | 500 |

---

### 10. `updateProfile` (4 tests)

อัปเดตข้อมูลโปรไฟล์

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Update profile successfully | Return updated user | 200 |
| 2 | SequelizeValidationError (single error) | Return first error message | 400 |
| 3 | SequelizeValidationError (multiple errors) | Return joined messages | 400 |
| 4 | Other errors | Return error message | 400 |

**Branches Covered:**
- `error.name === 'SequelizeValidationError'` → true/false
- `error.errors.length` → single/multiple

---

### 11. `logoutUser` (6 tests)

ออกจากระบบ

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Logout with refresh token and user | Log logout, clear cookies | 200 |
| 2 | Logout with empty clientInfo | Use fallback IP/UA | 200 |
| 3 | Logout without refresh token | Skip service call | 200 |
| 4 | Logout when req.user is undefined | Skip logging | 200 |
| 5 | Logout when req.user is null | Skip logging | 200 |
| 6 | Service error | Still clear cookies | 400 |

**Branches Covered:**
- `refreshToken` → exists/not exists
- `req.user` → exists/undefined/null
- Success vs Error path

---

### 12. `logoutAllUser` (2 tests)

ออกจากระบบทุกอุปกรณ์

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Logout all successfully | Clear cookies | 200 |
| 2 | Service error | Still clear cookies | 500 |

---

### 13. `googleAuthCallback` (2 tests)

Google OAuth callback

| # | Test Case | Expected Result | HTTP Status |
|---|-----------|-----------------|-------------|
| 1 | Success | Set cookies, redirect to success | 302 |
| 2 | Error | Redirect to error page | 302 |

---

## วิธีรัน Tests

```bash
# รัน coverage tests สำหรับ AuthController
npm run test -- --coverage --collectCoverageFrom="src/controllers/AuthController.js" __tests__/controllers/AuthController.coverage.test.js
```

## Mock Dependencies

```javascript
mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  refreshToken: jest.fn(),
  getProfile: jest.fn(),
  forgotPassword: jest.fn(),
  verifyResetToken: jest.fn(),
  resetPassword: jest.fn(),
  changeEmail: jest.fn(),
  changePassword: jest.fn(),
  updateProfile: jest.fn(),
  logout: jest.fn(),
  logoutAll: jest.fn(),
  googleAuthCallback: jest.fn()
};

mockSecurityLogger = {
  registrationSuccess: jest.fn(),
  registrationFailed: jest.fn(),
  loginSuccess: jest.fn(),
  loginFailed: jest.fn(),
  passwordResetRequest: jest.fn(),
  passwordResetSuccess: jest.fn(),
  logout: jest.fn()
};

mockSecurity = {
  recordFailedLogin: jest.fn(),
  clearFailedLogins: jest.fn()
};

mockCookies = {
  setAuthCookies: jest.fn(),
  setAccessTokenCookie: jest.fn(),
  clearAuthCookies: jest.fn(),
  getRefreshToken: jest.fn()
};
```

## หมายเหตุ

Branch Coverage อยู่ที่ 90.12% เนื่องจาก uncovered branches เกี่ยวกับ:
- `clientInfo` fallback cases บางส่วน (lines 48, 71, 95, 177, 224, 346, 409-414)
- ซึ่งเป็น edge cases ที่ยากต่อการ reproduce ในทุกสถานการณ์
