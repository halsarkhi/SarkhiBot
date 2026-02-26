import { getLogger } from './logger.js';

/**
 * Token-bucket rate limiter for API calls and user commands.
 * Prevents abuse and protects external API rate limits.
 */
export class RateLimiter {
  constructor({ maxTokens = 10, refillRate = 1, refillIntervalMs = 1000 } = {}) {
    this._buckets = new Map();
    this._maxTokens = maxTokens;
    this._refillRate = refillRate;
    this._refillIntervalMs = refillIntervalMs;
  }

  _getBucket(key) {
    if (!this._buckets.has(key)) {
      this._buckets.set(key, { tokens: this._maxTokens, lastRefill: Date.now() });
    }
    const bucket = this._buckets.get(key);
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor(elapsed / this._refillIntervalMs) * this._refillRate;
    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(this._maxTokens, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }
    return bucket;
  }

  /**
   * Try to consume a token. Returns true if allowed, false if rate limited.
   */
  tryConsume(key, cost = 1) {
    const bucket = this._getBucket(key);
    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      return true;
    }
    return false;
  }

  /**
   * Get remaining tokens for a key.
   */
  remaining(key) {
    return this._getBucket(key).tokens;
  }

  /**
   * Get time until next token is available (ms).
   */
  retryAfterMs(key) {
    const bucket = this._getBucket(key);
    if (bucket.tokens > 0) return 0;
    return this._refillIntervalMs - (Date.now() - bucket.lastRefill);
  }

  /**
   * Reset a specific key's bucket.
   */
  reset(key) {
    this._buckets.delete(key);
  }

  /**
   * Clean up stale buckets older than maxAgeMs.
   */
  cleanup(maxAgeMs = 3600_000) {
    const cutoff = Date.now() - maxAgeMs;
    for (const [key, bucket] of this._buckets) {
      if (bucket.lastRefill < cutoff) this._buckets.delete(key);
    }
  }
}

// Shared instances for common use cases
export const commandLimiter = new RateLimiter({ maxTokens: 20, refillRate: 1, refillIntervalMs: 3000 });
export const apiLimiter = new RateLimiter({ maxTokens: 30, refillRate: 2, refillIntervalMs: 1000 });
