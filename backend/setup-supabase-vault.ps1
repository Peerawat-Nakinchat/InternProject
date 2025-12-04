# setup-supabase-vault.ps1
# Script สำหรับตั้งค่า Supabase credentials ใน HashiCorp Vault

param(
    [Parameter(Mandatory=$true, HelpMessage="Supabase Project URL (e.g., https://xxxxx.supabase.co)")]
    [string]$SupabaseUrl,

    [Parameter(Mandatory=$true, HelpMessage="Supabase Anon/Public Key")]
    [string]$SupabaseAnonKey,

    [Parameter(Mandatory=$false, HelpMessage="Vault address")]
    [string]$VaultAddr = "http://127.0.0.1:8200",

    [Parameter(Mandatory=$true, HelpMessage="Vault root token or access token")]
    [string]$VaultToken
)

# ฟังก์ชันแสดง header
function Write-Header {
    param([string]$Message)
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  $Message" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
}

# ฟังก์ชันแสดงความคืบหน้า
function Write-Step {
    param([string]$Message)
    Write-Host "▶ $Message" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

# เริ่มต้น
Clear-Host
Write-Header "Supabase Vault Setup Script"

# ตั้งค่า environment variables
Write-Step "กำลังตั้งค่า environment variables..."
$env:VAULT_ADDR = $VaultAddr
$env:VAULT_TOKEN = $VaultToken
Write-Success "ตั้งค่า VAULT_ADDR = $VaultAddr"
Write-Success "ตั้งค่า VAULT_TOKEN = ${VaultToken.Substring(0, [Math]::Min(10, $VaultToken.Length))}..."

# ตรวจสอบว่าติดตั้ง Vault CLI แล้วหรือยัง
Write-Step "กำลังตรวจสอบ Vault CLI..."
try {
    $vaultVersion = vault version 2>&1
    Write-Success "พบ Vault CLI: $vaultVersion"
} catch {
    Write-Error "ไม่พบ Vault CLI"
    Write-Info "กรุณาติดตั้ง Vault CLI ก่อน: https://www.vaultproject.io/downloads"
    exit 1
}

# ตรวจสอบการเชื่อมต่อ Vault
Write-Step "กำลังตรวจสอบการเชื่อมต่อ Vault..."
try {
    $vaultStatus = vault status 2>&1
    if ($LASTEXITCODE -eq 0 -or $vaultStatus -match "Sealed.*false") {
        Write-Success "เชื่อมต่อ Vault สำเร็จ"
        Write-Info "Vault Status:"
        vault status | Select-String -Pattern "Sealed|Version|Cluster" | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    } else {
        Write-Error "Vault ถูก seal หรือไม่สามารถเชื่อมต่อได้"
        Write-Host $vaultStatus
        exit 1
    }
} catch {
    Write-Error "ไม่สามารถเชื่อมต่อ Vault ได้: $_"
    Write-Info "ตรวจสอบว่า Vault Server กำลังทำงานที่ $VaultAddr"
    exit 1
}

# ตรวจสอบว่ามี secret อยู่แล้วหรือไม่
Write-Step "กำลังตรวจสอบ secret ที่มีอยู่..."
$existingSecret = vault kv get -format=json kv/backend/supabase 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Info "พบ Supabase credentials ที่มีอยู่แล้ว"
    $confirm = Read-Host "ต้องการเขียนทับหรือไม่? (y/n)"
    if ($confirm -ne 'y') {
        Write-Info "ยกเลิกการทำงาน"
        exit 0
    }
}

# เพิ่ม Supabase credentials ลง Vault
Write-Step "กำลังเพิ่ม Supabase credentials ลง Vault..."
try {
    $result = vault kv put kv/backend/supabase `
        SUPABASE_URL="$SupabaseUrl" `
        SUPABASE_ANON_KEY="$SupabaseAnonKey" 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Success "เพิ่ม Supabase credentials สำเร็จ"
        Write-Host $result -ForegroundColor Gray
    } else {
        Write-Error "เกิดข้อผิดพลาดในการเพิ่ม credentials"
        Write-Host $result
        exit 1
    }
} catch {
    Write-Error "เกิดข้อผิดพลาด: $_"
    exit 1
}

# ตรวจสอบข้อมูลที่บันทึก
Write-Step "กำลังตรวจสอบข้อมูลที่บันทึก..."
$savedData = vault kv get kv/backend/supabase 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Success "ข้อมูลที่บันทึกใน Vault:"
    Write-Host ""
    vault kv get kv/backend/supabase | Select-String -Pattern "SUPABASE" | ForEach-Object {
        $line = $_.Line
        if ($line -match "SUPABASE_ANON_KEY") {
            # ซ่อนส่วนของ key
            $line = $line -replace "(SUPABASE_ANON_KEY\s+)(.{20}).*", '$1$2...[HIDDEN]'
        }
        Write-Host "  $line" -ForegroundColor Cyan
    }
} else {
    Write-Error "ไม่สามารถอ่านข้อมูลจาก Vault ได้"
}

# ตรวจสอบว่า Vault Agent กำลังทำงานหรือไม่
Write-Step "กำลังตรวจสอบ Vault Agent..."
$vaultAgentRunning = docker ps --filter "name=vault-agent" --format "{{.Names}}" 2>&1
if ($vaultAgentRunning -match "vault-agent") {
    Write-Success "พบ Vault Agent กำลังทำงาน"

    # Restart Vault Agent
    Write-Step "กำลัง restart Vault Agent เพื่อโหลดค่าใหม่..."
    docker compose -f docker-compose.agent.yml restart vault-agent 2>&1 | Out-Null

    if ($LASTEXITCODE -eq 0) {
        Write-Success "Restart Vault Agent สำเร็จ"

        # รอให้ Vault Agent ทำงาน
        Write-Step "กำลังรอ Vault Agent ประมวลผล..."
        Start-Sleep -Seconds 5

        # ดู logs
        Write-Info "Vault Agent Logs (20 บรรทัดล่าสุด):"
        Write-Host ""
        docker logs vault-agent --tail 20 | ForEach-Object {
            if ($_ -match "error|Error|ERROR") {
                Write-Host "  $_" -ForegroundColor Red
            } elseif ($_ -match "success|Success|SUCCESS") {
                Write-Host "  $_" -ForegroundColor Green
            } else {
                Write-Host "  $_" -ForegroundColor Gray
            }
        }
    } else {
        Write-Error "ไม่สามารถ restart Vault Agent ได้"
    }
} else {
    Write-Info "ไม่พบ Vault Agent กำลังทำงาน"
    Write-Info "คุณสามารถเริ่ม Vault Agent ด้วยคำสั่ง:"
    Write-Host "  docker compose -f docker-compose.agent.yml up -d" -ForegroundColor Yellow
}

# ตรวจสอบไฟล์ .env ที่ generate
Write-Step "กำลังตรวจสอบไฟล์ .env ที่ Vault Agent สร้าง..."
$envFile = "secrets\.env"
if (Test-Path $envFile) {
    Write-Success "พบไฟล์ $envFile"
    $supabaseEnvVars = Get-Content $envFile | Select-String "SUPABASE"
    if ($supabaseEnvVars) {
        Write-Info "Supabase variables ในไฟล์ .env:"
        $supabaseEnvVars | ForEach-Object {
            $line = $_.Line
            if ($line -match "SUPABASE_ANON_KEY") {
                $line = $line -replace "(SUPABASE_ANON_KEY=)(.{20}).*", '$1$2...[HIDDEN]'
            }
            Write-Host "  $line" -ForegroundColor Cyan
        }
    } else {
        Write-Error "ไม่พบ Supabase variables ในไฟล์ .env"
        Write-Info "ตรวจสอบว่า vault-agent-config/env.ctmpl มีการดึง Supabase secrets หรือไม่"
    }
} else {
    Write-Info "ยังไม่พบไฟล์ $envFile"
    Write-Info "รอให้ Vault Agent สร้างไฟล์ หรือตรวจสอบ configuration"
}

# สรุป
Write-Header "สรุป"
Write-Success "✅ เพิ่ม Supabase credentials ลง Vault เรียบร้อยแล้ว"
Write-Success "✅ Secret path: kv/backend/supabase"
Write-Info ""
Write-Info "📋 ขั้นตอนถัดไป:"
Write-Host "  1. ตรวจสอบว่า vault-agent-config/env.ctmpl มีการดึง Supabase secrets" -ForegroundColor White
Write-Host "  2. Restart backend server: npm run dev:full" -ForegroundColor White
Write-Host "  3. ทดสอบ API: POST /api/profile/upload-image" -ForegroundColor White
Write-Info ""
Write-Info "🔍 คำสั่งที่มีประโยชน์:"
Write-Host "  • ดูข้อมูล: vault kv get kv/backend/supabase" -ForegroundColor Yellow
Write-Host "  • อัพเดท: vault kv put kv/backend/supabase SUPABASE_URL=... SUPABASE_ANON_KEY=..." -ForegroundColor Yellow
Write-Host "  • ลบข้อมูล: vault kv delete kv/backend/supabase" -ForegroundColor Yellow
Write-Host "  • ดู logs: docker logs vault-agent --tail 50" -ForegroundColor Yellow
Write-Info ""
Write-Success "🎉 การตั้งค่าเสร็จสมบูรณ์!"
Write-Host ""
