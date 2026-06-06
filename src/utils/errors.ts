export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string = 'INTERNAL_ERROR',
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      details: this.details,
    };
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFIGURATION_ERROR', 500, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Acesso não autorizado') {
    super(message, 'AUTHENTICATION_ERROR', 403);
  }
}

export class LLMError extends AppError {
  constructor(message: string, provider: string, details?: Record<string, unknown>) {
    super(message, 'LLM_ERROR', 502, { provider, ...details });
  }
}

export class TranscriptionError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'TRANSCRIPTION_ERROR', 502, details);
  }
}

export class FileProcessingError extends AppError {
  constructor(message: string, fileName: string, details?: Record<string, unknown>) {
    super(message, 'FILE_PROCESSING_ERROR', 422, { fileName, ...details });
  }
}

export class SkillError extends AppError {
  constructor(message: string, skillName: string, details?: Record<string, unknown>) {
    super(message, 'SKILL_ERROR', 500, { skillName, ...details });
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Muitas requisições. Tente novamente mais tarde.') {
    super(message, 'RATE_LIMIT_ERROR', 429);
  }
}
