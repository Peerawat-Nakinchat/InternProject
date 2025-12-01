// src/utils/cookieConsent.ts
/**
 * Utility functions สำหรับจัดการ Cookie Consent
 */

const CONSENT_KEY = 'cookie_consent'
const CONSENT_VERSION = '1.0'

export interface CookieConsent {
  type: 'all' | 'essential'
  version: string
  timestamp: string
}

/**
 * ตรวจสอบว่าผู้ใช้ยินยอมให้เก็บ cookies หรือยัง
 */
export const hasConsent = (): boolean => {
  const consent = localStorage.getItem(CONSENT_KEY)
  if (!consent) return false

  try {
    const parsed: CookieConsent = JSON.parse(consent)
    return parsed.version === CONSENT_VERSION
  } catch {
    return false
  }
}

/**
 * ดึงข้อมูล consent
 */
export const getConsent = (): CookieConsent | null => {
  const consent = localStorage.getItem(CONSENT_KEY)
  if (!consent) return null

  try {
    return JSON.parse(consent)
  } catch {
    return null
  }
}

/**
 * บันทึก consent
 */
export const saveConsent = (type: 'all' | 'essential'): void => {
  const consent: CookieConsent = {
    type,
    version: CONSENT_VERSION,
    timestamp: new Date().toISOString(),
  }
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent))
}

/**
 * ลบ consent (สำหรับ testing หรือ reset)
 */
export const clearConsent = (): void => {
  localStorage.removeItem(CONSENT_KEY)
}

/**
 * ตรวจสอบว่ายินยอม cookies ทั้งหมดหรือไม่
 */
export const hasFullConsent = (): boolean => {
  const consent = getConsent()
  return consent?.type === 'all' && consent?.version === CONSENT_VERSION
}

/**
 * ตรวจสอบว่ายินยอมเฉพาะ essential cookies หรือไม่
 */
export const hasEssentialConsent = (): boolean => {
  const consent = getConsent()
  if (!consent || consent.version !== CONSENT_VERSION) return false
  return consent.type === 'essential' || consent.type === 'all'
}
