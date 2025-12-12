// src/utils/moduleIcons.ts
// Utility สำหรับจับคู่ icon กับ Module Code

/**
 * Icon patterns สำหรับ ISO และมาตรฐานต่างๆ
 * สามารถเพิ่ม pattern ใหม่ได้ที่นี่
 */
const iconPatterns: Array<{ keywords: string[]; icon: string; category: string }> = [
  // === Information Security & Privacy ===
  { keywords: ['27001', 'isms'], icon: 'mdi-shield-lock', category: 'Information Security' },
  { keywords: ['27017', 'cloud security'], icon: 'mdi-cloud-lock', category: 'Cloud Security' },
  { keywords: ['27018', 'pii'], icon: 'mdi-account-lock', category: 'Personal Data in Cloud' },
  { keywords: ['27701', 'pims'], icon: 'mdi-account-key', category: 'Privacy Management' },
  { keywords: ['gdpr', 'pdpa', 'privacy'], icon: 'mdi-shield-account', category: 'Data Privacy' },
  
  // === Software & IT ===
  { keywords: ['29110', 'spice'], icon: 'mdi-code-braces', category: 'Software Engineering' },
  { keywords: ['20000', 'itsm', 'itil'], icon: 'mdi-server', category: 'IT Service Management' },
  { keywords: ['25010', 'software quality'], icon: 'mdi-code-tags', category: 'Software Quality' },
  { keywords: ['12207'], icon: 'mdi-sitemap', category: 'Software Lifecycle' },
  
  // === Environment & Sustainability ===
  { keywords: ['14064', 'carbon', 'ghg'], icon: 'mdi-molecule-co2', category: 'Carbon/GHG' },
  { keywords: ['14001', 'ems', 'environment'], icon: 'mdi-nature', category: 'Environment' },
  { keywords: ['14067', 'footprint'], icon: 'mdi-foot-print', category: 'Carbon Footprint' },
  { keywords: ['50001', 'energy', 'enms'], icon: 'mdi-lightning-bolt', category: 'Energy' },
  { keywords: ['sustainability', 'esg'], icon: 'mdi-sprout', category: 'ESG/Sustainability' },
  
  // === Quality & Business ===
  { keywords: ['9001', 'qms', 'quality'], icon: 'mdi-check-decagram', category: 'Quality' },
  { keywords: ['9004'], icon: 'mdi-trending-up', category: 'Quality Improvement' },
  { keywords: ['31000', 'risk'], icon: 'mdi-alert-decagram', category: 'Risk Management' },
  { keywords: ['37001', 'bribery', 'corruption'], icon: 'mdi-gavel', category: 'Anti-Bribery' },
  { keywords: ['22301', 'bcms', 'continuity'], icon: 'mdi-backup-restore', category: 'Business Continuity' },
  
  // === Health & Safety ===
  { keywords: ['45001', 'ohsms', 'safety'], icon: 'mdi-hard-hat', category: 'Occupational Safety' },
  { keywords: ['22000', 'fsms', 'food'], icon: 'mdi-food-apple', category: 'Food Safety' },
  { keywords: ['13485', 'medical'], icon: 'mdi-medical-bag', category: 'Medical Devices' },
  { keywords: ['15189', 'laboratory'], icon: 'mdi-flask', category: 'Medical Labs' },
  
  // === Automotive & Industry ===
  { keywords: ['iatf', '16949', 'automotive'], icon: 'mdi-car', category: 'Automotive' },
  { keywords: ['as9100', 'aerospace'], icon: 'mdi-airplane', category: 'Aerospace' },
  { keywords: ['55001', 'asset'], icon: 'mdi-package-variant', category: 'Asset Management' },
  
  // === Certification & Audit ===
  { keywords: ['17025', 'testing'], icon: 'mdi-test-tube', category: 'Testing Labs' },
  { keywords: ['19011', 'audit'], icon: 'mdi-clipboard-check', category: 'Auditing' },
]

/** Default icon เมื่อไม่ตรง pattern ใดๆ */
export const DEFAULT_MODULE_ICON = 'mdi-certificate'

/**
 * ดึง icon ตาม module code โดยใช้ pattern matching
 * @param moduleCode - รหัส module เช่น "ISO27001", "ISO-14064"
 * @returns MDI icon class name
 */
export function getModuleIcon(moduleCode: string): string {
  const code = moduleCode.toLowerCase()
  
  for (const pattern of iconPatterns) {
    if (pattern.keywords.some(keyword => code.includes(keyword))) {
      return pattern.icon
    }
  }
  
  return DEFAULT_MODULE_ICON
}

/**
 * ดึงข้อมูล pattern ทั้งหมด (สำหรับแสดง reference หรือ debug)
 */
export function getAllIconPatterns() {
  return iconPatterns
}

/**
 * Gradient colors สำหรับ module cards
 */
export const moduleGradients = [
  'bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/30',
  'bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-500/30',
  'bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30',
  'bg-gradient-to-br from-amber-500 to-amber-700 shadow-lg shadow-amber-500/30',
  'bg-gradient-to-br from-rose-500 to-rose-700 shadow-lg shadow-rose-500/30',
  'bg-gradient-to-br from-cyan-500 to-cyan-700 shadow-lg shadow-cyan-500/30',
  'bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-lg shadow-indigo-500/30',
  'bg-gradient-to-br from-pink-500 to-pink-700 shadow-lg shadow-pink-500/30',
]

/**
 * ดึง gradient ตาม index (หมุนเวียน)
 * @param index - ลำดับของ module
 */
export function getModuleGradient(index: number): string {
  return moduleGradients[index % moduleGradients.length] ?? moduleGradients[0]
}
