/**
 * Base class for all Kaiten API errors.
 * Mirrors the error hierarchy from KaitenApiException.kt
 */
export class KaitenApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KaitenApiError';
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Thrown when authentication fails (401)
 */
export class UnauthorizedError extends KaitenApiError {
  constructor(message: string = 'Unauthorized: Invalid token') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Thrown when access is forbidden (403)
 */
export class ForbiddenError extends KaitenApiError {
  constructor(message: string = 'Forbidden: Insufficient permissions') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Thrown when a resource is not found (404)
 */
export class NotFoundError extends KaitenApiError {
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * Thrown when a server error occurs (5xx)
 */
export class ServerError extends KaitenApiError {
  constructor(message: string = 'Server error occurred') {
    super(message);
    this.name = 'ServerError';
  }
}

/**
 * Thrown when a network error occurs
 */
export class NetworkError extends KaitenApiError {
  constructor(message: string = 'Network error occurred') {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Thrown when a request times out
 */
export class TimeoutError extends KaitenApiError {
  constructor(message: string = 'Request timeout') {
    super(message);
    this.name = 'TimeoutError';
  }
}
