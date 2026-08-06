// Unified API configuration for both HTTP and WebSocket connections
// Uses environment variables for flexible backend configuration

// HTTP requests go through this Next.js server's own /v1/* rewrite (see
// next.config.mjs) rather than a direct cross-origin call, so BASE_URL is
// same-origin (empty) by default — NEXT_PUBLIC_API_URL remains a supported
// override for anyone who wants the browser to call a backend directly
// instead, bypassing the proxy.
const getApiUrlFromEnv = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, ''); // Remove trailing slash
  }
  return "";
};

// WebSocket connections are NOT proxied (Next.js rewrites don't handle the
// upgrade handshake), so this always needs a real absolute URL the browser
// can reach directly — it can't be derived from the now-relative API URL.
const getWsUrlFromEnv = (): string => {
  const envWsUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (envWsUrl) {
    return envWsUrl.replace(/\/$/, ''); // Remove trailing slash
  }
  return "ws://localhost:9001";
};

// Get CMS prefix (now /v1/cms for go-core)
const getCmsPrefix = (): string => {
  return process.env.NEXT_PUBLIC_CMS_PREFIX || "/v1/cms";
};

// Get site URL from environment variables
const getSiteUrl = (): string => {
  return process.env.NEXT_PUBLIC_SITE_URL || "";
};

// Get actual site URL (works on both server and client)
export const getActualSiteUrl = (): string => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return getSiteUrl() || "http://localhost:3000";
};

export const API_CONFIG = {
  // Base URL for all API connections (from environment)
  BASE_URL: getApiUrlFromEnv(),
  
  // WebSocket URL (from environment or derived)
  WS_URL: getWsUrlFromEnv(),
  
  // CMS prefix (from environment)
  CMS_PREFIX: getCmsPrefix(),

  // Site URL for generating links (from environment or derived from window in client)
  SITE_URL: getSiteUrl(),
  
  // Additional configuration
  TIMEOUT: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || "30000"),
  DEBUG: process.env.NEXT_PUBLIC_DEBUG === "true",
  ENABLE_CORS_FALLBACK: process.env.NEXT_PUBLIC_ENABLE_CORS_FALLBACK !== "false",
  REFRESH_TOKEN_KEY: "refresh_token",
  
  // API endpoints
  ENDPOINTS: {
    // Auth endpoints
    LOGIN: "/v1/auth/login",
    REFRESH: "/v1/auth/refresh",
    CMS_LOGIN: "/v1/auth/cms-login",
    TOKEN_VALIDATE: "/v1/token/validate",

    // API Keys endpoints
    API_KEYS_LIST: "/v1/api-keys",
    API_KEYS_CREATE: "/v1/api-keys",
    API_KEYS_DELETE: "/v1/api-keys",

    // Query endpoints
    SEARCH: "/v1/search",
    QUERY: "/v1/search",
    QUERY_WS: "/v1/query/stream",

    // Files endpoints (mapped to document endpoints)
    FILES_LIST: "/v1/documents",
    FILES_UPLOAD: "/v1/documents",

    // Admin endpoints
    ADMIN_ACCOUNTS: "/v1/accounts",
    ADMIN_INVITES: "/v1/invites",

    // Metrics endpoints
    METRICS_SUMMARY: "/v1/metrics/summary",
    METRICS_VOLUME: "/v1/metrics/volume",

    // Organization & management endpoints
    ORGANIZATIONS_ALL: "/v1/organizations",
    ORGANIZATIONS_PENDING: "/v1/organizations/pending",
    ORGANIZATIONS_APPROVE: "/v1/organizations/{id}/approve",
    ORGANIZATIONS_REJECT: "/v1/organizations/{id}/reject",
    ORGANIZATIONS_CHANGE_STATUS: "/v1/organizations/{id}",
    ORGANIZATIONS_SWITCH: "/v1/organizations/switch",
    ORGANIZATIONS_MEMBERSHIPS: "/v1/organizations/memberships",
    ORGANIZATIONS_MEMBERS: "/v1/organizations/members",
    ORGANIZATIONS_INVITES: "/v1/invites",
    MESSAGES_THREADS: "/v1/messages/threads",
    MESSAGES_THREAD_MESSAGES: "/v1/messages/threads/{threadId}/messages",
    MESSAGES_MARK_READ: "/v1/messages/{messageId}/read",
    MESSAGES_UNREAD_COUNT: "/v1/messages/unread-count",
  }
} as const

// Helper function to get full URL for HTTP requests
export function getApiUrl(endpoint: string): string {
  return `${API_CONFIG.BASE_URL}${endpoint}`
}

// Helper function to get WebSocket URL
export function getWsUrl(endpoint: string = "/ws"): string {
  return `${API_CONFIG.WS_URL}${endpoint}`
}

// Helper function to get CMS URL
export function getCmsUrl(endpoint: string): string {
  return `${API_CONFIG.BASE_URL}${API_CONFIG.CMS_PREFIX}${endpoint}`
}

// Helper function to get full CMS endpoint URL
export function getCmsEndpointUrl(endpoint: string): string {
  return `${API_CONFIG.BASE_URL}${API_CONFIG.CMS_PREFIX}${endpoint}`
}

// Debug logging (if enabled)
if (API_CONFIG.DEBUG) {
  console.log("🔧 API Configuration:", {
    BASE_URL: API_CONFIG.BASE_URL,
    WS_URL: API_CONFIG.WS_URL,
    CMS_PREFIX: API_CONFIG.CMS_PREFIX,
    TIMEOUT: API_CONFIG.TIMEOUT,
    DEBUG: API_CONFIG.DEBUG,
    ENABLE_CORS_FALLBACK: API_CONFIG.ENABLE_CORS_FALLBACK,
  });
}
