import { useState, useCallback, useEffect, useMemo } from 'react'
import { useApiData } from './useApiData'
import { ApiError } from '@/lib/api-client'
import { resolveTenantId } from '@/lib/api'

interface AdminUser {
  id: string
  user_id?: string
  username: string
  email?: string
  role: string
  created_at?: string
  organization_id?: string
  last_login?: string
}

interface AdminFile {
  id: string
  filename: string
  original_filename?: string
  size?: number
  uploaded_at?: string
  uploaded_by?: string
  organization_id?: string
}

interface AdminReport {
  id: string
  name: string
  type: string
  created_at?: string
  created_by?: string
  data?: any
}

interface UseAdminDataOptions {
  token?: string
  skip?: boolean
  onError?: (error: ApiError) => void
  autoRefreshInterval?: number // Optional: auto-refresh interval in ms (0 = no auto-refresh)
}

/**
 * Hook for fetching admin-specific data (users, files, reports)
 * Wraps useApiData for admin endpoints with proper typing and defaults
 */
export function useAdminData(
  resource: 'users' | 'files' | 'reports' | null,
  options: UseAdminDataOptions = {}
) {
  const [filters, setFilters] = useState<Record<string, any>>({})

  // knowledge-service's document endpoints (GET /v1/documents) require tenant_id as a query
  // parameter - see knowledge-service/internal/api/server.go requireTenantID(). Resolve it once
  // per token before firing the request; 'files' is gated on this being available (see `skip`
  // below) since a request without tenant_id will just 400.
  const [tenantId, setTenantId] = useState<string | null>(null)
  useEffect(() => {
    if (resource !== 'files' || !options.token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTenantId(null)
      return
    }
    let cancelled = false
    resolveTenantId(options.token).then((id) => {
      if (!cancelled) setTenantId(id)
    })
    return () => {
      cancelled = true
    }
  }, [resource, options.token])

  const getEndpoint = useCallback(() => {
    if (!resource) return null

    switch (resource) {
      case 'users':
        return '/v1/accounts'
      case 'files':
        return '/v1/documents' // knowledge-service documents; requires tenant_id param
      case 'reports':
        return '/v1/reports'
      default:
        return null
    }
  }, [resource])

  const endpoint = getEndpoint()
  const skip = !endpoint || options.skip || (resource === 'files' && !tenantId)

  // Use generic API hook with proper typing
  const apiResult = useApiData<any>(endpoint, {
    token: options.token,
    params: resource === 'files' && tenantId ? { tenant_id: tenantId } : undefined,
    cache: true,
    cacheTTL: 1 * 60 * 1000, // 1 minute for admin data (more frequent)
    retryable: true,
    skip,
    onError: options.onError,
  })

  // Auto-refresh at specified interval
  useEffect(() => {
    if (!options.autoRefreshInterval || options.autoRefreshInterval <= 0) {
      return
    }

    const interval = setInterval(() => {
      apiResult.refetch()
    }, options.autoRefreshInterval)

    return () => clearInterval(interval)
  }, [options.autoRefreshInterval, apiResult])

  // Extract the specific resource data
  const getResourceData = useCallback(() => {
    if (!resource || !apiResult.data) return []

    // Handle both APIResponse format and direct data format
    let responseData = apiResult.data
    
    // If data has 'response' field (APIResponse format), extract it
    if (apiResult.data && typeof apiResult.data === 'object' && 'response' in apiResult.data) {
      responseData = apiResult.data.response || apiResult.data
    }

    // Handle various API response formats. knowledge-service's document list
    // (dtm.DocumentListResponse) uses `documents`, not `files` - map both.
    const data = {
      users: responseData?.accounts || responseData?.users || responseData?.items || [],
      files: responseData?.files || responseData?.documents || [],
      reports: responseData?.reports || [],
    }

    // Debug logging
    if (resource === 'users') {
      console.log('[useAdminData] Users data:', data.users, 'Raw API data:', apiResult.data)
    }

    switch (resource) {
      case 'users':
        return (data.users || []) as AdminUser[]
      case 'files':
        // knowledge-service's DocumentResult (dtm.DocumentResult) has no filename/size/
        // uploaded_at fields - map its shape onto the AdminFile shape this hook has always
        // exposed to callers (title -> filename, created_at -> uploaded_at, document_id -> id).
        return (data.files || []).map((doc: any): AdminFile => ({
          id: doc.document_id || doc.id,
          filename: doc.title || doc.filename || doc.original_filename || 'Untitled',
          original_filename: doc.metadata?.original_filename,
          size: doc.file_size ?? (typeof doc.content === 'string' ? doc.content.length : undefined),
          uploaded_at: doc.created_at || doc.upload_timestamp,
          organization_id: doc.tenant_id || doc.organization_id,
        }))
      case 'reports':
        return (data.reports || []) as AdminReport[]
      default:
        return []
    }
  }, [resource, apiResult.data])

  // getResourceData is a useCallback, but *calling* it inline in the return
  // below would build a brand-new array every render regardless of whether
  // the underlying data changed - callers downstream (AdminDashboard,
  // UserDashboard) used to work around that instability with a
  // `useMemo(() => data, [JSON.stringify(data)])` hack just to get a stable
  // effect dependency. Memoizing the call here instead means `data` is only
  // a new reference when getResourceData itself changes identity (i.e. when
  // `resource` or `apiResult.data` actually changes), so callers can depend
  // on it directly.
  const data = useMemo(() => getResourceData(), [getResourceData])

  return {
    data,
    loading: apiResult.loading,
    error: apiResult.error,
    refetch: apiResult.refetch,
    isLoading: apiResult.isLoading,
    filters,
    setFilters,
  }
}

/**
 * Hook for fetching list of users (admin endpoint)
 */
export function useAdminUsers(token?: string, skip?: boolean, options?: Partial<UseAdminDataOptions>) {
  return useAdminData('users', { token, skip, ...options })
}

/**
 * Hook for fetching list of files (admin endpoint)
 */
export function useAdminFiles(token?: string, skip?: boolean, options?: Partial<UseAdminDataOptions>) {
  return useAdminData('files', { token, skip, ...options })
}

/**
 * Hook for fetching list of reports (admin endpoint)
 */
export function useAdminReports(token?: string, skip?: boolean, options?: Partial<UseAdminDataOptions>) {
  return useAdminData('reports', { token, skip, ...options })
}
