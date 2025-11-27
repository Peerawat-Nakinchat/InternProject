pid_file = "/tmp/pidfile"

vault {
  # แทนที่ด้วย IP
  address = "http://172.16.12.63:8200"
}

# ให้ agent ทำงานต่อเนื่องไม่หยุด
exit_after_auth = false

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

template_config {
  # ตรวจสอบ secret ทุก 5 วินาที
  static_secret_render_interval = "5s"
  exit_on_retry_failure = false
}

template {
  source      = "/vault/config/env.ctmpl"
  destination = "/secrets/.env"
  # รอจน secret พร้อมก่อน render
  error_on_missing_key = false
  # ไม่ต้องเปลี่ยน permission (Windows compatible)
  perms = 0644
}
