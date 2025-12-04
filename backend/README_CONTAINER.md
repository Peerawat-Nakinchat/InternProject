# Docker Container Guide

ไฟล์ Docker ทั้งหมดอยู่ใน folder `docker/`

## 📁 โครงสร้างไฟล์

```
docker/
├── Dockerfile              # Development Dockerfile
├── Dockerfile.prod         # Production Dockerfile (multistage build)
├── docker-entrypoint.sh    # Entrypoint script
├── docker-compose.yml      # Development compose
├── docker-compose.prod.yml # Production compose
├── docker-compose.agent.yml    # Vault Agent compose
├── docker-compose.test.yml     # Test database compose
├── docker-compose.vault-server.yml # Standalone Vault server
└── vault-agent-config/     # Vault Agent configuration
    ├── agent.hcl
    ├── env.ctmpl
    └── policy.hcl
```

## 🚀 คำสั่งที่ใช้บ่อย

### Development

```bash
# เริ่มต้นทุก service (backend + postgres)
cd backend/docker
docker-compose up -d

# ดู logs
docker-compose logs -f backend

# หยุดทุก service
docker-compose down

# Rebuild เมื่อแก้ไข code
docker-compose up -d --build
```

### Production

```bash
# Build และ run production
cd backend/docker
docker-compose -f docker-compose.prod.yml up -d --build

# Scale backend (ถ้าต้องการ)
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

### Testing

```bash
# เริ่ม test database
cd backend/docker
docker-compose -f docker-compose.test.yml up -d

# Run tests (จาก backend folder)
cd ..
npm test
```

### Vault Integration

```bash
# เริ่ม Vault server ก่อน
cd backend/docker
docker-compose -f docker-compose.vault-server.yml up -d

# จากนั้นเริ่ม Vault Agent + Backend
docker-compose -f docker-compose.agent.yml up -d
```

## 🔧 Environment Variables

- `.env` file ต้องอยู่ที่ `backend/.env`
- Docker compose จะ mount จาก `../.env`
- ถ้าใช้ Vault Agent, `.env` จะถูก generate อัตโนมัติ

## ⚠️ หมายเหตุ

1. **ต้อง run คำสั่งจาก `backend/docker/` directory**
2. Production Dockerfile ใช้ multistage build ลดขนาด image
3. Vault Agent ต้องมี `role-id` และ `secret-id` ก่อนใช้งาน
4. อย่า commit ไฟล์ secrets (`role-id`, `secret-id`, `token`)
