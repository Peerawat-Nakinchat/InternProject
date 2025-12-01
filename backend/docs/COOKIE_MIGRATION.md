# Migration จาก localStorage เป็น HTTP-Only Cookies

## สรุปการเปลี่ยนแปลง

วันที่ทำ: 1 ธันวาคม 2025  
Branch: cookie

### เหตุผล (ISO 27001 Compliance - Annex A.8)
- **localStorage** เสี่ยงต่อ XSS attacks เพราะ JavaScript สามารถเข้าถึงได้
- **HTTP-Only Cookies** ป้องกัน XSS attacks เพราะ JavaScript ไม่สามารถอ่าน/เขียนได้

---

## 🔧 Backend Changes

### 1. Dependencies เพิ่มเติม
```bash
npm install cookie-parser
```

### 2. Server Configuration (`server.js`)
- เพิ่ม `import cookieParser from "cookie-parser"`
- เพิ่ม `app.use(cookieParser())`

### 3. ไฟล์ใหม่: `src/utils/cookieUtils.js`
Utility functions สำหรับจัดการ cookies อย่างปลอดภัย:
- `setAuthCookies(res, accessToken, refreshToken)` - Set tokens เป็น HTTP-Only cookies
- `setAccessTokenCookie(res, accessToken)` - Set เฉพาะ access token
- `clearAuthCookies(res)` - Clear cookies (logout)
- `getAccessToken(req)` - อ่าน access token จาก cookies หรือ header
- `getRefreshToken(req)` - อ่าน refresh token จาก cookies หรือ body

### 4. Cookie Settings
```javascript
// Access Token Cookie
{
  httpOnly: true,     // ป้องกัน XSS
  secure: true,       // HTTPS only (production)
  sameSite: 'strict', // ป้องกัน CSRF
  maxAge: 15 * 60 * 1000, // 15 นาที
  path: '/',
}

// Refresh Token Cookie
{
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 วัน
  path: '/',
}
```

### 5. AuthController.js Updates
- `loginUser` - Set HTTP-Only cookies หลัง login สำเร็จ
- `refreshToken` - อ่าน refresh token จาก cookies, set access token ใหม่
- `logoutUser` - Clear cookies
- `logoutAllUser` - Clear cookies
- `googleAuthCallback` - Set cookies และ redirect โดยไม่ส่ง tokens ใน URL

### 6. authMiddleware.js Updates
- `protect` - อ่าน access token จาก cookies ก่อน, fallback ไป header

### 7. refreshTokenMiddleware.js Updates
- อ่าน refresh token จาก cookies
- Set cookies ใหม่หลัง refresh

---

## 🖥️ Frontend Changes

### 1. axios.ts
```typescript
axios.defaults.withCredentials = true // ส่ง cookies ข้าม origin
```

### 2. apiClient.ts
```typescript
credentials: 'include' // ในทุก fetch request
```

### 3. stores/auth.ts
- ลบการใช้ `localStorage.setItem/getItem/removeItem`
- เก็บ tokens ใน memory state เท่านั้น
- `initAuth()` - เปลี่ยนจาก localStorage เป็น API call `/auth/profile`
- `login()` - ไม่ต้องเก็บ tokens ใน localStorage (backend set cookies)
- `logout()` - ไม่ต้อง clear localStorage (backend clear cookies)
- `fetchProfile()` - ใช้ `withCredentials: true`
- `refreshAccessToken()` - ไม่ต้องส่ง refreshToken ใน body

### 4. Pages Updates

#### AuthCallback.vue
- รองรับ OAuth callback แบบใหม่ที่ใช้ cookies
- Fallback สำหรับ legacy tokens ใน URL

#### RegisterPage.vue
- เพิ่ม `credentials: 'include'` ใน fetch

#### LoginPage.vue
- เปลี่ยน `localStorage` เป็น `sessionStorage` สำหรับ reset_token

### 5. Services Updates

#### useInvitation.ts
- ใช้ `withCredentials: true` แทน Authorization header

---

## 🔄 Backward Compatibility

การ migrate ยังคง backward compatible:
- Backend ยังรับ tokens จาก Authorization header ได้
- Frontend ยังส่ง tokens ใน header (fallback)
- ค่อยๆ ลบ fallback logic ออกเมื่อมั่นใจว่า cookies ทำงานได้ดี

---

## ✅ Testing Checklist

1. [ ] Login ด้วย email/password - ตรวจสอบว่า cookies ถูก set
2. [ ] เข้าหน้าที่ต้อง authenticate - ตรวจสอบว่า cookies ถูกส่งไป
3. [ ] Refresh page - ตรวจสอบว่ายัง logged in อยู่
4. [ ] Logout - ตรวจสอบว่า cookies ถูก clear
5. [ ] Google OAuth login - ตรวจสอบว่า cookies ถูก set
6. [ ] Token refresh - ตรวจสอบว่า access token ใหม่ถูก set ใน cookies
7. [ ] Password reset - ตรวจสอบว่า flow ยังทำงานปกติ

---

## 🔒 Security Benefits

1. **XSS Protection**: JavaScript ไม่สามารถอ่าน tokens ได้
2. **CSRF Protection**: SameSite=strict ป้องกัน cross-site requests
3. **Secure Transport**: HTTPS only ใน production
4. **Short-lived Access Token**: 15 นาที ลด risk ถ้า token leak
5. **Token Rotation**: Refresh token หมุนเวียนเมื่อใช้งาน

---

## 📝 Notes

- Reset password token ยังใช้ `sessionStorage` เพราะเป็น one-time token ที่หมดอายุเมื่อปิด tab
- User data (`user` object) ยังเก็บใน memory state ไม่ได้เก็บ persistent
- ถ้าต้องการ "Remember Me" ต้องใช้ refresh token ที่มีอายุยาวขึ้น
