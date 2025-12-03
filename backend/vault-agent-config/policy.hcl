# Policy สำหรับทีม Backend - จัดการ secrets ได้เต็มรูปแบบ
# KV v2 - data path (อ่าน/เขียน secrets)
path "kv/data/backend/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# KV v2 - metadata path (จัดการ metadata และ versions)
path "kv/metadata/backend/*" {
  capabilities = ["read", "list", "delete"]
}

# KV v2 - delete path (soft delete versions)
path "kv/delete/backend/*" {
  capabilities = ["update"]
}

# KV v2 - undelete path (restore versions)
path "kv/undelete/backend/*" {
  capabilities = ["update"]
}

# KV v2 - destroy path (permanent delete)
path "kv/destroy/backend/*" {
  capabilities = ["update"]
}

# List KV mount (เพื่อให้เห็น secrets engine ใน UI)
path "kv/metadata" {
  capabilities = ["list"]
}

# List backend path
path "kv/metadata/backend" {
  capabilities = ["list"]
}
