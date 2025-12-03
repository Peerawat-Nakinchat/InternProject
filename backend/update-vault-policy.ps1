# Update Vault Policy (PowerShell)
# รันเพื่ออัปเดต policy หลังจากแก้ไข

Write-Host "=== Updating Vault Policy ===" -ForegroundColor Cyan

$env:VAULT_ADDR = 'http://127.0.0.1:8200'
$env:VAULT_TOKEN = 'dev-root-token-123'

# 1. Copy updated policy to container
Write-Host "1. Copying policy file..." -ForegroundColor Green
docker cp vault-agent-config/policy.hcl vault-server:/tmp/policy.hcl

# 2. Update policy
Write-Host "2. Updating backend-dev-policy..." -ForegroundColor Green
docker exec -e VAULT_ADDR='http://127.0.0.1:8200' -e VAULT_TOKEN='dev-root-token-123' vault-server vault policy write backend-dev-policy /tmp/policy.hcl

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== Policy Updated Successfully! ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "คุณสามารถเข้า Vault UI และจัดการ secrets ได้แล้ว:" -ForegroundColor Yellow
    Write-Host "  - URL: http://localhost:8200/ui" -ForegroundColor Cyan
    Write-Host "  - Token: dev-root-token-123" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "หรือใช้ CLI:" -ForegroundColor Yellow
    Write-Host '  docker exec -e VAULT_ADDR="http://127.0.0.1:8200" -e VAULT_TOKEN="dev-root-token-123" vault-server vault kv list kv/backend/' -ForegroundColor Cyan
    Write-Host '  docker exec -e VAULT_ADDR="http://127.0.0.1:8200" -e VAULT_TOKEN="dev-root-token-123" vault-server vault kv get kv/backend/config' -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "ERROR: Failed to update policy!" -ForegroundColor Red
    Write-Host "Make sure vault-server is running: docker ps | Select-String vault-server" -ForegroundColor Yellow
}
