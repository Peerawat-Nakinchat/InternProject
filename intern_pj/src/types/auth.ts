
// ============================================
// TRUSTED DEVICES TYPES
// ============================================

export interface TrustedDevice {
  device_id: string
  device_name: string
  device_fingerprint: string
  ip_address: string
  last_used_at: string
  expires_at: string
  is_current?: boolean
}
