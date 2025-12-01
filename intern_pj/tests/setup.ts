/// <reference types="vitest" />
/**
 * Vitest Test Setup
 * ISO 27001 Annex A.8 - Frontend Test Environment Configuration
 */

import { vi, beforeEach } from 'vitest'
import { config } from '@vue/test-utils'
import type { DOMWrapper } from '@vue/test-utils'

// Export type for button wrapper
export type ButtonWrapper = DOMWrapper<Element>

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key]
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {}
  }),
  get length() {
    return Object.keys(this.store).length
  },
  key: vi.fn((index: number) => Object.keys(localStorageMock.store)[index] || null)
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
})

// Mock fetch
global.fetch = vi.fn()

// Mock console for cleaner test output
const originalConsole = { ...console }
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  group: vi.fn(),
  groupEnd: vi.fn()
}

// Helper to enable console logging in tests if needed
const globalWithHelpers = global as typeof global & { enableTestLogs: () => void }
globalWithHelpers.enableTestLogs = () => {
  global.console = originalConsole
}

// Reset mocks before each test
beforeEach(() => {
  localStorageMock.store = {}
  vi.clearAllMocks()
})

// Vue Test Utils global configuration
config.global.stubs = {
  // Stub router-link and router-view for component tests
  'router-link': true,
  'router-view': true,
  // Stub transitions for faster tests
  transition: false,
  'transition-group': false
}

// Export for use in tests
export { localStorageMock }
