// src/utils/AppError.js
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Error ที่เรารู้จักและคาดการณ์ได้
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;