# Setup Vault Server automatically (PowerShell)

Write-Host "=== Setting up Vault Server ===" -ForegroundColor Cyan

$env:VAULT_ADDR = 'http://127.0.0.1:8200'
$env:VAULT_TOKEN = 'dev-root-token-123'

# Wait for Vault to be ready
Write-Host "Waiting for Vault Server..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# 1. Enable KV v2
Write-Host "1. Enabling KV secrets engine..." -ForegroundColor Green
docker exec -e VAULT_ADDR='http://127.0.0.1:8200' -e VAULT_TOKEN='dev-root-token-123' vault-server vault secrets enable -version=2 -path=kv kv 2>$null
if ($LASTEXITCODE -ne 0) { Write-Host "   KV already enabled" -ForegroundColor Yellow }

# 2. Add backend/config
Write-Host "2. Adding backend/config..." -ForegroundColor Green
docker exec -e VAULT_ADDR='http://127.0.0.1:8200' -e VAULT_TOKEN='dev-root-token-123' vault-server vault kv put kv/backend/config DB_HOST=122.8.151.83 DB_PORT=5432 DB_DATABASE=iso_mango_demo DB_USER=root DB_PASSWORD=6WggMP6f5E9a PORT=3000 NODE_ENV=development ALLOWED_ORIGINS=http://localhost:5173 FRONTEND_URL=http://localhost:5173 | Out-Null

# 3. Add backend/jwt
Write-Host "3. Adding backend/jwt..." -ForegroundColor Green
docker exec -e VAULT_ADDR='http://127.0.0.1:8200' -e VAULT_TOKEN='dev-root-token-123' vault-server vault kv put kv/backend/jwt ACCESS_TOKEN_SECRET=265ba1aa8752ebca9823155a86f0466757a2fcc7f2ef455ed98817cca5a3b29bb28eb9ceee5e55894bf9099cdb8914bf3920fb3fcd9831a35f9608b6a5948edf REFRESH_TOKEN_SECRET=e68c891144c7b5e00e3cb5b5f982dd0420de2cf1e8aa88dc3070e32aa150f964deb5d8f69c9be4d42e85b184882e22ed8af30384b0d6f4405797e766c3e8d001 ACCESS_EXPIRES=15m REFRESH_EXPIRES=7d BCRYPT_SALT_ROUNDS=10 | Out-Null

# 4. Add backend/oauth
Write-Host "4. Adding backend/oauth..." -ForegroundColor Green
# IMPORTANT: Replace these placeholder values with your actual Google OAuth credentials
# You should store these in environment variables or a secure location, not in this file
docker exec -e VAULT_ADDR='http://127.0.0.1:8200' -e VAULT_TOKEN='dev-root-token-123' vault-server vault kv put kv/backend/oauth GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET | Out-Null

# 5. Add backend/mail
Write-Host "5. Adding backend/mail..." -ForegroundColor Green
docker exec -e VAULT_ADDR='http://127.0.0.1:8200' -e VAULT_TOKEN='dev-root-token-123' vault-server vault kv put kv/backend/mail MAIL_HOST=smtp.gmail.com MAIL_PORT=587 MAIL_USER=minlen7k@gmail.com MAIL_PASS=yngytcckhlfabmeb | Out-Null

# 6. Create Policy
Write-Host "6. Creating Policy..." -ForegroundColor Green
docker cp vault-agent-config/policy.hcl vault-server:/tmp/policy.hcl
docker exec -e VAULT_ADDR='http://127.0.0.1:8200' -e VAULT_TOKEN='dev-root-token-123' vault-server vault policy write backend-dev-policy /tmp/policy.hcl | Out-Null

# 7. Enable AppRole
Write-Host "7. Enabling AppRole..." -ForegroundColor Green
docker exec -e VAULT_ADDR='http://127.0.0.1:8200' -e VAULT_TOKEN='dev-root-token-123' vault-server vault auth enable approle 2>$null
if ($LASTEXITCODE -ne 0) { Write-Host "   AppRole already enabled" -ForegroundColor Yellow }

# 8. Create Role
Write-Host "8. Creating AppRole..." -ForegroundColor Green
docker exec -e VAULT_ADDR='http://127.0.0.1:8200' -e VAULT_TOKEN='dev-root-token-123' vault-server vault write auth/approle/role/backend-dev token_policies="backend-dev-policy" token_ttl=1h token_max_ttl=4h | Out-Null

# 9. Get credentials
Write-Host "9. Getting Role ID and Secret ID..." -ForegroundColor Green

# ดึง Role ID
$ROLE_ID = docker exec -e VAULT_ADDR='http://127.0.0.1:8200' -e VAULT_TOKEN='dev-root-token-123' vault-server vault read -field=role_id auth/approle/role/backend-dev/role-id 2>$null
if ($ROLE_ID) {
    $ROLE_ID = $ROLE_ID.Trim()
}

# ดึง Secret ID
$SECRET_ID = docker exec -e VAULT_ADDR='http://127.0.0.1:8200' -e VAULT_TOKEN='dev-root-token-123' vault-server vault write -field=secret_id -f auth/approle/role/backend-dev/secret-id 2>$null
if ($SECRET_ID) {
    $SECRET_ID = $SECRET_ID.Trim()
}

# ตรวจสอบว่าได้ค่ามาจริง
if ([string]::IsNullOrWhiteSpace($ROLE_ID)) {
    Write-Host ""
    Write-Host "ERROR: Failed to retrieve Role ID!" -ForegroundColor Red
    Write-Host "Please ensure:" -ForegroundColor Yellow
    Write-Host "  1. Vault Server container 'vault-server' is running" -ForegroundColor Yellow
    Write-Host "  2. AppRole auth method was enabled successfully" -ForegroundColor Yellow
    Write-Host "  3. Run: docker ps | Select-String vault-server" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
if ([string]::IsNullOrWhiteSpace($SECRET_ID)) {
    Write-Host ""
    Write-Host "ERROR: Failed to retrieve Secret ID!" -ForegroundColor Red
    Write-Host "The role may not be created properly. Check Vault logs." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# บันทึกลงไฟล์ (UTF-8 without BOM)
[System.IO.File]::WriteAllText("$PSScriptRoot\vault-agent-config\role-id", $ROLE_ID, (New-Object System.Text.UTF8Encoding $false))
[System.IO.File]::WriteAllText("$PSScriptRoot\vault-agent-config\secret-id", $SECRET_ID, (New-Object System.Text.UTF8Encoding $false))

Write-Host ""
Write-Host "=== Setup Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Root Token: dev-root-token-123" -ForegroundColor Cyan
Write-Host "Role ID: $ROLE_ID" -ForegroundColor Cyan
Write-Host "Secret ID: $SECRET_ID" -ForegroundColor Cyan
Write-Host ""
Write-Host "Vault UI: http://localhost:8200/ui" -ForegroundColor Yellow
Write-Host "Use Token: dev-root-token-123" -ForegroundColor Yellow
