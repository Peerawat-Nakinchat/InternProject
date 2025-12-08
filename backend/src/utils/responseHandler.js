export class ResponseHandler {
  static success(res, data, message = "Success", statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  static created(res, data, message = "Created") {
    return this.success(res, data, message, 201);
  }

  static error(res, message = "Error", statusCode = 400, data = null) {
    return res.status(statusCode).json({
      success: false,
      error: message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  static unauthorized(res, message = "Unauthorized") {
    return this.error(res, message, 401);
  }

  static forbidden(res, message = "Forbidden") {
    return this.error(res, message, 403);
  }

  static notFound(res, message = "Not Found") {
    return this.error(res, message, 404);
  }
}
