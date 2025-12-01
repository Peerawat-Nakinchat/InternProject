/// <reference types="vitest" />
/**
 * CookieConsent Component Unit Tests
 * ISO 27001 Annex A.8 - Cookie Consent UI Testing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, type DOMWrapper } from '@vue/test-utils'
import { localStorageMock } from '../setup'
import CookieConsent from '@/components/CookieConsent.vue'

// Constants used across all test suites
const CONSENT_KEY = 'cookie_consent'
const CONSENT_VERSION = '1.0'

// Helper function to find button by text
const findButtonByText = (
  buttons: DOMWrapper<Element>[],
  includeText: string,
  excludeText?: string
): DOMWrapper<Element> | undefined => {
  return buttons.find((btn: DOMWrapper<Element>) => {
    const text = btn.text()
    if (excludeText) {
      return text.includes(includeText) && !text.includes(excludeText)
    }
    return text.includes(includeText)
  })
}

describe('CookieConsent Component', () => {

  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  // ============================================================
  // VISIBILITY TESTS
  // ============================================================

  describe('Visibility', () => {
    it('should show banner when no consent exists', async () => {
      const wrapper = mount(CookieConsent)

      // Wait for mounted hook
      await wrapper.vm.$nextTick()

      // The banner should be visible
      expect(wrapper.find('.fixed').exists()).toBe(true)
    })

    it('should hide banner when valid consent exists', async () => {
      const consent = {
        type: 'all',
        version: CONSENT_VERSION,
        timestamp: new Date().toISOString()
      }
      localStorageMock.setItem(CONSENT_KEY, JSON.stringify(consent))

      const wrapper = mount(CookieConsent)
      await wrapper.vm.$nextTick()

      // Use a delay to allow transition
      await new Promise(resolve => setTimeout(resolve, 100))

      // Banner should not be visible
      expect(wrapper.find('.fixed').exists()).toBe(false)
    })

    it('should show banner when consent version is outdated', async () => {
      const oldConsent = {
        type: 'all',
        version: '0.5', // Old version
        timestamp: new Date().toISOString()
      }
      localStorageMock.setItem(CONSENT_KEY, JSON.stringify(oldConsent))

      const wrapper = mount(CookieConsent)
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.fixed').exists()).toBe(true)
    })

    it('should show banner when consent is invalid JSON', async () => {
      localStorageMock.setItem(CONSENT_KEY, 'invalid-json')

      const wrapper = mount(CookieConsent)
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.fixed').exists()).toBe(true)
    })
  })

  // ============================================================
  // BUTTON INTERACTIONS TESTS
  // ============================================================

  describe('Button Interactions', () => {
    it('should have "Accept" button', async () => {
      const wrapper = mount(CookieConsent)
      await wrapper.vm.$nextTick()

      const acceptButton = findButtonByText(wrapper.findAll('button'), 'ยอมรับ', 'เฉพาะ')
      expect(acceptButton?.exists()).toBe(true)
    })

    it('should have "Accept Essential Only" button', async () => {
      const wrapper = mount(CookieConsent)
      await wrapper.vm.$nextTick()

      const essentialButton = findButtonByText(wrapper.findAll('button'), 'เฉพาะที่จำเป็น')
      expect(essentialButton?.exists()).toBe(true)
    })

    it('should save "all" consent when Accept button is clicked', async () => {
      const wrapper = mount(CookieConsent)
      await wrapper.vm.$nextTick()

      const acceptButton = findButtonByText(wrapper.findAll('button'), 'ยอมรับ', 'เฉพาะ')
      await acceptButton?.trigger('click')

      expect(localStorageMock.setItem).toHaveBeenCalled()
      const stored = JSON.parse(localStorageMock.store[CONSENT_KEY]!)
      expect(stored.type).toBe('all')
      expect(stored.version).toBe(CONSENT_VERSION)
    })

    it('should save "essential" consent when Accept Essential button is clicked', async () => {
      const wrapper = mount(CookieConsent)
      await wrapper.vm.$nextTick()

      const essentialButton = findButtonByText(wrapper.findAll('button'), 'เฉพาะที่จำเป็น')
      await essentialButton?.trigger('click')

      expect(localStorageMock.setItem).toHaveBeenCalled()
      const stored = JSON.parse(localStorageMock.store[CONSENT_KEY]!)
      expect(stored.type).toBe('essential')
    })

    it('should hide banner after accepting cookies', async () => {
      const wrapper = mount(CookieConsent)
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.fixed').exists()).toBe(true)

      const acceptButton = findButtonByText(wrapper.findAll('button'), 'ยอมรับ', 'เฉพาะ')
      await acceptButton?.trigger('click')
      await wrapper.vm.$nextTick()

      // Wait for transition
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.find('.fixed').exists()).toBe(false)
    })
  })

  // ============================================================
  // DETAILS TOGGLE TESTS
  // ============================================================

  describe('Details Toggle', () => {
    it('should have toggle button for details', async () => {
      const wrapper = mount(CookieConsent)
      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAll('button')
      const toggleButton = findButtonByText(buttons, 'อ่านเพิ่มเติม') || findButtonByText(buttons, 'ซ่อนรายละเอียด')
      expect(toggleButton?.exists()).toBe(true)
    })

    it('should show details when toggle is clicked', async () => {
      const wrapper = mount(CookieConsent)
      await wrapper.vm.$nextTick()

      // Details should be hidden initially
      expect(wrapper.find('.bg-gray-50').exists()).toBe(false)

      const toggleButton = findButtonByText(wrapper.findAll('button'), 'อ่านเพิ่มเติม')
      await toggleButton?.trigger('click')
      await wrapper.vm.$nextTick()

      // Details should now be visible
      expect(wrapper.find('.bg-gray-50').exists()).toBe(true)
    })

    it('should hide details when toggle is clicked again', async () => {
      const wrapper = mount(CookieConsent)
      await wrapper.vm.$nextTick()

      // Open details
      let toggleButton = findButtonByText(wrapper.findAll('button'), 'อ่านเพิ่มเติม')
      await toggleButton?.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.bg-gray-50').exists()).toBe(true)

      // Close details
      toggleButton = findButtonByText(wrapper.findAll('button'), 'ซ่อนรายละเอียด')
      await toggleButton?.trigger('click')
      await wrapper.vm.$nextTick()

      // Wait for transition
      await new Promise(resolve => setTimeout(resolve, 300))

      expect(wrapper.find('.bg-gray-50').exists()).toBe(false)
    })
  })

  // ============================================================
  // CONTENT TESTS
  // ============================================================

  describe('Content', () => {
    it('should display cookie icon', async () => {
      const wrapper = mount(CookieConsent)
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('🍪')
    })

    it('should display title', async () => {
      const wrapper = mount(CookieConsent)
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('เว็บไซต์นี้ใช้คุกกี้')
    })

    it('should display information about authentication cookies in details', async () => {
      const wrapper = mount(CookieConsent)
      await wrapper.vm.$nextTick()

      const toggleButton = findButtonByText(wrapper.findAll('button'), 'อ่านเพิ่มเติม')
      await toggleButton?.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('คุกกี้การยืนยันตัวตน')
      expect(wrapper.text()).toContain('คุกกี้ความปลอดภัย')
    })
  })
})

// ============================================================
// ACCESSIBILITY TESTS
// ============================================================

describe('CookieConsent Accessibility', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  it('should have accessible button labels', async () => {
    const wrapper = mount(CookieConsent)
    await wrapper.vm.$nextTick()

    const buttons = wrapper.findAll('button')
    buttons.forEach((button: DOMWrapper<Element>) => {
      expect(button.text().length).toBeGreaterThan(0)
    })
  })

  it('should use semantic heading element', async () => {
    const wrapper = mount(CookieConsent)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('h3').exists()).toBe(true)
  })

  it('should have proper contrast colors for buttons', async () => {
    const wrapper = mount(CookieConsent)
    await wrapper.vm.$nextTick()

    const primaryButton = findButtonByText(wrapper.findAll('button'), 'ยอมรับ', 'เฉพาะ')

    // Purple button should have white text
    expect(primaryButton?.classes()).toContain('text-white')
    expect(primaryButton?.classes()).toContain('bg-purple-600')
  })
})

// ============================================================
// SECURITY COMPLIANCE TESTS
// ============================================================

describe('CookieConsent Security Compliance (ISO 27001)', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  describe('Consent Versioning', () => {
    it('should include version in stored consent', async () => {
      const wrapper = mount(CookieConsent)
      await wrapper.vm.$nextTick()

      const acceptButton = findButtonByText(wrapper.findAll('button'), 'ยอมรับ', 'เฉพาะ')
      await acceptButton?.trigger('click')

      const stored = JSON.parse(localStorageMock.store[CONSENT_KEY]!)
      expect(stored.version).toBeDefined()
    })
  })

  describe('Audit Trail', () => {
    it('should include timestamp in stored consent', async () => {
      const wrapper = mount(CookieConsent)
      await wrapper.vm.$nextTick()

      const acceptButton = findButtonByText(wrapper.findAll('button'), 'ยอมรับ', 'เฉพาะ')
      await acceptButton?.trigger('click')

      const stored = JSON.parse(localStorageMock.store[CONSENT_KEY]!)
      expect(stored.timestamp).toBeDefined()
      expect(() => new Date(stored.timestamp)).not.toThrow()
    })
  })

  describe('Transparency', () => {
    it('should provide option to view cookie details', async () => {
      const wrapper = mount(CookieConsent)
      await wrapper.vm.$nextTick()

      const toggleButton = findButtonByText(wrapper.findAll('button'), 'อ่านเพิ่มเติม')
      expect(toggleButton?.exists()).toBe(true)
    })

    it('should clearly state what cookies are used for', async () => {
      const wrapper = mount(CookieConsent)
      await wrapper.vm.$nextTick()

      const toggleButton = findButtonByText(wrapper.findAll('button'), 'อ่านเพิ่มเติม')
      await toggleButton?.trigger('click')
      await wrapper.vm.$nextTick()

      const text = wrapper.text()
      expect(text).toContain('ยืนยันตัวตน')
      expect(text).toContain('ความปลอดภัย')
    })

    it('should clarify that cookies are NOT used for tracking', async () => {
      const wrapper = mount(CookieConsent)
      await wrapper.vm.$nextTick()

      const toggleButton = findButtonByText(wrapper.findAll('button'), 'อ่านเพิ่มเติม')
      await toggleButton?.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('ไม่ใช้คุกกี้เพื่อการโฆษณา')
    })
  })

  describe('User Choice', () => {
    it('should provide option to accept only essential cookies', async () => {
      const wrapper = mount(CookieConsent)
      await wrapper.vm.$nextTick()

      const essentialButton = findButtonByText(wrapper.findAll('button'), 'เฉพาะที่จำเป็น')
      expect(essentialButton?.exists()).toBe(true)
    })
  })
})
