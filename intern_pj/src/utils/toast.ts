// src/utils/toast.ts
// Utility functions for displaying notifications using SweetAlert2

import Swal from 'sweetalert2'

// Toast configuration (small popup at top-right)
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer
    toast.onmouseleave = Swal.resumeTimer
  }
})

// ==================== TOAST FUNCTIONS ====================

/**
 * แสดง Toast แจ้งเตือนสำเร็จ
 * @param message ข้อความที่ต้องการแสดง
 * @param title หัวข้อ (optional)
 */
export const success = (message: string, title?: string) => {
  return Toast.fire({
    icon: 'success',
    title: title || 'สำเร็จ',
    text: message
  })
}

/**
 * แสดง Toast แจ้งเตือน Error
 * @param message ข้อความที่ต้องการแสดง
 * @param title หัวข้อ (optional)
 */
export const error = (message: string, title?: string) => {
  return Toast.fire({
    icon: 'error',
    title: title || 'เกิดข้อผิดพลาด',
    text: message,
    timer: 5000 // Error shows longer
  })
}

/**
 * แสดง Toast แจ้งเตือน Warning
 * @param message ข้อความที่ต้องการแสดง
 * @param title หัวข้อ (optional)
 */
export const warning = (message: string, title?: string) => {
  return Toast.fire({
    icon: 'warning',
    title: title || 'คำเตือน',
    text: message
  })
}

/**
 * แสดง Toast แจ้งเตือน Info
 * @param message ข้อความที่ต้องการแสดง
 * @param title หัวข้อ (optional)
 */
export const info = (message: string, title?: string) => {
  return Toast.fire({
    icon: 'info',
    title: title || 'แจ้งเตือน',
    text: message
  })
}

// ==================== DIALOG FUNCTIONS ====================

/**
 * แสดง Confirm Dialog (ถามยืนยัน)
 * @param message ข้อความที่ต้องการแสดง
 * @param title หัวข้อ (optional)
 * @returns Promise<boolean> - true ถ้ายืนยัน, false ถ้ายกเลิก
 */
export const confirm = async (
  message: string,
  title?: string,
  options?: {
    confirmText?: string
    cancelText?: string
    icon?: 'warning' | 'question' | 'info'
  }
): Promise<boolean> => {
  const result = await Swal.fire({
    title: title || 'ยืนยันการดำเนินการ',
    text: message,
    icon: options?.icon || 'question',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: options?.confirmText || 'ยืนยัน',
    cancelButtonText: options?.cancelText || 'ยกเลิก'
  })

  return result.isConfirmed
}

/**
 * แสดง Confirm Dialog สำหรับการลบ (สีแดง)
 * @param itemName ชื่อรายการที่จะลบ
 * @returns Promise<boolean>
 */
export const confirmDelete = async (itemName?: string): Promise<boolean> => {
  const result = await Swal.fire({
    title: 'ยืนยันการลบ',
    text: itemName ? `ต้องการลบ "${itemName}" ใช่หรือไม่?` : 'การดำเนินการนี้ไม่สามารถย้อนกลับได้',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'ลบ',
    cancelButtonText: 'ยกเลิก'
  })

  return result.isConfirmed
}

// ==================== LOADING FUNCTIONS ====================

/**
 * แสดง Loading Spinner
 * @param message ข้อความ (optional)
 */
export const loading = (message?: string) => {
  return Swal.fire({
    title: message || 'กำลังดำเนินการ...',
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading()
    }
  })
}

/**
 * ปิด Popup/Loading ที่เปิดอยู่
 */
export const close = () => {
  Swal.close()
}

// ==================== EXPORT ====================

export const toast = {
  success,
  error,
  warning,
  info,
  confirm,
  confirmDelete,
  loading,
  close
}

export default toast
