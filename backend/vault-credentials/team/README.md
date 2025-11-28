# Vault Credentials สำหรับทีม

## ข้อมูล Credentials
ไฟล์ในโฟลเดอร์นี้ใช้สำหรับ Vault Agent authentication:

- `role-id` - Role ID (ไม่เปลี่ยนแปลง)
- `secret-id` - Secret ID (ใช้ร่วมกันได้, ไม่หมดอายุ)

## วิธีใช้งาน

### 1. คัดลอกไปยัง vault-agent-config
```powershell
# Windows PowerShell
Copy-Item "vault-credentials\team\role-id" "vault-agent-config\role-id" -Force
Copy-Item "vault-credentials\team\secret-id" "vault-agent-config\secret-id" -Force
```

```bash
# Linux/Mac
cp vault-credentials/team/role-id vault-agent-config/role-id
cp vault-credentials/team/secret-id vault-agent-config/secret-id
```

### 2. รัน Docker Compose
```powershell
docker compose up -d
```

## ⚠️ ข้อควรระวัง

1. **อย่า commit ไฟล์เหล่านี้ไปยัง Git** (ถูก ignore แล้วใน .gitignore)
2. **แชร์ credentials ผ่านช่องทางที่ปลอดภัย** เช่น:
   - Direct message (Slack, Discord, etc.)
   - Password manager ของทีม
   - Encrypted file sharing
3. **ถ้า credentials หลุด** ให้รัน `init-vault.ps1` ใหม่เพื่อสร้าง Secret ID ใหม่

## การตั้งค่าปัจจุบัน

| Setting | Value | คำอธิบาย |
|---------|-------|----------|
| secret_id_ttl | 0 | ไม่หมดอายุ |
| secret_id_num_uses | 0 | ใช้ซ้ำได้ไม่จำกัด |
| token_ttl | 24h | Token อายุ 24 ชม. (auto-renew) |
| token_max_ttl | 168h | Token max 7 วัน |

## Vault Server

- **URL**: http://172.16.12.63:8200
- **UI**: http://172.16.12.63:8200/ui
- **Root Token**: `dev-root-token-123` (สำหรับ admin เท่านั้น)
