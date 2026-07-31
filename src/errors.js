export class MetronApiError extends Error {
  constructor(message, { status, body, url } = {}) {
    super(message);
    this.name = 'MetronApiError';
    this.status = status;
    this.body = body;
    this.url = url;
  }
}

export class MetronRateLimitError extends MetronApiError {
  constructor(message, { status, body, url, retryAfter, limitType } = {}) {
    super(message, { status, body, url });
    this.name = 'MetronRateLimitError';
    this.retryAfter = retryAfter;
    this.limitType = limitType;
  }
}
