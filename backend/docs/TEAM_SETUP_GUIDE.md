# 📘 คู่มือสำหรับทีมงาน - ตั้งค่า Vault Agent

## ⚠️ ข้อกำหนดเบื้องต้น - ติดตั้ง Docker

### 🐳 สำหรับผู้ที่ไม่มี Docker Desktop

ถ้าคุณไม่สามารถใช้ Docker Desktop ได้ สามารถใช้ Docker Engine ผ่าน WSL2 แทน:

#### วิธีที่ 1: ติดตั้ง Docker ผ่าน WSL2 (แนะนำ)

1. **เปิดใช้งาน WSL2** (รัน PowerShell ในฐานะ Administrator):
   ```powershell
   wsl --install
   ```

2. **รีสตาร์ทเครื่อง** หลังติดตั้ง WSL

3. **เปิด Ubuntu (WSL) แล้วติดตั้ง Docker**:
   ```bash
   # อัปเดต package
   sudo apt update && sudo apt upgrade -y

   # ติดตั้ง dependencies
   sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

   # เพิ่ม Docker GPG key
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

   # เพิ่ม Docker repository
   echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

   # ติดตั้ง Docker
   sudo apt update
   sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

   # เพิ่ม user เข้ากลุ่ม docker (ไม่ต้องใช้ sudo)
   sudo usermod -aG docker $USER
   newgrp docker
   ```

4. **เริ่มต้น Docker service**:
   ```bash
   sudo service docker start
   ```

5. **ตรวจสอบว่า Docker ทำงาน**:
   ```bash
   docker --version
   docker compose version
   ```

#### วิธีที่ 2: ใช้ Docker CLI ผ่าน WSL จาก PowerShell

หลังติดตั้ง Docker ใน WSL แล้ว สามารถรันคำสั่งจาก PowerShell ได้โดย:

```powershell
# รัน docker command ผ่าน WSL
wsl docker ps
wsl docker compose -f docker-compose.agent.yml up -d
```

หรือสร้าง alias ใน PowerShell profile:
```powershell
# เพิ่มใน $PROFILE
Set-Alias -Name docker -Value { wsl docker $args }
```

#### วิธีที่ 3: รันคำสั่งใน WSL terminal โดยตรง

```bash
# เปิด WSL และไปยังโฟลเดอร์โปรเจค
cd /mnt/c/Users/<your-username>/path/to/InternProject/backend

# รัน docker compose
docker compose -f docker-compose.agent.yml up -d
```

---

### 🖥️ สำหรับผู้ที่ใช้ Docker Desktop

ถ้าคุณมี Docker Desktop ให้เปิดใช้งานและข้ามไปที่ขั้นตอนถัดไปได้เลย

---

## ข้อมูลที่ต้องได้รับจาก Admin

คุณจะได้รับไฟล์และข้อมูลจาก Admin ดังนี้:

- ✉️ **ไฟล์ `role-id`** - บรรจุ Role ID
- ✉️ **ไฟล์ `secret-id`** - บรรจุ Secret ID
- 🌐 **IP Address ของ Vault Server** (เช่น `172.16.12.63`)

---

## 📋 Step-by-Step Setup

### ขั้นตอนที่ 1: ตรวจสอบว่าอยู่ในเครือข่ายเดียวกัน

เปิด Terminal/PowerShell แล้วรันคำสั่ง:

```powershell
# ลอง ping ไปที่ IP ของ Admin (ถามจาก Admin)
ping 172.16.12.63
```

**ควรเห็น:**

```
Reply from 172.16.12.63: bytes=32 time=1ms TTL=128
```

❌ **ถ้า Request timed out** = ไม่ได้อยู่ในเครือข่ายเดียวกัน ต้องเชื่อมต่อ Wi-Fi เดียวกับ Admin

---

### ขั้นตอนที่ 2: วางไฟล์ credentials

1. เปิดโฟลเดอร์โปรเจค: `InternProject/backend/vault-agent-config/`
2. วางไฟล์ที่ได้รับจาก Admin:
   - `role-id` (ไม่มี extension)
   - `secret-id` (ไม่มี extension)

**โครงสร้างไฟล์ควรเป็น:**

```
backend/
  vault-agent-config/
    role-id          ← วางที่นี่
    secret-id        ← วางที่นี่
    agent.hcl
    policy.hcl
    env.ctmpl
```

---

### ขั้นตอนที่ 3: แก้ไขไฟล์ `agent.hcl`

เปิดไฟล์ `backend/vault-agent-config/agent.hcl`

**หาส่วนนี้:**

```hcl
vault {
  address = "http://vault-server:8200"
}
```

**⚠️ สำคัญ!** ถ้าคุณรัน Vault Agent บนเครื่องคนละเครื่องกับ Admin:

**แก้เป็น:**

```hcl
vault {
  # แทนที่ด้วย IP
  address = "http://172.16.12.63:8200"
}
```

**💡 เคล็ดลับ:** ถ้ารันบนเครื่องเดียวกับ Admin ไม่ต้องแก้

---

### ขั้นตอนที่ 4: รัน Vault Agent

เปิด Terminal/PowerShell ที่โฟลเดอร์ `backend/` แล้วรันคำสั่ง:

**สำหรับ Docker Desktop หรือ Docker CLI (Windows):**
```powershell
# ไปที่โฟลเดอร์ backend
cd backend

# รัน Vault Agent ด้วย Docker Compose
docker compose -f docker-compose.agent.yml up -d
```

**สำหรับ WSL (Ubuntu):**
```bash
# ไปที่โฟลเดอร์ backend
cd /mnt/c/Users/<username>/path/to/InternProject/backend

# รัน Vault Agent
docker compose -f docker-compose.agent.yml up -d
```

**หรือรันจาก PowerShell ผ่าน WSL:**
```powershell
wsl -e bash -c "cd /mnt/c/Users/<username>/path/to/InternProject/backend && docker compose -f docker-compose.agent.yml up -d"
```

**ควรเห็น:**

```
[+] Running 2/2
 ✔ Container vault-server  Healthy
 ✔ Container vault-agent   Started
```

---

### ขั้นตอนที่ 5: ตรวจสอบว่าสำเร็จหรือไม่

#### วิธีที่ 1: ตรวจสอบ logs

```powershell
docker logs vault-agent --tail 20
```

**✅ สำเร็จ ถ้าเห็นข้อความนี้:**

```
[INFO]  agent.auth.handler: authentication successful
[INFO]  agent.sink.file: token written: path=/vault/config/token-sink
```

**❌ มีปัญหา ถ้าเห็น:**

```
[ERROR] agent.auth.handler: error authenticating
```

#### วิธีที่ 2: ตรวจสอบไฟล์ `.env`

```powershell
# ตรวจสอบว่ามีไฟล์ .env แล้ว
Get-Content secrets/.env
```

**✅ สำเร็จ ถ้าเห็นข้อมูล:**

```
# Generated by Vault Agent

# Database
DB_HOST=122.8.151.83
DB_PORT=5432
...
```

---

## 🐛 การแก้ปัญหา

### ❌ ปัญหา: `no such host` หรือ `connection refused`

**สาเหตุ:** เชื่อมต่อ Vault Server ไม่ได้

**วิธีแก้:**

1. ตรวจสอบว่า `agent.hcl` มี IP ถูกต้อง
2. ตรวจสอบว่า Admin เปิด Vault Server ไว้
3. ลอง ping ดู:
   ```powershell
   ping 172.16.12.63
   ```

---

### ❌ ปัญหา: `permission denied` หรือ `invalid role or secret ID`

**สาเหตุ:** credentials ไม่ถูกต้อง

**วิธีแก้:**

1. ขอไฟล์ `role-id` และ `secret-id` ใหม่จาก Admin
2. ตรวจสอบว่าวางไฟล์ถูกที่
3. Restart Vault Agent:
   ```powershell
   docker compose -f docker-compose.agent.yml restart
   ```

---

### ❌ ปัญหา: ไฟล์ `.env` ไม่ถูกสร้าง

**วิธีแก้:**

1. ดู logs:
   ```powershell
   docker logs vault-agent
   ```
2. ตรวจสอบว่า `authentication successful`
3. Restart Agent:
   ```powershell
   docker compose -f docker-compose.agent.yml down
   docker compose -f docker-compose.agent.yml up -d
   ```

---

### ❌ ปัญหา: Docker ไม่ทำงาน

**วิธีแก้ (Docker Desktop):**

1. เปิด Docker Desktop
2. รอให้ Docker พร้อม (ประมาณ 30 วินาที)
3. ตรวจสอบ:
   ```powershell
   docker ps
   ```

**วิธีแก้ (WSL/Docker Engine):**

1. เปิด WSL terminal และเริ่ม Docker service:
   ```bash
   sudo service docker start
   ```

2. ตรวจสอบว่า Docker ทำงาน:
   ```bash
   docker ps
   ```

3. ถ้ายังไม่ได้ ให้ตรวจสอบ status:
   ```bash
   sudo service docker status
   ```

---

### ❌ ปัญหา: `docker-compose: command not found`

**สาเหตุ:** Docker Compose ไม่ได้ติดตั้งแบบ standalone

**วิธีแก้:**

Docker Compose V2 มาพร้อมกับ Docker Engine ใช้คำสั่ง `docker compose` (มีช่องว่าง) แทน `docker-compose`:

```bash
# ใช้คำสั่งนี้แทน
docker compose -f docker-compose.agent.yml up -d

# แทนที่จะเป็น
docker-compose -f docker-compose.agent.yml up -d
```

---

### ❌ ปัญหา: `No such container: vault-agent`

**สาเหตุ:** Container ยังไม่ถูกสร้าง หรือถูกลบไปแล้ว

**วิธีแก้:**

1. ตรวจสอบว่ามี container อยู่หรือไม่:
   ```powershell
   docker ps -a | Select-String vault
   ```

2. ถ้าไม่มี ให้สร้างใหม่:
   ```powershell
   cd backend
   docker compose -f docker-compose.agent.yml up -d
   ```

3. ถ้ายังไม่ได้ ลองลบ network เก่าแล้วสร้างใหม่:
   ```powershell
   docker network rm vault-network 2>$null
   docker compose -f docker-compose.agent.yml up -d
   ```

4. ตรวจสอบว่าสร้างสำเร็จ:
   ```powershell
   docker ps
   ```
   
   **ควรเห็น:**
   ```
   NAMES          STATUS
   vault-agent    Up X minutes
   vault-server   Up X minutes (healthy)
   ```

---

## 🔄 การหยุดและเริ่มใหม่

**หยุด Vault Agent:**

```bash
# Docker Desktop / Docker Engine
docker compose -f docker-compose.agent.yml down
```

**เริ่มใหม่:**

```bash
docker compose -f docker-compose.agent.yml up -d
```

**ดู logs แบบ real-time:**

```bash
docker logs -f vault-agent
```

---

## ✅ เสร็จแล้ว!

เมื่อทำตามขั้นตอนครบแล้ว:

- ✅ ไฟล์ `secrets/.env` จะถูกสร้างอัตโนมัติ
- ✅ สามารถรัน Backend ได้เลย:
  ```powershell
  npm run dev
  ```

---

**วันที่:** 27 พฤศจิกายน 2025

---

## 🛡️ สิ่งที่ควรทำและไม่ควรทำ

### ✅ สิ่งที่ควรทำ

| สิ่งที่ควรทำ | เหตุผล |
|-------------|--------|
| ส่งไฟล์ `role-id` และ `secret-id` ผ่านช่องทางที่ปลอดภัย (เช่น DM, Encrypted message) | ป้องกันการเข้าถึงจากบุคคลภายนอก |
| เก็บไฟล์ credentials ไว้ในโฟลเดอร์ `vault-agent-config/` เท่านั้น | Agent อ่านจากที่นี่เท่านั้น |
| ตรวจสอบ `.gitignore` ว่ามีไฟล์ credentials อยู่ | ป้องกันการ commit ขึ้น Git โดยไม่ตั้งใจ |
| ขอ credentials ใหม่จาก Admin เมื่อ authentication ไม่ผ่าน | Secret ID อาจหมดอายุหรือถูกใช้ไปแล้ว |
| แจ้ง Admin เมื่อ Vault Server restart | ต้อง generate credentials ใหม่ (dev mode) |

### ❌ สิ่งที่ไม่ควรทำ

| สิ่งที่ไม่ควรทำ | ความเสี่ยง |
|----------------|-----------|
| ❌ Commit ไฟล์ `role-id`, `secret-id` ขึ้น Git | ข้อมูลรั่วไหลสู่สาธารณะ |
| ❌ แชร์ credentials ผ่าน public channel (เช่น group chat สาธารณะ) | บุคคลภายนอกอาจเข้าถึงได้ |
| ❌ ใช้ credentials เดียวกันหลายเครื่อง | อาจเกิดปัญหา conflict และ security issues |
| ❌ แก้ไขไฟล์ใน `secrets/` โดยตรง | Vault Agent จะเขียนทับเมื่อ restart |
| ❌ ปิด Vault Agent ขณะที่ Backend กำลังทำงาน | อาจทำให้ token หมดอายุและ Backend ไม่สามารถอ่าน secrets ได้ |

### 📁 ไฟล์ที่ต้องอยู่ใน `.gitignore`

ตรวจสอบว่าไฟล์ `.gitignore` มีรายการเหล่านี้:

```gitignore
# Vault credentials - ห้าม commit!
vault-agent-config/role-id
vault-agent-config/secret-id
vault-agent-config/token
vault-agent-config/token-sink

# Generated secrets
secrets/.env
secrets/*
```

---

## เพิ่มเติม

เมื่อมีการอัปเดตข้อมูลใหม่ใน vault ให้รัน 2 คำสั่งนี้เพื่อให้ข้อมูลใหม่ถูกอัปเดตในไฟล์ .env

1. `docker compose -f docker-compose.agent.yml restart vault-agent`

2. `docker compose restart backend`

รันคำสั่งนี้เพื่อให้ server ของ vault agent ทำงาน พร้อมกับหลังบ้าน

```bash
npm run dev:full
```

วิธีสั่งปิด container เดิม

```bash
docker compose down
```

---

## 🐧 Quick Reference สำหรับ WSL Users

| การใช้งาน | คำสั่ง |
|----------|--------|
| เริ่ม Docker service | `sudo service docker start` |
| ตรวจสอบ Docker status | `sudo service docker status` |
| รัน compose | `docker compose -f <file> up -d` |
| หยุด compose | `docker compose -f <file> down` |
| ดู containers ที่รัน | `docker ps` |
| ดู logs | `docker logs <container-name>` |
| เข้าไปใน container | `docker exec -it <container-name> sh` |
