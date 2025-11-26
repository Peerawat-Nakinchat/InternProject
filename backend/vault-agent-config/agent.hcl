pid_file = "/tmp/pidfile"

vault {
  # ใช้ชื่อ container เมื่ออยู่ใน network เดียวกัน
  address = "http://vault-server:8200"
}

auto_auth {
  method "approle" {
    mount_path = "auth/approle"
    config = {
      role_id_file_path = "/vault/config/role-id"
      secret_id_file_path = "/vault/config/secret-id"
      remove_secret_id_file_after_reading = false
    }
  }

  sink "file" {
    config = {
      path = "/vault/config/token-sink"
    }
  }
}

template {
  source      = "/vault/config/env.ctmpl"
  destination = "/secrets/.env"
}
