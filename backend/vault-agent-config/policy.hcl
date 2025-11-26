# Policy สำหรับทีม Backend - อ่านได้เฉพาะข้อมูล backend
path "kv/data/backend/*" {
  capabilities = ["read", "list"]
}

path "kv/metadata/backend/*" {
  capabilities = ["read", "list"]
}
