import { useState, useCallback, useEffect, useMemo } from 'react'
import { useApiData } from './useApiData'
import { ApiError } from '@/lib/api-client'
import { resolveTenantId } from '@/lib/api'

interface UserFile {
  filename: string
  original_filename?: string
  size?: number
  uploaded_at?: string
  id?: string
  organization_id?: string
}

interface UserProfile {
  user_id: string
  username: string
  email?: string
  role: string
  organization_id?: string
  created_at?: string
}

interface UseUserDataOptions {
  token?: string
  skip?: boolean
  onError?: (error: ApiError) => void
}

/**
 * Hook for fetching user-specific data (profile, files, etc)
 * Wraps useApiData for user endpoints with proper typing
 */
export function useUserData(
  resource: 'profile' | 'files' | null,
  options: UseUserDataOptions = {}
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
      case 'profile':
        return '/v1/me'
      case 'files':
        return '/v1/documents' // User's documents (knowledge-service); requires tenant_id param
      default:
        return null
    }
  }, [resource])

  const endpoint = getEndpoint()
  const skip = !endpoint || options.skip || (resource === 'files' && !tenantId)

  // Use generic API hook with proper typing
  const apiResult = useApiData<{
    user?: UserProfile
    documents?: Array<Record<string, any>>
    files?: UserFile[]
  }>(endpoint, {
    token: options.token,
    params: resource === 'files' && tenantId ? { tenant_id: tenantId } : undefined,
    cache: true,
    cacheTTL: 5 * 60 * 1000, // 5 minutes default
    retryable: true,
    skip,
    onError: options.onError,
  })

  // Extract the specific resource data
  const getResourceData = useCallback(() => {
    if (!resource || !apiResult.data) return resource === 'profile' ? null : []

    switch (resource) {
      case 'profile':
        return apiResult.data.user || null
      case 'files': {
        // knowledge-service's DocumentResult (dtm.DocumentResult) has no filename/size/
        // uploaded_at fields - map its shape onto the UserFile shape this hook has always
        // exposed to callers (title -> filename, created_at -> uploaded_at, document_id -> id).
        const documents = apiResult.data.documents || apiResult.data.files || []
        return documents.map((doc: any): UserFile => ({
          filename: doc.title || doc.filename || doc.original_filename || 'Untitled',
          original_filename: doc.metadata?.original_filename,
          size: doc.file_size ?? (typeof doc.content === 'string' ? doc.content.length : undefined),
          uploaded_at: doc.created_at || doc.upload_timestamp,
          id: doc.document_id || doc.id,
          organization_id: doc.tenant_id || doc.organization_id,
        }))
      }
      default:
        return resource === 'profile' ? null : []
    }
  }, [resource, apiResult.data])

  // See the identical comment in hooks/useAdminData.ts's useAdminData -
  // memoizing the call here gives callers a stable reference instead of a
  // fresh array/object every render.
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
 * Hook for fetching user profile
 */
export function useUserProfile(token?: string, skip?: boolean) {
  return useUserData('profile', { token, skip })
}

/**
 * Hook for fetching user's files
 */
export function useUserFiles(token?: string, skip?: boolean) {
  const result = useUserData('files', { token, skip })
  return {
    ...result,
    data: result.data as (UserFile[] | null),
  }
}

export default useUserData
