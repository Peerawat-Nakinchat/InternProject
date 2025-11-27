# 🐳 Docker Commands Reference

คู่มือคำสั่ง Docker สำหรับทีมงาน - เรียงตามความถี่ในการใช้งาน

---

## 📋 สารบัญ

- [คำสั่งพื้นฐานที่ใช้บ่อย](#-คำสั่งพื้นฐานที่ใช้บ่อย)
- [คำสั่งสำหรับโปรเจคนี้](#-คำสั่งสำหรับโปรเจคนี้)
- [การจัดการ Containers](#-การจัดการ-containers)
- [การจัดการ Images](#-การจัดการ-images)
- [การดู Logs และ Debug](#-การดู-logs-และ-debug)
- [การจัดการ Networks](#-การจัดการ-networks)
- [การจัดการ Volumes](#-การจัดการ-volumes)
- [คำสั่งทำความสะอาด](#-คำสั่งทำความสะอาด)
- [สำหรับ WSL Users](#-สำหรับ-wsl-users)

---

## ⭐ คำสั่งพื้นฐานที่ใช้บ่อย

### ตรวจสอบสถานะ

| คำสั่ง | คำอธิบาย |
|--------|----------|
| `docker ps` | ดู containers ที่กำลังทำงานอยู่ |
| `docker ps -a` | ดู containers ทั้งหมด (รวมที่หยุดแล้ว) |
| `docker images` | ดู images ทั้งหมดในเครื่อง |
| `docker --version` | ตรวจสอบ version ของ Docker |
| `docker compose version` | ตรวจสอบ version ของ Docker Compose |

### ตัวอย่าง Output

```bash
$ docker ps
CONTAINER ID   IMAGE                   STATUS          NAMES
abc123def456   hashicorp/vault:latest  Up 10 minutes   vault-agent
def456ghi789   hashicorp/vault:latest  Up 10 minutes   vault-server
```

---

## 🚀 คำสั่งสำหรับโปรเจคนี้

### เริ่มต้น Vault Agent (ใช้บ่อยที่สุด)

```bash
# เริ่มต้น Vault Agent และ Server
docker compose -f docker-compose.agent.yml up -d

# หรือใช้ npm script
npm run vault:up
```

### หยุด Vault Agent

```bash
# หยุดและลบ containers
docker compose -f docker-compose.agent.yml down

# หรือใช้ npm script
npm run vault:down
```

### Restart Vault Agent

```bash
# Restart เฉพาะ vault-agent
docker compose -f docker-compose.agent.yml restart vault-agent

# หรือใช้ npm script
npm run vault:restart

# Restart ทั้งหมด
docker compose -f docker-compose.agent.yml restart
```

### ดู Logs

```bash
# ดู logs ของ vault-agent
docker logs vault-agent

# ดู logs 20 บรรทัดล่าสุด
docker logs vault-agent --tail 20

# หรือใช้ npm script
npm run vault:logs

# ดู logs แบบ real-time (follow)
docker logs -f vault-agent
```

### รัน Backend พร้อม Vault

```bash
# เริ่ม Vault แล้วรัน Backend
npm run dev:full
```

---

## 📦 การจัดการ Containers

### เริ่ม/หยุด Container

| คำสั่ง | คำอธิบาย |
|--------|----------|
| `docker start <name>` | เริ่ม container ที่หยุดอยู่ |
| `docker stop <name>` | หยุด container ที่กำลังทำงาน |
| `docker restart <name>` | Restart container |
| `docker kill <name>` | บังคับหยุด container ทันที |

### ตัวอย่าง

```bash
# หยุด vault-agent
docker stop vault-agent

# เริ่ม vault-agent ใหม่
docker start vault-agent

# Restart vault-server
docker restart vault-server
```

### ลบ Container

```bash
# ลบ container ที่หยุดแล้ว
docker rm <container-name>

# ลบ container ที่กำลังทำงาน (force)
docker rm -f <container-name>

# ลบ containers ที่หยุดแล้วทั้งหมด
docker container prune
```

### เข้าไปใน Container

```bash
# เข้าไปใน container ด้วย shell
docker exec -it <container-name> sh

# เข้าไปใน vault-agent
docker exec -it vault-agent sh

# รันคำสั่งเดียวใน container
docker exec <container-name> <command>

# ตัวอย่าง: ดูไฟล์ใน vault-agent
docker exec vault-agent cat /vault/config/agent.hcl
```

---

## 🖼️ การจัดการ Images

### ดู Images

```bash
# ดู images ทั้งหมด
docker images

# ดู images พร้อมขนาด
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
```

### ดาวน์โหลด/ลบ Image

| คำสั่ง | คำอธิบาย |
|--------|----------|
| `docker pull <image>` | ดาวน์โหลด image จาก registry |
| `docker rmi <image>` | ลบ image |
| `docker image prune` | ลบ images ที่ไม่ได้ใช้ |

### ตัวอย่าง

```bash
# ดาวน์โหลด Vault image ล่าสุด
docker pull hashicorp/vault:latest

# ลบ image
docker rmi hashicorp/vault:latest

# ลบ images ที่ไม่มี tag (dangling)
docker image prune
```

---

## 📜 การดู Logs และ Debug

### ดู Logs

| คำสั่ง | คำอธิบาย |
|--------|----------|
| `docker logs <name>` | ดู logs ทั้งหมด |
| `docker logs <name> --tail 50` | ดู 50 บรรทัดล่าสุด |
| `docker logs -f <name>` | ดู logs แบบ real-time |
| `docker logs --since 1h <name>` | ดู logs ใน 1 ชั่วโมงที่ผ่านมา |
| `docker logs --timestamps <name>` | ดู logs พร้อม timestamp |

### ตัวอย่างการ Debug

```bash
# ดู logs vault-agent แบบ real-time พร้อม timestamp
docker logs -f --timestamps vault-agent

# ดู logs ใน 30 นาทีที่ผ่านมา
docker logs --since 30m vault-agent

# ดู logs และค้นหาคำว่า "error"
docker logs vault-agent 2>&1 | grep -i error
```

### ตรวจสอบ Container

```bash
# ดูรายละเอียด container
docker inspect <container-name>

# ดูเฉพาะ IP Address
docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' <container-name>

# ดู resource usage
docker stats

# ดู resource usage ของ container เฉพาะ
docker stats vault-agent vault-server
```

---

## 🌐 การจัดการ Networks

### ดู Networks

```bash
# ดู networks ทั้งหมด
docker network ls

# ดูรายละเอียด network
docker network inspect vault-network
```

### สร้าง/ลบ Network

```bash
# สร้าง network
docker network create <network-name>

# ลบ network
docker network rm <network-name>

# ลบ networks ที่ไม่ได้ใช้
docker network prune
```

### เชื่อมต่อ Container กับ Network

```bash
# เชื่อมต่อ container กับ network
docker network connect <network-name> <container-name>

# ตัดการเชื่อมต่อ
docker network disconnect <network-name> <container-name>
```

---

## 💾 การจัดการ Volumes

### ดู Volumes

```bash
# ดู volumes ทั้งหมด
docker volume ls

# ดูรายละเอียด volume
docker volume inspect <volume-name>
```

### สร้าง/ลบ Volume

```bash
# สร้าง volume
docker volume create <volume-name>

# ลบ volume
docker volume rm <volume-name>

# ลบ volumes ที่ไม่ได้ใช้
docker volume prune
```

---

## 🧹 คำสั่งทำความสะอาด

### ลบทีละอย่าง

| คำสั่ง | คำอธิบาย |
|--------|----------|
| `docker container prune` | ลบ containers ที่หยุดแล้ว |
| `docker image prune` | ลบ images ที่ไม่มี tag |
| `docker network prune` | ลบ networks ที่ไม่ได้ใช้ |
| `docker volume prune` | ลบ volumes ที่ไม่ได้ใช้ |

### ลบทั้งหมด (ระวัง!)

```bash
# ลบทุกอย่างที่ไม่ได้ใช้ (containers, images, networks)
docker system prune

# ลบทุกอย่างรวม volumes ด้วย (ระวัง! ข้อมูลจะหาย)
docker system prune -a --volumes

# ดูพื้นที่ที่ Docker ใช้
docker system df
```

### ตัวอย่าง Output

```bash
$ docker system df
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          5         2         1.2GB     800MB (66%)
Containers      3         2         50MB      10MB (20%)
Local Volumes   2         1         100MB     50MB (50%)
Build Cache     10        0         500MB     500MB
```

---

## 🐧 สำหรับ WSL Users

### เริ่มต้น Docker Service

```bash
# เริ่ม Docker service (ต้องรันทุกครั้งที่เปิด WSL ใหม่)
sudo service docker start

# ตรวจสอบ status
sudo service docker status

# หยุด Docker service
sudo service docker stop
```

### Auto-start Docker เมื่อเปิด WSL

เพิ่มบรรทัดนี้ใน `~/.bashrc` หรือ `~/.zshrc`:

```bash
# Auto-start Docker
if service docker status 2>&1 | grep -q "is not running"; then
    sudo service docker start
fi
```

### รันคำสั่งจาก PowerShell

```powershell
# รัน docker command ผ่าน WSL
wsl docker ps
wsl docker compose -f docker-compose.agent.yml up -d

# เข้าไปทำงานใน WSL
wsl
```

### Path Conversion

```bash
# Windows path ใน WSL
# C:\Users\username\project → /mnt/c/Users/username/project

# ไปยังโฟลเดอร์โปรเจค
cd /mnt/c/Users/<username>/OneDrive/Documents/GitHub/InternProject/backend
```

---

## 🔧 Docker Compose Commands

### คำสั่งพื้นฐาน

| คำสั่ง | คำอธิบาย |
|--------|----------|
| `docker compose up` | สร้างและเริ่ม containers |
| `docker compose up -d` | เริ่มแบบ background (detached) |
| `docker compose down` | หยุดและลบ containers |
| `docker compose stop` | หยุด containers (ไม่ลบ) |
| `docker compose start` | เริ่ม containers ที่หยุดอยู่ |
| `docker compose restart` | Restart containers |
| `docker compose ps` | ดู containers ที่ compose จัดการ |
| `docker compose logs` | ดู logs ของทุก services |

### ระบุไฟล์ Config

```bash
# ใช้ไฟล์ config เฉพาะ
docker compose -f docker-compose.agent.yml up -d

# ใช้หลายไฟล์ config
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

### Build และ Rebuild

```bash
# Build images ก่อนเริ่ม
docker compose up --build

# Build เฉพาะ service
docker compose build <service-name>

# Force rebuild (ไม่ใช้ cache)
docker compose build --no-cache
```

---

## 📝 Quick Reference Card

### คำสั่งที่ใช้บ่อยที่สุดสำหรับโปรเจคนี้

```bash
# เริ่มงาน
npm run vault:up              # หรือ docker compose -f docker-compose.agent.yml up -d
npm run dev                   # รัน backend

# ดู status
docker ps                     # ดู containers ที่ทำงานอยู่
npm run vault:logs            # ดู logs

# แก้ปัญหา
docker logs vault-agent       # ดู logs เต็ม
docker restart vault-agent    # restart container

# จบงาน
npm run vault:down            # หยุด vault
docker compose down           # หยุดทุกอย่าง
```

### คำสั่ง WSL ที่ต้องรันทุกวัน

```bash
# เปิด WSL แล้วรัน
sudo service docker start
cd /mnt/c/Users/<username>/OneDrive/Documents/GitHub/InternProject/backend
docker compose -f docker-compose.agent.yml up -d
```

---

**วันที่อัปเดต:** 27 พฤศจิกายน 2025
