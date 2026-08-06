/**
 * Enhanced API Client with Retry, Caching, and Error Handling
 * Features:
 * - Automatic retry with exponential backoff (3 attempts)
 * - Response caching with TTL
 * - Request deduplication (in-flight requests)
 * - Loading state management
 * - Comprehensive error handling
 * - Request/response interceptors
 */

import { API_CONFIG } from "./config"

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

export interface RequestConfig {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  token?: string
  // Query string parameters, e.g. { tenant_id } for knowledge-service's /v1/documents endpoints,
  // which require tenant_id as a query param (never in the body).
  params?: Record<string, string>
  cache?: boolean
  cacheTTL?: number
  retryable?: boolean
  timeout?: number
}

export interface ApiResponse<T = unknown> {
  status: 'success' | 'error'
  message?: string
  response?: T
  detail?: any
}

/**
 * API Error class for structured error handling
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public details: any = {}
  ) {
    super(`API Error ${status}: ${statusText}`)
    this.name = 'ApiError'
  }

  isNetworkError(): boolean {
    return this.status >= 500 || this.status === 0
  }

  isAuthError(): boolean {
    return this.status === 401 || this.status === 403
  }

  isValidationError(): boolean {
    return this.status === 422 || this.status === 400
  }

  isTimeout(): boolean {
    return this.status === 408 || this.statusText === 'Timeout'
  }

  isRetryable(): boolean {
    return this.isNetworkError() || this.isTimeout() || this.status === 429
  }
}

/**
 * Enhanced API Client with retry, caching, and deduplication
 */
export class ApiClient {
  private baseUrl: string
  private cache = new Map<string, CacheEntry<any>>()
  private inFlightRequests = new Map<string, Promise<any>>()
  private requestLoadingStates = new Map<string, boolean>()
  private cleanupInterval: NodeJS.Timer | null = null
  private refreshTokenCallback: (() => Promise<string | null>) | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
    this.startCacheCleanup()
  }

  setRefreshTokenCallback(cb: () => Promise<string | null>): void {
    this.refreshTokenCallback = cb
  }

  async refreshToken(): Promise<string | null> {
    if (!this.refreshTokenCallback) return null
    return this.refreshTokenCallback()
  }

  /**
   * Main request method with retry, cache, and error handling
   */
  async request<T>(config: RequestConfig): Promise<ApiResponse<T>> {
    const cacheKey = `${config.method}:${config.url}${config.params ? `?${new URLSearchParams(config.params).toString()}` : ''}`

    // Return cached response if valid and cacheable
    if (config.cache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!
      if (Date.now() - cached.timestamp < cached.ttl) {
        console.log(`[Cache HIT] ${cacheKey}`)
        return { status: 'success', response: cached.data }
      }
      this.cache.delete(cacheKey)
    }

    // Deduplicate in-flight requests
    if (this.inFlightRequests.has(cacheKey)) {
      console.log(`[Dedup] ${cacheKey} - reusing in-flight request`)
      return this.inFlightRequests.get(cacheKey)!
    }

    // Mark as loading
    this.requestLoadingStates.set(cacheKey, true)

    // Execute request with retry
    const promise = this.executeWithRetry<T>(config, 1, 3)
      .then(result => {
        // Cache successful response if cacheable
        if (config.cache && result.status === 'success' && result.response) {
          this.cache.set(cacheKey, {
            data: result.response,
            timestamp: Date.now(),
            ttl: config.cacheTTL || 5 * 60 * 1000, // 5 min default
          })
          console.log(`[Cached] ${cacheKey} (${(config.cacheTTL || 5 * 60 * 1000) / 1000}s TTL)`)
        }
        return result
      })
      .finally(() => {
        this.requestLoadingStates.delete(cacheKey)
        this.inFlightRequests.delete(cacheKey)
      })

    // Store in-flight request
    this.inFlightRequests.set(cacheKey, promise)

    return promise
  }

  /**
   * Execute request with exponential backoff retry
   */
  private async executeWithRetry<T>(
    config: RequestConfig,
    attempt: number = 1,
    maxAttempts: number = 3
  ): Promise<ApiResponse<T>> {
    try {
      return await this.executeRequest<T>(config)
    } catch (error) {
      // On 401/403, attempt token refresh and retry once
      if (
        error instanceof ApiError &&
        error.isAuthError() &&
        this.refreshTokenCallback &&
        attempt === 1
      ) {
        console.warn(`[Auth Retry] ${config.method} ${config.url} - attempting token refresh`)
        const newToken = await this.refreshTokenCallback()
        if (newToken) {
          const retryConfig = { ...config, token: newToken }
          return this.executeWithRetry(retryConfig, attempt + 1, maxAttempts)
        }
      }

      const isRetryable = config.retryable !== false && error instanceof ApiError && error.isRetryable()

      if (attempt < maxAttempts && isRetryable) {
        const delay = Math.pow(2, attempt - 1) * 1000 // 1s, 2s, 4s
        console.warn(
          `[Retry ${attempt}/${maxAttempts}] ${config.method} ${config.url} after ${delay}ms`,
          error.message
        )
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.executeWithRetry(config, attempt + 1, maxAttempts)
      }

      // Return error response
      if (error instanceof ApiError) {
        return {
          status: 'error',
          message: error.message,
          detail: error.details,
        }
      }

      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Execute single request
   */
  private async executeRequest<T>(config: RequestConfig): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'ngrok-skip-browser-warning': 'true',
    }

    // Only set Content-Type for non-FormData
    if (!(config.data instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }

    // Add authorization header
    if (config.token) {
      headers['Authorization'] = `Bearer ${config.token}`
    }

    let url = `${this.baseUrl}${config.url}`
    if (config.params && Object.keys(config.params).length > 0) {
      const query = new URLSearchParams(config.params).toString()
      url += (url.includes('?') ? '&' : '?') + query
    }
    const timeout = config.timeout || 30000

    // Setup timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        method: config.method,
        headers,
        body: config.data
          ? config.data instanceof FormData
            ? config.data
            : JSON.stringify(config.data)
          : undefined,
        signal: controller.signal,
      })

      // Handle non-OK responses
      if (!response.ok) {
        let errorData: any = {}
        try {
          errorData = await response.json()
        } catch {
          errorData = { detail: response.statusText }
        }

        throw new ApiError(response.status, response.statusText, errorData)
      }

      // Parse and return successful response
      const result = await response.json()
      return result as ApiResponse<T>
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError(408, 'Request Timeout', { timeout })
      }

      if (error instanceof TypeError) {
        throw new ApiError(0, 'Network Error', { originalError: error.message })
      }

      throw new ApiError(0, 'Unknown Error', { originalError: error })
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Check if a request is currently loading
   */
  isLoading(method: string, url: string): boolean {
    return this.requestLoadingStates.get(`${method}:${url}`) ?? false
  }

  /**
   * Clear cache entries matching pattern or all
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key)
          console.log(`[Cache Cleared] ${key}`)
        }
      }
    } else {
      console.log(`[Cache Cleared] All (${this.cache.size} entries)`)
      this.cache.clear()
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }

  /**
   * Periodic cache cleanup - removes expired entries
   */
  private startCacheCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      let cleaned = 0

      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(key)
          cleaned++
        }
      }

      if (cleaned > 0) {
        console.log(`[Cache Cleanup] Removed ${cleaned} expired entries`)
      }
    }, 60000) // Every minute
  }

  /**
   * Cleanup on destroy
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval as NodeJS.Timeout)
    }
    this.cache.clear()
    this.inFlightRequests.clear()
    this.requestLoadingStates.clear()
  }
}

// Create singleton instance
export const apiClient = new ApiClient(API_CONFIG.BASE_URL)

// For debugging in browser console
if (typeof window !== 'undefined') {
  (window as any).__apiClient = apiClient
}

export default apiClient
