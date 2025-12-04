# Intern Project

โปรเจกต์ระบบ Multi-tenant Management System ประกอบด้วย Backend API และ Frontend Application

## โครงสร้างโปรเจกต์

```
InternProject/
├── backend/          # Express.js Backend API
├── intern_pj/        # Vue.js Frontend Application
├── docs/             # เอกสารต่างๆ
│   ├── ISO27001_ASSESSMENT_REPORT.md
│   └── TEST_REPORT.md
└── package.json      # Root package.json สำหรับจัดการ monorepo
```

## การติดตั้ง

### ติดตั้งทั้งหมด
```bash
npm install
npm run install:all
```

### ติดตั้งแยกส่วน
```bash
# Backend
cd backend
npm install

# Frontend
cd intern_pj
npm install
```

## การใช้งาน

### Development Mode

```bash
# รันทั้ง Backend และ Frontend พร้อมกัน
npm run dev

# รันแยกส่วน
npm run dev:backend    # Backend only
npm run dev:frontend   # Frontend only
```

### การ Build

```bash
# Build ทั้งหมด
npm run build

# Build แยกส่วน
npm run build:backend
npm run build:frontend
```

### การทดสอบ

```bash
# รัน tests ทั้งหมด
npm test

# รัน tests แยกส่วน
npm run test:backend
npm run test:frontend
```

## เทคโนโลยีที่ใช้

### Backend
- **Framework**: Express.js
- **Database**: PostgreSQL (Sequelize ORM)
- **Authentication**: Passport.js (Local + Google OAuth)
- **Security**: Helmet, Express Rate Limit, XSS Clean
- **Secret Management**: HashiCorp Vault
- **Testing**: Jest
- **API Documentation**: Swagger

### Frontend
- **Framework**: Vue.js 3
- **State Management**: Pinia
- **Routing**: Vue Router
- **UI Components**: Tailwind CSS, AG Grid
- **HTTP Client**: Axios
- **Testing**: Vitest
- **Build Tool**: Vite

## เอกสารเพิ่มเติม

- [ISO27001 Assessment Report](./docs/ISO27001_ASSESSMENT_REPORT.md)
- [Test Report](./docs/TEST_REPORT.md)
- [Backend Documentation](./backend/docs/)
- [Frontend README](./intern_pj/README.md)

## Requirements

- Node.js >= 20.19.0 หรือ >= 22.12.0
- PostgreSQL
- Docker (สำหรับ Vault)

## License

Private
