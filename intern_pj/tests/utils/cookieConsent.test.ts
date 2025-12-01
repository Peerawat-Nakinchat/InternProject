/// <reference types="vitest" />
/**
 * Cookie Consent Utility Unit Tests
 * ISO 27001 Annex A.8 - Cookie Consent Management Testing
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { localStorageMock } from '../setup'
import {
  hasConsent,
  getConsent,
  saveConsent,
  clearConsent,
  hasFullConsent,
  hasEssentialConsent
} from '@/utils/cookieConsent'

describe('Cookie Consent Utility', () => {
  const CONSENT_KEY = 'cookie_consent'
  const CONSENT_VERSION = '1.0'

  beforeEach(() => {
    localStorageMock.clear()
  })

  // ============================================================
  // HAS CONSENT TESTS
  // ============================================================

  describe('hasConsent', () => {
    it('should return false when no consent is stored', () => {
      expect(hasConsent()).toBe(false)
    })

    it('should return true when valid consent is stored', () => {
      const consent = {
        type: 'all',
        version: CONSENT_VERSION,
        timestamp: new Date().toISOString()
      }
      localStorageMock.setItem(CONSENT_KEY, JSON.stringify(consent))

      expect(hasConsent()).toBe(true)
    })

    it('should return false when consent version mismatch', () => {
      const consent = {
        type: 'all',
        version: '0.9', // Old version
        timestamp: new Date().toISOString()
      }
      localStorageMock.setItem(CONSENT_KEY, JSON.stringify(consent))

      expect(hasConsent()).toBe(false)
    })

    it('should return false when consent is invalid JSON', () => {
      localStorageMock.setItem(CONSENT_KEY, 'invalid-json')

      expect(hasConsent()).toBe(false)
    })
  })

  // ============================================================
  // GET CONSENT TESTS
  // ============================================================

  describe('getConsent', () => {
    it('should return null when no consent is stored', () => {
      expect(getConsent()).toBeNull()
    })

    it('should return consent object when valid consent exists', () => {
      const consent = {
        type: 'all',
        version: CONSENT_VERSION,
        timestamp: '2024-01-01T00:00:00.000Z'
      }
      localStorageMock.setItem(CONSENT_KEY, JSON.stringify(consent))

      const result = getConsent()

      expect(result).toEqual(consent)
    })

    it('should return null for invalid JSON', () => {
      localStorageMock.setItem(CONSENT_KEY, 'not-json')

      expect(getConsent()).toBeNull()
    })
  })

  // ============================================================
  // SAVE CONSENT TESTS
  // ============================================================

  describe('saveConsent', () => {
    it('should save consent with type "all"', () => {
      saveConsent('all')

      expect(localStorageMock.setItem).toHaveBeenCalled()
      const stored = JSON.parse(localStorageMock.store[CONSENT_KEY]!)
      expect(stored.type).toBe('all')
      expect(stored.version).toBe(CONSENT_VERSION)
      expect(stored.timestamp).toBeDefined()
    })

    it('should save consent with type "essential"', () => {
      saveConsent('essential')

      const stored = JSON.parse(localStorageMock.store[CONSENT_KEY]!)
      expect(stored.type).toBe('essential')
    })

    it('should include timestamp in ISO format', () => {
      saveConsent('all')

      const stored = JSON.parse(localStorageMock.store[CONSENT_KEY]!)
      expect(() => new Date(stored.timestamp)).not.toThrow()
    })
  })

  // ============================================================
  // CLEAR CONSENT TESTS
  // ============================================================

  describe('clearConsent', () => {
    it('should remove consent from localStorage', () => {
      saveConsent('all')
      expect(localStorageMock.store[CONSENT_KEY]).toBeDefined()

      clearConsent()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(CONSENT_KEY)
    })
  })

  // ============================================================
  // HAS FULL CONSENT TESTS
  // ============================================================

  describe('hasFullConsent', () => {
    it('should return true when consent type is "all"', () => {
      saveConsent('all')

      expect(hasFullConsent()).toBe(true)
    })

    it('should return false when consent type is "essential"', () => {
      saveConsent('essential')

      expect(hasFullConsent()).toBe(false)
    })

    it('should return false when no consent exists', () => {
      expect(hasFullConsent()).toBe(false)
    })

    it('should return false for outdated consent version', () => {
      const consent = {
        type: 'all',
        version: '0.5',
        timestamp: new Date().toISOString()
      }
      localStorageMock.setItem(CONSENT_KEY, JSON.stringify(consent))

      expect(hasFullConsent()).toBe(false)
    })
  })

  // ============================================================
  // HAS ESSENTIAL CONSENT TESTS
  // ============================================================

  describe('hasEssentialConsent', () => {
    it('should return true when consent type is "essential"', () => {
      saveConsent('essential')

      expect(hasEssentialConsent()).toBe(true)
    })

    it('should return true when consent type is "all"', () => {
      saveConsent('all')

      expect(hasEssentialConsent()).toBe(true)
    })

    it('should return false when no consent exists', () => {
      expect(hasEssentialConsent()).toBe(false)
    })

    it('should return false for outdated consent version', () => {
      const consent = {
        type: 'essential',
        version: '0.5',
        timestamp: new Date().toISOString()
      }
      localStorageMock.setItem(CONSENT_KEY, JSON.stringify(consent))

      expect(hasEssentialConsent()).toBe(false)
    })
  })
})

// ============================================================
// SECURITY COMPLIANCE TESTS
// ============================================================

describe('Cookie Consent Security Compliance (ISO 27001)', () => {
  const CONSENT_KEY = 'cookie_consent'

  beforeEach(() => {
    localStorageMock.clear()
  })

  describe('Version Control', () => {
    it('should require re-consent when version changes', () => {
      // Simulate old consent
      const oldConsent = {
        type: 'all',
        version: '0.9',
        timestamp: new Date().toISOString()
      }
      localStorageMock.setItem(CONSENT_KEY, JSON.stringify(oldConsent))

      // Should require new consent
      expect(hasConsent()).toBe(false)
      expect(hasEssentialConsent()).toBe(false)
      expect(hasFullConsent()).toBe(false)
    })
  })

  describe('Audit Trail', () => {
    it('should store timestamp for audit purposes', () => {
      const beforeSave = new Date()
      saveConsent('all')
      const afterSave = new Date()

      const consent = getConsent()
      const timestamp = new Date(consent!.timestamp)

      expect(timestamp >= beforeSave).toBe(true)
      expect(timestamp <= afterSave).toBe(true)
    })
  })

  describe('Data Integrity', () => {
    it('should handle corrupted consent data gracefully', () => {
      localStorageMock.setItem(CONSENT_KEY, '{invalid')

      expect(hasConsent()).toBe(false)
      expect(getConsent()).toBeNull()
      expect(hasEssentialConsent()).toBe(false)
    })

    it('should handle missing fields gracefully', () => {
      localStorageMock.setItem(CONSENT_KEY, JSON.stringify({ type: 'all' }))

      expect(hasConsent()).toBe(false)
    })
  })
})
