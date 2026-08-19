import { API_CONFIG, getApiUrl, getWsUrl, getCmsEndpointUrl } from "./config"

// Unified API configuration - all requests use api.wikiai.by

interface ApiRequestOptions {
  url: string
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  token?: string
  data?: Record<string, unknown> | FormData
  params?: Record<string, string>
}

interface ApiResponse<T = unknown> {
  status: "success" | "error"
  message?: string
  response?: T
}

interface LoginResponse {
  status: "success" | "error"
  message: string
  token?: string
  access_token?: string
  refresh_token?: string
  role?: "user" | "admin"
  user?: Record<string, unknown>
  organization?: Record<string, unknown>
  memberships?: Array<Record<string, unknown>>
}

export async function apiRequest<T = unknown>({
  url,
  method = "GET",
  token,
  data,
  params,
}: ApiRequestOptions): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    "ngrok-skip-browser-warning": "true",
  }

  // Only set Content-Type for non-FormData
  if (!(data instanceof FormData)) {
    headers["Content-Type"] = "application/json"
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  // Handle absolute URLs (for landing pages API)
  let fullUrl: string
  if (url.startsWith('http://') || url.startsWith('https://')) {
    fullUrl = url
  } else {
    fullUrl = getApiUrl(url)
  }

  // Add query params
  if (params && Object.keys(params).length > 0) {
    const query = new URLSearchParams(params).toString()
    fullUrl += (fullUrl.includes("?") ? "&" : "?") + query
  }

  try {
    let response = await fetch(fullUrl, {
      method,
      headers,
      body: data ? (data instanceof FormData ? data : JSON.stringify(data)) : undefined,
    })

    const responseClone = response.clone()
    let result: any
    try {
      result = await response.json()
    } catch (jsonError) {
      const responseText = await responseClone.text()
      console.error('Failed to parse JSON response:', jsonError)
      console.error('Response text:', responseText)
      result = {
        detail: `Invalid JSON response: ${response.status} ${response.statusText}`,
        raw_text: responseText,
      }
    }

    console.log(`API Response ${method} ${fullUrl}:`, {
      status: response.status,
      ok: response.ok,
      result,
    })

    if (!response.ok) {
      // Auto-refresh token on 401
      if (response.status === 401 && typeof window !== "undefined") {
        const storedRefreshToken = localStorage.getItem("refresh_token")
        if (storedRefreshToken) {
          try {
            const refreshRes = await fetch(getApiUrl("/v1/auth/refresh"), {
              method: "POST",
              headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
              body: JSON.stringify({ refresh_token: storedRefreshToken }),
            })
            if (refreshRes.ok) {
              const refreshData = await refreshRes.json()
              const tokenPair = refreshData.token_pair as Record<string, unknown> | undefined
              const newToken = (tokenPair?.access_token as string) || refreshData.token || refreshData.access_token
              const newRefreshToken = (tokenPair?.refresh_token as string) || refreshData.refresh_token
              if (newToken) {
                // NOTE: must match the key lib/auth-context.tsx's AuthProvider reads ("auth_token").
                // This used to write "token" here, which the live session context never read,
                // silently desyncing a refreshed token from the session state.
                localStorage.setItem("auth_token", newToken)
                if (newRefreshToken) localStorage.setItem("refresh_token", newRefreshToken)
                headers["Authorization"] = `Bearer ${newToken}`
                const retryRes = await fetch(fullUrl, {
                  method,
                  headers,
                  body: data ? (data instanceof FormData ? data : JSON.stringify(data)) : undefined,
                })
                if (retryRes.ok) {
                  const retryResult = await retryRes.json()
                  return { status: "success", response: retryResult }
                }
                result = await retryRes.json()
                response = retryRes
              }
            }
          } catch (e) {
            console.error("Token refresh failed:", e)
          }
        }
      }

      // Handle structured validation errors (e.g., from FastAPI)
      let errorMessage = "Request failed"
      if (result.detail) {
        if (typeof result.detail === 'string') {
          errorMessage = result.detail
        } else if (Array.isArray(result.detail) && result.detail.length > 0) {
          // Handle FastAPI validation errors: [{type, loc, msg, input}]
          const firstError = result.detail[0]
          errorMessage = firstError.msg || JSON.stringify(firstError)
        } else if (typeof result.detail === 'object' && result.detail.msg) {
          errorMessage = result.detail.msg
        } else {
          errorMessage = JSON.stringify(result.detail)
        }
      } else if (result.message) {
        errorMessage = result.message
      }
      
      console.error(`API Error ${response.status}:`, errorMessage)
      
      return {
        status: "error",
        message: errorMessage,
      }
    }

    return { status: "success", response: result }
  } catch (error) {
    console.error('Network or fetch error:', error)
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Network error",
    }
  }
}

// Auth endpoints
export const authApi = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const result = await apiRequest<Record<string, unknown>>({
      url: "/v1/auth/login",
      method: "POST",
      data: { username, password },
    })

    if (result.status === "success" && result.response) {
      const data = result.response
      const tokenPair = data.token_pair as Record<string, unknown> | undefined
      const accessToken = (tokenPair?.access_token as string) || (data.token as string) || (data.access_token as string) || ""
      const refreshToken = (tokenPair?.refresh_token as string) || (data.refresh_token as string) || ""

      if (typeof window !== "undefined") {
        // NOTE: must match the key lib/auth-context.tsx's AuthProvider reads ("auth_token") —
        // see comment in the 401-retry logic above for why this key must be consistent everywhere.
        localStorage.setItem("auth_token", accessToken)
        if (refreshToken) localStorage.setItem("refresh_token", refreshToken)
      }

      return {
        status: "success",
        message: "Login successful",
        token: accessToken,
        access_token: accessToken,
        refresh_token: refreshToken,
        role: (data.role as "user" | "admin") || "user",
        user: data.user as Record<string, unknown> | undefined,
        organization: data.organization as Record<string, unknown> | undefined,
        memberships: data.memberships as Array<Record<string, unknown>> | undefined,
      }
    }

    return {
      status: "error",
      message: result.message || "Login failed",
    }
  },

  validateToken: (token: string) =>
    apiRequest<{
      valid: boolean
      username: string
      role: string
      organization?: string
      organization_id?: string
      organization_name?: string
    }>({
      url: "/v1/token/validate",
      token,
    }),

  checkAdminAccess: (token: string) =>
    apiRequest<{ admin: boolean }>({
      url: "/v1/admin/access",
      token,
    }),

  createOrganization: (data: { organization_name: string; admin_username: string; admin_password: string }) =>
    apiRequest({
      url: "/v1/organizations",
      method: "POST",
      data,
    }),

  switchOrganization: (token: string, data: { organization_id?: string; organization_slug?: string }) =>
    apiRequest<{ token: string }>({
      url: "/v1/organizations/switch",
      method: "POST",
      token,
      data,
    }),

  listMemberships: (token: string) =>
    apiRequest<{ memberships: Array<{ organization_id: string; organization_name: string; role: string }> }>({
      url: "/v1/organizations/memberships",
      token,
    }),

  listMembers: (token: string) =>
    apiRequest<{ members: Array<{ user_id: string; username: string; role: string }> }>({
      url: "/v1/organizations/members",
      token,
    }),

  createInvite: (token: string, email: string, role = "member") =>
    apiRequest({
      url: "/v1/invites",
      method: "POST",
      token,
      data: { email, role },
    }),

  acceptInvite: (inviteToken: string, password: string, username: string) =>
    apiRequest({
      url: "/v1/invites/accept",
      method: "POST",
      data: { token: inviteToken, username, password },
    }),

  updateMemberRole: (token: string, user_id: string, role: string) =>
    apiRequest({
      url: "/v1/organizations/members/role",
      method: "POST",
      token,
      data: { user_id, role },
    }),

  revokeInvite: (token: string, invite_id: string) =>
    apiRequest({
      url: `/v1/invites/${encodeURIComponent(invite_id)}`,
      method: "DELETE",
      token,
    }),
}

export interface UploadFileResult {
  filename: string
  status: "success" | "error"
  documentId?: string
  // Backend status right after ingest accepts the file - "pending" for a
  // fresh async ingest (WAI-52), or "duplicate" if it deduped against an
  // already-indexed document. Absent when status is "error".
  initialStatus?: string
  message?: string
}

export interface UploadResponse {
  status: "success" | "error"
  message?: string
  response?: { results: UploadFileResult[] }
}

export const filesApi = {
  // GET /files/list returns { status: 'success', response: { documents: [...] } }
  list: async (token: string) => {
    const tenantId = await resolveTenantId(token)
    if (!tenantId) {
      return { status: "error" as const, message: "Tenant ID is required for file list requests" }
    }

    return apiRequest<{
      documents: Array<{ id: number; filename: string; upload_timestamp: string; organization_id: string; file_size: number }>
    }>({
      url: API_CONFIG.ENDPOINTS.FILES_LIST,
      token,
      params: { tenant_id: tenantId },
    })
  },

  // knowledge-service has no filename-keyed /content sub-resource: content is returned as a field
  // on GET /v1/documents/{id} (id-keyed only). If we're handed something that isn't already a raw
  // document id (e.g. a filename/title from an older UI flow), resolve the id by listing documents
  // and matching client-side, then fetch GET /v1/documents/{id}.
  getContent: async (token: string, documentIdOrFilename: string) => {
    const tenantId = await resolveTenantId(token)
    if (!tenantId) {
      return { status: "error" as const, message: "Tenant ID is required for file content requests" }
    }

    const resolveDocumentId = async (value: string): Promise<string | null> => {
      if (!value) return null
      if (/^[0-9a-fA-F-]{20,}$/.test(value) && !value.includes('.')) {
        return value
      }

      const listResult = await apiRequest<{ documents: Array<any> }>({
        url: API_CONFIG.ENDPOINTS.FILES_LIST,
        token,
        params: { tenant_id: tenantId },
      })
      if (listResult.status !== "success" || !listResult.response?.documents) {
        return null
      }

      const lowerValue = value.toLowerCase()
      const match = listResult.response.documents.find((doc: any) => {
        const title = (doc.title || doc.Title || doc.filename || doc.original_filename || doc.name || "").toString().toLowerCase()
        return title === lowerValue
      })
      return match?.document_id || match?.DocumentID || match?.id || match?.ID || null
    }

    const documentId = await resolveDocumentId(documentIdOrFilename)
    if (!documentId) {
      return { status: "error" as const, message: "Could not resolve document ID for content fetch" }
    }

    const response = await apiRequest<{ document: any }>({
      url: `${API_CONFIG.ENDPOINTS.FILES_LIST}/${encodeURIComponent(documentId)}`,
      token,
      params: { tenant_id: tenantId },
    })

    if (response.status !== "success" || !response.response?.document) {
      return { status: "error" as const, message: response.message || `Failed to fetch file content` }
    }

    const document = response.response.document
    // knowledge-service stores document content as plain text only (dtm.DocumentResult.Content is
    // a string field) - there is no binary/base64 storage path, so isBinary is always false here.
    // Callers (file-reader.tsx, admin/files, files page) still branch on isBinary for backward
    // compatibility but that branch is now effectively dead since nothing sets it true anymore.
    return {
      status: "success" as const,
      response: {
        content: document.content || document.raw_content || "",
        isBinary: false,
        docType: document.doc_type || document.DocType || "application/octet-stream",
      },
    }
  },

  // POST /v1/documents - file upload via document ingest.
  // knowledge-service's ingest endpoint only accepts JSON with a plain-text `content` field
  // (dtm.IngestRequest.Content is a string) - there is no multipart/binary upload path. We read
  // each file's text client-side and reject file types that can't be meaningfully read as text
  // (e.g. PDF/DOCX/images) rather than silently uploading mangled FileReader.readAsText() output.
  //
  // Ingest is asynchronous (WAI-52): a successful per-file response here means the document was
  // accepted and is now indexing in the background, not that indexing finished. Each per-file
  // result carries the document_id + initial status ("pending", or "duplicate" for an
  // already-indexed dedup hit) so callers can poll filesApi.getStatus() to follow progress
  // (see hooks/use-upload-status-poll.ts) instead of the old behavior of the whole call just
  // hanging until every file finished indexing.
  upload: async (token: string, files: File[]): Promise<UploadResponse> => {
    const tenantId = await resolveTenantId(token)
    if (!tenantId) {
      return { status: "error" as const, message: "Tenant ID is required for file uploads" }
    }

    const BINARY_EXTENSIONS = new Set([
      "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
      "png", "jpg", "jpeg", "gif", "webp", "bmp", "ico",
      "zip", "rar", "7z", "tar", "gz",
      "mp3", "mp4", "wav", "avi", "mov", "webm",
      "exe", "bin", "dll",
    ])
    const TEXTY_MIME_TYPES = new Set(["application/json", "application/xml", "application/x-yaml", "application/x-subrip", ""])
    const isLikelyBinary = (file: File): boolean => {
      const ext = file.name.split(".").pop()?.toLowerCase() || ""
      if (BINARY_EXTENSIONS.has(ext)) return true
      const type = file.type || ""
      if (type && !type.startsWith("text/") && !TEXTY_MIME_TYPES.has(type)) return true
      return false
    }

    const readFileText = (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`))
        reader.readAsText(file)
      })

    const results: UploadFileResult[] = []
    let hadError = false
    let firstErrorMessage: string | undefined

    for (const file of files) {
      if (isLikelyBinary(file)) {
        const message = `"${file.name}" looks like a binary file. Only plain-text documents (txt, md, csv, json, html, code, srt, etc.) can be uploaded - the knowledge base stores document content as text.`
        results.push({ filename: file.name, status: "error", message })
        hadError = true
        firstErrorMessage ??= message
        continue
      }

      let content: string
      try {
        content = await readFileText(file)
      } catch (err) {
        const message = err instanceof Error ? err.message : `Failed to read file ${file.name}`
        results.push({ filename: file.name, status: "error", message })
        hadError = true
        firstErrorMessage ??= message
        continue
      }

      const result = await apiRequest<{ document_id: string; status: string }>({
        url: API_CONFIG.ENDPOINTS.FILES_UPLOAD,
        method: "POST",
        token,
        data: {
          tenant_id: tenantId,
          title: file.name,
          content,
          doc_type: file.type || "text/plain",
          metadata: {
            original_filename: file.name,
          },
        },
      })

      if (result.status === "error") {
        results.push({ filename: file.name, status: "error", message: result.message })
        hadError = true
        firstErrorMessage ??= result.message
        continue
      }

      results.push({
        filename: file.name,
        status: "success",
        documentId: result.response?.document_id,
        initialStatus: result.response?.status,
      })
    }

    return {
      status: hadError ? ("error" as const) : ("success" as const),
      message: hadError ? firstErrorMessage : undefined,
      response: { results },
    }
  },

  // GET /v1/documents/{id}/status - lightweight polling endpoint (WAI-53) for an in-flight
  // upload's indexing progress. Intended to be called every ~2s per pending/indexing document
  // (see hooks/use-upload-status-poll.ts), so it deliberately never fetches document content or
  // chunk data.
  getStatus: async (token: string, documentId: string) => {
    const tenantId = await resolveTenantId(token)
    if (!tenantId) {
      return { status: "error" as const, message: "Tenant ID is required for status requests" }
    }
    return apiRequest<{ document_id: string; status: string; chunk_count: number; updated_at: string }>({
      url: `${API_CONFIG.ENDPOINTS.FILES_LIST}/${encodeURIComponent(documentId)}/status`,
      token,
      params: { tenant_id: tenantId },
    })
  },

  // PATCH/PUT /v1/documents/{id}
  edit: async (token: string, documentIdOrFilename: string, newContent: string) => {
    const tenantId = await resolveTenantId(token)
    if (!tenantId) {
      return { status: "error" as const, message: "Tenant ID is required for edit requests" }
    }

    const resolveDocumentId = async (value: string): Promise<string | null> => {
      if (!value) return null
      if (/^[0-9a-fA-F-]{20,}$/.test(value) && !value.includes('.')) {
        return value
      }

      const listResult = await apiRequest<{ documents: Array<any> }>({
        url: API_CONFIG.ENDPOINTS.FILES_LIST,
        token,
        params: { tenant_id: tenantId },
      })
      if (listResult.status !== "success" || !listResult.response?.documents) {
        return null
      }

      const lowerValue = value.toLowerCase()
      const match = listResult.response.documents.find((doc: any) => {
        const title = (doc.title || doc.Title || doc.filename || doc.original_filename || doc.name || "").toString().toLowerCase()
        return title === lowerValue
      })
      return match?.document_id || match?.DocumentID || match?.id || match?.ID || null
    }

    const documentId = await resolveDocumentId(documentIdOrFilename)
    if (!documentId) {
      return { status: "error" as const, message: "Could not resolve document ID for edit" }
    }

    return apiRequest({
      url: `${API_CONFIG.ENDPOINTS.FILES_LIST}/${encodeURIComponent(documentId)}`,
      method: "PUT",
      token,
      params: { tenant_id: tenantId },
      data: { content: newContent },
    })
  },

  // DELETE /v1/documents/{id}
  deleteById: async (token: string, fileId: string) => {
    const tenantId = await resolveTenantId(token)
    if (!tenantId) {
      return { status: "error" as const, message: "Tenant ID is required for delete requests" }
    }
    return apiRequest({
      url: `${API_CONFIG.ENDPOINTS.FILES_LIST}/${encodeURIComponent(fileId)}`,
      method: "DELETE",
      token,
      params: { tenant_id: tenantId },
    })
  },

  // DELETE document by matching filename/title
  deleteByFilename: async (token: string, filename: string) => {
    const tenantId = await resolveTenantId(token)
    if (!tenantId) {
      return { status: "error" as const, message: "Tenant ID is required for delete requests" }
    }

    const listResult = await apiRequest<{ documents: Array<any> }>({
      url: API_CONFIG.ENDPOINTS.FILES_LIST,
      token,
      params: { tenant_id: tenantId },
    })
    if (listResult.status !== "success" || !listResult.response?.documents) {
      return { status: "error" as const, message: "Could not retrieve documents for deletion" }
    }

    const lowerFilename = filename.toLowerCase()
    const match = listResult.response.documents.find((doc: any) => {
      const title = (doc.title || doc.Title || doc.filename || doc.original_filename || doc.name || "").toString().toLowerCase()
      return title === lowerFilename
    })
    const documentId = match?.document_id || match?.DocumentID || match?.id || match?.ID
    if (!documentId) {
      return { status: "error" as const, message: "Could not resolve document ID for deletion" }
    }

    return apiRequest({
      url: `${API_CONFIG.ENDPOINTS.FILES_LIST}/${encodeURIComponent(documentId)}`,
      method: "DELETE",
      token,
      params: { tenant_id: tenantId },
    })
  },

  // Reindex a document. knowledge-service has no dedicated reindex endpoint.
  //
  // We can't implement this as "PUT the same content back": internal/documents.Service.Update only
  // rebuilds chunks when the new content differs (byte-for-byte) from what's already stored -
  // see the `contentChanged` check in knowledge-service's internal/documents/service.go Update().
  // Re-PUTting identical content is therefore a silent no-op, not a reindex.
  //
  // Instead we re-ingest the document via POST /v1/documents (which always (re)builds chunks
  // from scratch) and only delete the old one once that succeeds - ingest-then-delete, not
  // delete-then-ingest, so a failed re-ingest never destroys the only copy of the content.
  // NOTE: this mints a new document_id - callers must treat the returned id as the document's
  // new identity and refresh any cached document list afterward.
  reindex: async (token: string, documentId: string) => {
    const tenantId = await resolveTenantId(token)
    if (!tenantId) {
      return { status: "error" as const, message: "Tenant ID is required for reindex requests" }
    }

    const getResult = await apiRequest<{ document: any }>({
      url: `${API_CONFIG.ENDPOINTS.FILES_LIST}/${encodeURIComponent(documentId)}`,
      token,
      params: { tenant_id: tenantId },
    })
    if (getResult.status !== "success" || !getResult.response?.document) {
      return { status: "error" as const, message: getResult.message || "Could not load document to reindex" }
    }
    const doc = getResult.response.document
    // Same field-name fallback as getContent above, applied to every field
    // we're about to re-ingest - not just content. Reading an undefined
    // field here silently uploads an empty/garbage replacement while
    // reporting success, and since the old document is deleted afterward,
    // that would permanently wipe the content instead of reindexing it.
    const content = doc.content || doc.raw_content || ""
    const title = doc.title || doc.Title || doc.filename || doc.original_filename || doc.name || documentId
    const docType = doc.doc_type || doc.DocType || "text/plain"
    if (!content) {
      return { status: "error" as const, message: "Document has no content to reindex" }
    }

    const ingestResult = await apiRequest<{ document_id: string }>({
      url: API_CONFIG.ENDPOINTS.FILES_UPLOAD,
      method: "POST",
      token,
      data: {
        tenant_id: tenantId,
        title,
        content,
        doc_type: docType,
        metadata: doc.metadata || {},
      },
    })
    if (ingestResult.status === "error") {
      return ingestResult
    }

    const deleteResult = await apiRequest({
      url: `${API_CONFIG.ENDPOINTS.FILES_LIST}/${encodeURIComponent(documentId)}`,
      method: "DELETE",
      token,
      params: { tenant_id: tenantId },
    })
    if (deleteResult.status === "error") {
      // The new copy already exists at this point - surface the delete
      // failure but don't undo the successful re-ingest, since undoing it
      // would just reintroduce the exact stale-index problem reindex exists
      // to fix. The caller ends up with both the old and new document until
      // the leftover delete is retried.
      return {
        status: "error" as const,
        message: `Reindexed successfully but failed to remove the old document: ${deleteResult.message || "unknown error"}`,
      }
    }

    return ingestResult
  },
}

export async function resolveTenantId(token: string): Promise<string | null> {
  try {
    const res = await authApi.validateToken(token)
    if (res.status === "success" && res.response) {
      return (res.response as any).organization_id || null
    }
  } catch { /* ignore */ }
  return null
}

function synthesizeAnswer(question: string, chunks: any[]): string {
  if (!chunks || chunks.length === 0) {
    return "No relevant knowledge base content was found for: " + question
  }
  const top = chunks[0].content || ""
  return top.length > 500 ? top.substring(0, 500) : top
}

function chunksToSearchResults(chunks: any[]): any[] {
  return chunks.map((c: any) => ({
    chunk_id: c.chunk_id,
    document_id: c.document_id,
    content: c.content,
    final_score: c.final_score,
    source: c.source || c.metadata?.filename || "memory",
    metadata: c.metadata,
  }))
}

export const queryApi = {
  query: async (token: string, question: string, options?: {
    session_id?: string
    model?: string
    humanize?: boolean
    ai_agent_mode?: boolean
    top_k?: number
  }) => {
    const tenantId = await resolveTenantId(token)
    const res = await apiRequest<{
      results: Array<{
        chunk_id: string
        document_id: string
        content: string
        final_score: number
        source: string
        metadata?: Record<string, unknown>
      }>
      query_id: string
      took_ms: number
    }>({
      url: API_CONFIG.ENDPOINTS.SEARCH,
      method: "POST",
      token,
      data: {
        tenant_id: tenantId,
        query: question,
        top_k: options?.top_k || 10,
      },
    })

    if (res.status === "success" && res.response) {
      const data = res.response as any
      const chunks = data.results || []
      return {
        status: "success" as const,
        response: {
          answer: synthesizeAnswer(question, chunks),
          chunks: chunksToSearchResults(chunks),
          model: options?.model || null,
          query_id: data.query_id,
          took_ms: data.took_ms,
          security: { organization_id: tenantId, filtered: true },
        },
      }
    }
    return res
  },

  queryStream: async (
    token: string,
    question: string,
    options?: {
      session_id?: string
      model?: string
      humanize?: boolean
      top_k?: number
      onMessage?: (message: any) => void
    }
  ): Promise<ApiResponse<any>> => {
    options?.onMessage?.({ type: "status", data: { message: "searching" } })

    try {
      return await queryApi.queryStreamViaWS(token, question, options)
    } catch {
      return queryApi.queryStreamViaHTTP(token, question, options)
    }
  },

  queryStreamViaWS: async (
    token: string,
    question: string,
    options?: {
      session_id?: string
      top_k?: number
      tenant_id?: string
      onMessage?: (message: any) => void
    }
  ): Promise<ApiResponse<any>> => {
    if (!token) {
      return Promise.reject(new Error("Missing auth token for WebSocket query"))
    }

    const tenantId = options?.tenant_id || await resolveTenantId(token)

    const wsUrl = `${API_CONFIG.WS_URL}${API_CONFIG.ENDPOINTS.QUERY_WS}?token=${encodeURIComponent(token)}`

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl)
      let settled = false
      let receivedData = false
      let timeout: NodeJS.Timeout | undefined

      const connectTimeout = setTimeout(() => {
        if (!settled) {
          settled = true
          ws.close()
          reject(new Error("WebSocket connection timeout"))
        }
      }, 10000)

      ws.onopen = () => {
        clearTimeout(connectTimeout)
        timeout = setTimeout(() => {
          if (!settled) {
            settled = true
            ws.close()
            if (receivedData) {
              resolve({ status: "success" as const, response: null })
            } else {
              reject(new Error("WebSocket query timeout"))
            }
          }
        }, 30000)

        ws.send(JSON.stringify({
          query: question,
          tenant_id: tenantId,
          top_k: options?.top_k || 10,
        }))
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)

          if (msg.type === "complete" && !settled) {
            settled = true
            clearTimeout(connectTimeout)
            clearTimeout(timeout)
            ws.close()
            resolve({ status: "success" as const, response: msg.data })
            return
          }

          if (msg.type === "error" && !settled) {
            settled = true
            clearTimeout(connectTimeout)
            clearTimeout(timeout)
            ws.close()
            if (receivedData) {
              resolve({ status: "success" as const, response: null })
            } else {
              reject(new Error(msg.data?.message || "WebSocket error"))
            }
            return
          }

          if (msg.type === "chunks" || msg.type === "answer") {
            receivedData = true
          }

          options?.onMessage?.(msg)
        } catch (e) {
          console.error("WS parse error:", e)
        }
      }

      ws.onerror = () => {
        clearTimeout(connectTimeout)
        clearTimeout(timeout)
        if (!settled) {
          settled = true
          reject(new Error("WebSocket connection failed"))
        }
      }

      ws.onclose = (event) => {
        clearTimeout(connectTimeout)
        clearTimeout(timeout)
        if (!settled && event.code !== 1000) {
          settled = true
          if (receivedData) {
            resolve({ status: "success" as const, response: null })
          } else {
            reject(new Error(`WebSocket closed: ${event.reason || "unknown reason"}`))
          }
        }
      }
    })
  },

  queryStreamViaHTTP: async (
    token: string,
    question: string,
    options?: {
      session_id?: string
      model?: string
      humanize?: boolean
      top_k?: number
      onMessage?: (message: any) => void
    }
  ): Promise<ApiResponse<any>> => {
    const result = await queryApi.query(token, question, options)
    if (result.status !== "success") {
      options?.onMessage?.({ type: "error", data: { message: result.message } })
      return result
    }

    const data = result.response!
    options?.onMessage?.({ type: "chunks", data: { chunks: data.chunks } })
    options?.onMessage?.({ type: "answer", data: { answer: data.answer } })
    options?.onMessage?.({ type: "complete", data: { query_id: data.query_id } })

    return { status: "success", response: data }
  },

  queryWebSocket: async (
    token: string,
    question: string,
    options?: {
      session_id?: string
      model?: string
      humanize?: boolean
      ai_agent_mode?: boolean
      onMessage?: (message: any) => void
    }
  ) => {
    return queryApi.queryStream(token, question, {
      ...options,
      onMessage: (msg) => {
        // Map new message types to old format for backward compatibility
        switch (msg.type) {
          case "chunks": {
            const chunks = msg.data?.chunks || []
            options?.onMessage?.({
              type: "immediate",
              data: {
                results: chunks.map((c: any) => ({
                  chunk_id: c.chunk_id,
                  document_id: c.document_id,
                  content: c.content,
                  source: c.source || c.metadata?.filename || "memory",
                  score: c.final_score,
                })),
                snippets: chunks.map((c: any) => ({
                  document_id: c.document_id,
                  content: c.content,
                  source: c.source || c.metadata?.filename || "memory",
                  score: c.final_score,
                })),
              },
            })
            break
          }
          case "answer":
            options?.onMessage?.({ type: "overview", data: msg.data?.answer || "" })
            break
          case "status":
            options?.onMessage?.({ type: "status", message: msg.data?.message || "" })
            break
          case "complete":
            options?.onMessage?.({ type: "complete", data: msg.data })
            break
          case "error":
            options?.onMessage?.({ type: "error", message: msg.data?.message || "Unknown error" })
            break
        }
      },
    })
  },
}

export const reportsApi = {
  // GET /reports/get/auto
  getAuto: async (token: string) => {
    const headers: Record<string, string> = {
      "ngrok-skip-browser-warning": "true",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    }

    const res = await fetch(getApiUrl("/v1/reports?" + new URLSearchParams({ type: "auto" })), {
      method: "GET",
      headers,
    })

    if (!res.ok) {
      throw new Error(`Failed to fetch auto reports: ${res.status}`)
    }

    const data = await res.json()
    return {
      status: "success" as const,
      response: {
        reports: data.reports || [],
      },
    }
  },

  // GET /reports/get/manual
  getManual: async (token: string) => {
    const headers: Record<string, string> = {
      "ngrok-skip-browser-warning": "true",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    }

    const res = await fetch(getApiUrl("/v1/reports?" + new URLSearchParams({ type: "manual" })), {
      method: "GET",
      headers,
    })

    if (!res.ok) {
      throw new Error(`Failed to fetch manual reports: ${res.status}`)
    }

    const data = await res.json()
    return {
      status: "success" as const,
      response: {
        reports: data.reports || [],
      },
    }
  },

  // POST /reports/submit/manual with { issue }
  submitManual: (token: string, issue: string) =>
    apiRequest({
      url: "/v1/reports",
      method: "POST",
      token,
      data: { issue },
    }),
}

export const adminApi = {
  // GET /accounts
  listAccounts: async (token: string) => {
    // graphtalk returns a raw JSON array from GET /accounts
    const headers: Record<string, string> = {
      "ngrok-skip-browser-warning": "true",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    }

    try {
      const res = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.ADMIN_ACCOUNTS), {
        method: "GET",
        headers,
      })

      const data = await res.json()

      if (!res.ok) {
        return {
          status: "error" as const,
          message:
            (data && (data.message || data.detail)) || `Failed to fetch accounts: ${res.status}`,
        }
      }

      // If backend later changes to APIResponse, handle that too.
      if (data && typeof data === "object" && !Array.isArray(data) && (data as any).status) {
        const wrapped = data as any
        const accounts = wrapped.response?.accounts || wrapped.response || wrapped.accounts || []
        return {
          status: wrapped.status as "success" | "error",
          message: wrapped.message,
          response: { accounts },
        }
      }

      // go-core format: {"items": [...], "next_cursor": null}
      if (data && typeof data === "object" && !Array.isArray(data) && (data as any).items) {
        return {
          status: "success" as const,
          response: { accounts: (data as any).items },
        }
      }

      if (Array.isArray(data)) {
        return {
          status: "success" as const,
          response: { accounts: data },
        }
      }

      return {
        status: "error" as const,
        message: "Unexpected /accounts response format",
      }
    } catch (error) {
      return {
        status: "error" as const,
        message: error instanceof Error ? error.message : "Network error",
      }
    }
  },

  // POST /register
  createUser: (
    token: string,
    userData: { username: string; password: string; role: string; allowed_files?: string[] },
  ) =>
    apiRequest({
      url: "/v1/register",
      method: "POST",
      token,
      data: userData,
    }),

  // POST /user/edit
  editUser: (
    token: string,
    userData: { username: string; role?: string; password?: string; allowed_files?: string[] },
  ) =>
    apiRequest({
      url: "/v1/user/edit",
      method: "POST",
      token,
      data: userData,
    }),

  // DELETE /user/delete with ?username=...
  deleteUser: (token: string, username: string) =>
    apiRequest({
      url: "/v1/user/delete",
      method: "DELETE",
      token,
      params: { username },
    }),

  // Invite management endpoints
  createInvite: (
    token: string,
    inviteData: { email?: string; role: string; allowed_files?: string[]; expires_in_days?: number; message?: string }
  ) =>
    apiRequest<{
      invite_id: string
      token: string
      link: string
      email?: string
      role: string
      expires_at: string
      created_by: string
      organization_id?: string
    }>({
      url: "/v1/invites",
      method: "POST",
      token,
      data: inviteData,
    }),

  listInvites: (token: string) =>
    apiRequest<{
      invites: Array<{
        id: string
        token: string
        link: string
        email?: string
        role: string
        expires_at: string
        created_at: string
        created_by: string
        is_used: boolean
      }>
      count: number
      listed_by: string
    }>({
      url: "/v1/invites",
      token,
    }),

  getInviteInfo: (token: string) =>
    apiRequest<{
      valid: boolean
      email?: string
      role: string
      allowed_files: string[]
      expires_at: string
      created_by: string
      message?: string
    }>({
      url: `/v1/invites/${token}`,
    }),

  acceptInvite: (
    token: string,
    userData: { username: string; password: string }
  ) =>
    apiRequest<{
      username: string
      role: string
      allowed_files: string[]
      organization_id?: string
    }>({
      url: "/v1/invites/accept",
      method: "POST",
      data: { ...userData, token },
    }),

  revokeInvite: (token: string, inviteId: string) =>
    apiRequest<{
      invite_id: string
      revoked_by: string
    }>({
      url: `/v1/invites/${inviteId}`,
      method: "DELETE",
      token,
    }),

  getOrganizationStatusByEmail: async (email: string) => {
    return apiRequest<{
      organization: {
        id: string
        name: string
        slug: string
        status: string
        created_at: string
        updated_at: string
        admin_user_id: string
        admin_email: string
      }
    }>({
      url: `/v1/organizations/status-by-email/${encodeURIComponent(email)}`,
      method: "GET",
    })
  },
}

// Catalogs endpoints
export const catalogsApi = {
  list: (token: string) =>
    apiRequest<{ catalogs: Array<{ catalog_id: string; shop_name: string; total_products: number }> }>({
      url: "/v1/catalogs",
      token,
    }),

  create: (token: string, name: string) =>
    apiRequest<{ catalog_id: string; shop_name: string }>({
      url: "/v1/catalogs",
      method: "POST",
      token,
      data: { name },
    }),

  search: (token: string, catalogId: string, query: string) =>
    apiRequest<{
      products: Array<{
        id: string
        name: string
        description: string
        price: number
        special_price?: number
        image?: string
        url?: string
        quantity?: number
        shop_name?: string
        score?: number
      }>
    }>({
      url: `/v1/catalogs/${catalogId}/search`,
      method: "GET",
      token,
      params: { query },
    }),

  delete: (token: string, catalogId: string) =>
    apiRequest({
      url: `/v1/catalogs/${catalogId}`,
      method: "DELETE",
      token,
    }),
}

// Plugins endpoints
export const pluginsApi = {
  status: (token: string) =>
    apiRequest<{ enabled: boolean; status: string }>({
      url: "/v1/plugins",
      token,
    }),

  enable: (token: string, plugin = "opencart") =>
    apiRequest({
      url: `/v1/plugins/${plugin}/enable`,
      method: "POST",
      token,
    }),

  disable: (token: string, plugin = "opencart") =>
    apiRequest({
      url: `/v1/plugins/${plugin}/disable`,
      method: "POST",
      token,
    }),

  listTokens: (token: string) =>
    apiRequest<{ tokens: Array<{ id: string; name: string; created_at: string }> }>({
      url: "/v1/plugins/tokens",
      token,
    }),

  createToken: (token: string, name: string) =>
    apiRequest<{ token: string; id: string }>({
      url: "/v1/plugins/tokens",
      method: "POST",
      token,
      data: { token_name: name },
    }),

  deleteToken: (token: string, tokenId: string) =>
    apiRequest({
      url: `/v1/plugins/tokens/${tokenId}`,
      method: "DELETE",
      token,
    }),
}

// OpenCart endpoints
export const opencartApi = {
  importProducts: (token: string, catalogId: string) =>
    apiRequest({
      url: "/v1/opencart/products/import",
      method: "POST",
      token,
      data: { catalog_id: catalogId },
    }),
}

// API Keys endpoints - Enhanced with rate limiting, LLM control, and analytics
export const apiKeysApi = {
  list: (token: string) =>
    apiRequest<{ 
      keys: Array<{ 
        id: string; 
        key_id: string; 
        name: string; 
        description?: string; 
        permissions: string[]; 
        is_active: boolean; 
        created_at: string; 
        last_used?: string;
        status?: string;
        priority_tier?: string;
        rate_limit_requests?: number;
        current_usage?: number;
        llm_enabled?: boolean;
        max_tokens_per_day?: number;
        current_llm_tokens_used?: number;
        expires_at?: string;
      }> 
    }>({
      url: "/v1/api-keys",
      token,
    }),

  create: (token: string, data: { 
    name: string; 
    description?: string; 
    permissions: string[]; 
    expires_in_days?: number;
    priority_tier?: string;
    rate_limit_requests?: number;
    rate_limit_period?: string;
    llm_enabled?: boolean;
    max_tokens_per_day?: number;
    llm_cost_limit?: number;
  }) =>
    apiRequest<{ 
      key?: string; 
      key_id: string; 
      id: string; 
      full_key: string;
      tier?: string;
    }>({
      url: "/v1/api-keys",
      method: "POST",
      token,
      data,
    }),

  delete: (token: string, keyId: string) =>
    apiRequest({
      url: `/v1/api-keys/${keyId}`,
      method: "DELETE",
      token,
    }),

  get: (token: string, keyId: string) =>
    apiRequest<{
      id: string;
      key_id: string;
      name: string;
      description?: string;
      permissions: string[];
      is_active: boolean;
      created_at: string;
      last_used?: string;
      expires_at?: string;
      status: string;
      priority_tier: string;
      rate_limit_requests: number;
      current_usage: number;
      llm_enabled: boolean;
      max_tokens_per_day: number;
      current_llm_tokens_used: number;
      llm_cost_limit: number;
      current_llm_cost: number;
    }>({
      url: `/v1/api-keys/${keyId}`,
      token,
    }),

  update: (token: string, keyId: string, data: {
    name?: string;
    permissions?: string[];
    rate_limit_requests?: number;
    llm_enabled?: boolean;
    max_tokens_per_day?: number;
    expires_at?: string;
    priority_tier?: string;
  }) =>
    apiRequest({
      url: `/v1/api-keys/${keyId}`,
      method: "PUT",
      token,
      data,
    }),

  revoke: (token: string, keyId: string) =>
    apiRequest({
      url: `/v1/api-keys/${keyId}/revoke`,
      method: "POST",
      token,
    }),

  // Analytics endpoints
  getQuota: (token: string, keyId: string) =>
    apiRequest<{
      current_usage: number;
      limit: number;
      usage_percent: number;
      warning_threshold: number;
      is_warning: boolean;
      reset_time: string;
    }>({
      url: `/v1/api-keys/${keyId}/quota`,
      token,
    }),

  getUsageStats: (token: string, keyId: string, days: number = 7) =>
    apiRequest<{
      total_requests: number;
      avg_response_time_ms: number;
      error_count: number;
      total_llm_tokens: number;
      total_request_bytes: number;
      total_response_bytes: number;
      period_days: number;
    }>({
      url: `/v1/api-keys/${keyId}/usage-stats`,
      token,
      params: { days: String(days) },
    }),

  getAuditLog: (token: string, keyId: string, limit: number = 50, offset: number = 0) =>
    apiRequest<{
      events: Array<{
        id: number;
        event_type: string;
        changes?: Record<string, any>;
        changed_by?: string;
        timestamp: string;
        reason?: string;
      }>;
    }>({
      url: `/v1/api-keys/${keyId}/audit-log`,
      token,
      params: { limit: String(limit), offset: String(offset) },
    }),

  getLlmControl: (token: string, keyId: string) =>
    apiRequest<{
      llm_enabled: boolean;
      models_allowed: string[];
      tokens_remaining: number;
      tokens_used: number;
      tokens_limit: number;
      cost_remaining: number;
      current_cost: number;
      cost_limit: number;
      can_afford: boolean;
    }>({
      url: `/v1/api-keys/${keyId}/llm-control`,
      token,
    }),

  updateLlmControl: (token: string, keyId: string, data: {
    llm_enabled?: boolean;
    llm_models_allowed?: string[];
    max_tokens_per_day?: number;
    llm_cost_limit?: number;
  }) =>
    apiRequest({
      url: `/v1/api-keys/${keyId}/llm-control`,
      method: "PUT",
      token,
      data,
    }),

  getPermissions: (token: string) =>
    apiRequest<{
      permissions: Record<string, string>;
      total: number;
    }>({
      url: "/v1/permissions",
      token,
    }),
}

// Metrics endpoints
export const metricsApi = {
  summary: (token: string, since: string = "24h", scope: "user" | "org" | "global" = "org") =>
    apiRequest<{
      total_queries: number
      successful_queries: number
      failed_queries: number
      avg_response_time: number
      period?: string
      scope?: string
      organization_id?: string | null
      user_id?: string | null
    }>({
      url: "/v1/metrics/summary",
      token,
      params: { since, scope },
    }),

  queries: (
    token: string,
    limit?: number,
    since: string = "24h",
    scope: "user" | "org" | "global" = "org",
    offset: number = 0,
  ) =>
    apiRequest<{
      queries: Array<{ question: string; answer: string; timestamp: string }>
      period?: string
      scope?: string
      organization_id?: string | null
      user_id?: string | null
      limit?: number
      offset?: number
    }>({
      url: "/v1/metrics/queries",
      token,
      params: {
        since,
        scope,
        ...(typeof limit === "number" ? { limit: String(limit) } : {}),
        offset: String(offset),
      },
    }),

  volume: (
    token: string,
    days: number = 7,
    scope: "user" | "org" | "global" = "org",
  ) =>
    apiRequest<{
      data: Array<{
        date: string
        fullDate: string
        queries: number
        success: number
        failed: number
        uniqueUsers: number
        avgResponseTime: number
      }>
      period: string
      scope: string
      organization_id?: string | null
      user_id?: string | null
      total_queries: number
      total_successful: number
      total_failed: number
      avg_daily_queries: number
    }>({
      url: "/v1/metrics/volume",
      token,
      params: { days: String(days), scope },
    }),
}

// AI Agent endpoints
export const aiAgentApi = {
  // Execute AI agent commands
  executeCommands: async (token: string, input: string) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
      Authorization: `Bearer ${token}`,
    }

    try {
      const response = await fetch(getApiUrl("/v1/ai-agent/execute"), {
        method: "POST",
        headers,
        body: JSON.stringify({ input }),
      })

      const result = await response.json()
      return result
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Network error",
      }
    }
  },

  // Get available files with ID mapping
  getAvailableFiles: (token: string) =>
    apiRequest<{
      files: Array<{ id: number; filename: string; upload_timestamp: string; organization_id: string; file_size: number }>
      file_id_map: Record<string, string>
    }>({
      url: "/v1/ai-agent/files",
      token,
    }),

  // Execute specific command types
  fileContent: (token: string, filename: string) =>
    apiRequest<{ content: string }>({
      url: `/v1/ai-agent/file-content/${encodeURIComponent(filename)}`,
      token,
    }),

  fileById: (token: string, fileId: string) =>
    apiRequest<{ content: string }>({
      url: `/v1/ai-agent/file-id/${encodeURIComponent(fileId)}`,
      token,
    }),

  fuzzySearch: (token: string, query: string) =>
    apiRequest<{
      matches: Array<{ filename: string; similarity: number; match_type: string }>
    }>({
      url: "/v1/ai-agent/fuzzy-search",
      method: "POST",
      token,
      data: { query },
    }),

  kbSearch: (token: string, query: string) =>
    apiRequest<{
      results: Array<{ source: string; content: string }>
      overview?: string
    }>({
      url: "/v1/ai-agent/kb-search",
      method: "POST",
      token,
      data: { query },
    }),

  semanticSearch: (token: string, query: string) =>
    apiRequest<{
      results: Array<{ source: string; content: string }>
      overview?: string
    }>({
      url: "/v1/ai-agent/semantic-search",
      method: "POST",
      token,
      data: { query },
    }),

  batchOverviews: (token: string, queries: string[], results: any[]) =>
    apiRequest<{ overviews: string[] }>({
      url: "/v1/query/batch-overview",
      method: "POST",
      token,
      data: { queries, results },
    }),
}

// Landing Pages API endpoints
export const landingPagesApi = {
  // Blog endpoints
  getBlogPosts: async (params?: { 
    category?: string; 
    featured?: boolean; 
    limit?: number; 
    offset?: number; 
    search?: string 
  }) => {
    const headers: Record<string, string> = {
      "ngrok-skip-browser-warning": "true",
      "Content-Type": "application/json"
    }

    // Handle absolute URLs (for CMS API - now unified with main API on port 9001)
    let url = getCmsEndpointUrl("/blog/posts")
    
    // Add query params
    if (params && Object.keys(params).length > 0) {
      const queryParams = new URLSearchParams()
      if (params.search) queryParams.append('search', params.search)
      if (params.category) queryParams.append('category', params.category)
      if (params.featured) queryParams.append('featured', params.featured.toString())
      if (params.limit) queryParams.append('limit', params.limit.toString())
      if (params.offset) queryParams.append('offset', params.offset.toString())
      url += `?${queryParams.toString()}`
    }

    try {
      const response = await fetch(url, { headers })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json() as Array<{
        id: number
        title: string
        slug: string
        excerpt?: string
        content: string
        author: string
        category: string
        featured: boolean
        tags: string[]
        image_url?: string
        read_time?: string
        status: string
        views: number
        created_at: string
        updated_at: string
      }>
    } catch (error) {
      console.error('Error fetching blog posts:', error)
      return []
    }
  },

  getBlogPost: async (slug: string) => {
    const headers: Record<string, string> = {
      "ngrok-skip-browser-warning": "true",
      "Content-Type": "application/json"
    }

    try {
      const response = await fetch(getCmsEndpointUrl(`/blog/posts/${slug}`), { headers })
      
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()

      if (data?.error?.code === "post_not_found") return null

      return data
    } catch (error) {
      console.error('Error fetching blog post:', error)
      return null
    }
  },

  getBlogCategories: async () => {
    const headers: Record<string, string> = {
      "ngrok-skip-browser-warning": "true",
      "Content-Type": "application/json"
    }

    try {
      const response = await fetch(getCmsEndpointUrl("/blog/categories"), { headers })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json() as Array<{
        name: string
        slug: string
        description: string
        color: string
      }>
    } catch (error) {
      console.error('Error fetching blog categories:', error)
      return []
    }
  },

  subscribeNewsletter: async (email: string, preferences?: Record<string, any>) => {
    const headers: Record<string, string> = {
      "ngrok-skip-browser-warning": "true",
      "Content-Type": "application/json"
    }

    try {
      const response = await fetch(getCmsEndpointUrl("/blog/subscribe"), {
        method: "POST",
        headers,
        body: JSON.stringify({ email, preferences }),
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error subscribing to newsletter:', error)
      return { status: "error", message: "Failed to subscribe" }
    }
  },

  // Contact endpoints
  submitContact: (data: {
    name: string
    email: string
    company?: string
    phone?: string
    message: string
    inquiry_type?: string
  }) =>
    apiRequest({
      url: getCmsEndpointUrl("/contact/submit"),
      method: "POST",
      data,
    }),

  getContactOptions: () =>
    apiRequest<{
      email_support: { title: string; description: string; email: string; hours: string; response_time: string }
      phone_support: { title: string; description: string; phone: string; hours: string; response_time: string }
      telegram_support: { title: string; description: string; telegram: string; hours: string; response_time: string }
    }>({
      url: getCmsEndpointUrl("/contact/options"),
    }),

  // Sales endpoints
  submitDemoRequest: (data: {
    name: string
    email: string
    company: string
    phone?: string
    job_title?: string
    company_size?: string
    industry?: string
    preferred_time?: string
    preferred_date?: string
    message?: string
  }) =>
    apiRequest({
      url: getCmsEndpointUrl("/sales/demo-request"),
      method: "POST",
      data,
    }),

  submitQuoteRequest: (data: {
    company_name: string
    contact_email: string
    contact_name?: string
    phone?: string
    requirements?: string
    user_count?: number
    current_solution?: string
    budget_range?: string
    timeline?: string
  }) =>
    apiRequest({
      url: getCmsEndpointUrl("/sales/quote-request"),
      method: "POST",
      data,
    }),

  // Status endpoints
  getServiceStatus: () =>
    apiRequest<Array<{
      id: number
      name: string
      description: string
      status: string
      uptime_percentage: number
      last_checked: string
      created_at: string
      updated_at: string
    }>>({
      url: getCmsEndpointUrl("/status/services"),
    }),

  getSystemOverview: () =>
    apiRequest<{
      overall_status: string
      overall_message: string
      services: Array<{
        id: number
        name: string
        description: string
        status: string
        uptime_percentage: number
        last_checked: string
      }>
      active_incidents: Array<{
        id: number
        title: string
        description: string
        severity: string
        status: string
        start_time: string
        end_time?: string
        affected_services: string[]
      }>
      last_updated: string
    }>({
      url: getCmsEndpointUrl("/status/overview"),
    }),

  // Help Center endpoints
  getHelpArticles: (params?: { category?: string; difficulty?: string; limit?: number; offset?: number; search?: string }) =>
    apiRequest<Array<{
      id: number
      title: string
      slug: string
      description: string
      content: string
      category: string
      views: number
      helpful_count: number
      total_votes: number
      read_time?: string
      difficulty: string
      order_index: number
      status: string
      created_at: string
      updated_at: string
    }>>({
      url: getCmsEndpointUrl("/help/articles"),
      params: params as Record<string, string>,
    }),

  getHelpCategories: () =>
    apiRequest<Array<{
      id: number
      name: string
      slug: string
      description?: string
      icon?: string
      order_index: number
      created_at: string
    }>>({
      url: getCmsEndpointUrl("/help/categories"),
    }),

  markArticleHelpful: (articleId: number, helpful: boolean) =>
    apiRequest({
      url: getCmsEndpointUrl(`/help/articles/${articleId}/helpful`),
      method: "POST",
      data: { helpful },
    }),

  // Documentation endpoints
  getDocumentation: (params?: { category?: string; difficulty?: string; limit?: number; offset?: number; search?: string }) =>
    apiRequest<Array<{
      id: number
      title: string
      slug: string
      content: string
      category: string
      difficulty: string
      read_time?: string
      order_index: number
      status: string
      created_at: string
      updated_at: string
    }>>({
      url: getCmsEndpointUrl("/docs"),
      params: params as Record<string, string>,
    }),

  getDocumentationCategories: () =>
    apiRequest<Array<{
      name: string
      slug: string
      description: string
    }>>({
      url: getCmsEndpointUrl("/docs/categories"),
    }),

  // Analytics endpoints
  trackVisit: (data: {
    page: string
    session_id?: string
    ip_address?: string
    user_agent?: string
    referrer?: string
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
  }) =>
    apiRequest({
      url: getCmsEndpointUrl("/analytics/track-visit"),
      method: "POST",
      data,
    }),

  trackEvent: (data: {
    event_type: string
    page?: string
    user_id?: string
    session_id?: string
    metadata?: Record<string, any>
  }) =>
    apiRequest({
      url: getCmsEndpointUrl("/analytics/track-event"),
      method: "POST",
      data,
    }),
}

// Enhanced dashboard endpoints
export const dashboardApi = {
  getEmployeeData: (token: string, since: string = "24h") =>
    apiRequest<{
      user_metrics: {
        total_queries: number
        successful_queries: number
        failed_queries: number
        avg_response_time: number
        documents_accessed: number
      }
      recent_queries: Array<{ question: string; answer: string; timestamp: string; success?: boolean }>
      organization_stats: {
        organization_id: string
        total_documents: number
        new_documents: number
        active_users: number
      }
    }>({
      url: "/v1/dashboard/employee",
      token,
      params: { since },
    }),

  getAdminData: (token: string, since: string = "24h", scope: "org" | "global" = "global") =>
    apiRequest<{
      system_health: {
        status: "healthy" | "warning" | "critical"
        uptime: number
        api_response_time: number
        error_rate: number
        active_connections: number
        database_status: "connected" | "disconnected" | "slow"
        storage_usage: { used: number; total: number; percentage: number }
      }
      user_analytics: {
        total_users: number
        active_users_today: number
        new_registrations_today: number
        active_users_week: number
        user_growth_rate: number
        top_active_users: Array<{ username: string; queries: number; last_active: string }>
        pending_approvals: number
      }
      content_metrics: {
        total_documents: number
        documents_uploaded_today: number
        storage_used_gb: number
        popular_documents: Array<{ filename: string; views: number; last_accessed: string }>
        flagged_content: number
        processing_queue: number
      }
      security_alerts: {
        failed_logins: number
        suspicious_activity: number
        permission_denials: number
        active_sessions: number
        api_key_usage: Array<{ key_name: string; usage: number; last_used: string }>
      }
      business_intelligence: {
        search_trends: Array<{ term: string; frequency: number; trend: "up" | "down" | "stable" }>
        department_usage: Array<{ department: string; queries: number; users: number }>
        productivity_metrics: { avg_queries_per_user: number; success_rate: number; response_time_avg: number }
        cost_metrics: { cost_per_query: number; daily_operational_cost: number; monthly_projection: number }
      }
      scope: string
      organization_id?: string | null
      period: string
    }>({
      url: "/v1/dashboard/admin",
      token,
      params: { since, scope },
    }),

  // Quiz Management
  getQuizzes: async (token: string, category?: string, difficulty?: string) => {
    const params: Record<string, string> = {}
    if (category) params.category = category
    if (difficulty) params.difficulty = difficulty

    return apiRequest<{
      quizzes: Array<{
        id: string
        title: string
        description: string
        category: string
        difficulty: "easy" | "medium" | "hard"
        time_limit: number
        passing_score: number
        questions: Array<{
          id: string
          type: "multiple-choice" | "true-false" | "text"
          question: string
          options?: string[]
          correct_answer: string | number
          explanation?: string
          points: number
        }>
        created_at: string
        updated_at: string
        organization_id: string
      }>
    }>({
      url: "/v1/admin/quizzes",
      token,
      params,
    })
  },

  getQuiz: async (quizId: string, token: string) => {
    return apiRequest<{
      id: string
      title: string
      description: string
      category: string
      difficulty: "easy" | "medium" | "hard"
      time_limit: number
      passing_score: number
      questions: Array<{
        id: string
        type: "multiple-choice" | "true-false" | "text"
        question: string
        options?: string[]
        correct_answer: string | number
        explanation?: string
        points: number
      }>
      created_at: string
      updated_at: string
      organization_id: string
    }>({
      url: `/v1/admin/quizzes/${quizId}`,
      token,
    })
  },

  createQuiz: async (quizData: {
    title: string
    description: string
    category: string
    difficulty: "easy" | "medium" | "hard"
    time_limit: number  
    passing_score: number
    questions: Array<{
      id: string
      type: "multiple-choice" | "true-false" | "text"
      question: string
      options?: string[]
      correct_answer: string | number
      explanation?: string
      points: number
    }>
  }, token: string) => {
    console.log("Creating quiz with data:", quizData)
    console.log("Using token:", token ? "present" : "missing")
    
    // Transform frontend data to backend format
    const backendQuizData = {
      ...quizData,
      questions: quizData.questions.map((q, index) => {
        const transformed = {
          id: q.id,
          type: q.type,
          question: q.question,
          options: q.options || [],
          answer: typeof q.correct_answer === 'number' && q.options ?
            q.options[q.correct_answer] :
            q.correct_answer.toString(),
          explanation: q.explanation,
          points: q.points
        }
        
        console.log(`Transforming question ${index}:`, {
          frontend: q,
          backend: transformed
        })
        
        return transformed
      })
    }
    
    console.log("Transformed quiz data for backend:", backendQuizData)
    
    const result = await apiRequest<{
      id: string
      message: string
    }>({
      url: "/v1/admin/quizzes",
      method: "POST",
      token,
      data: backendQuizData,
    })
    
    console.log("Quiz creation result:", result)
    return result
  },

  updateQuiz: async (quizId: string, quizData: {
    title?: string
    description?: string
    category?: string
    difficulty?: "easy" | "medium" | "hard"
    time_limit?: number
    passing_score?: number
    questions?: Array<{
      id?: string
      type: "multiple-choice" | "true-false" | "text"
      question: string
      options?: string[]
      correct_answer: string | number
      explanation?: string
      points: number
    }>
  }, token: string) => {
    // Transform frontend data to backend format
    const backendQuizData: any = { ...quizData }
    
    if (quizData.questions) {
      backendQuizData.questions = quizData.questions.map(q => ({
        id: q.id,
        type: q.type,
        question: q.question,
        options: q.options || [],
        answer: typeof q.correct_answer === 'number' && q.options ?
          q.options[q.correct_answer] :
          q.correct_answer.toString(),
        explanation: q.explanation,
        points: q.points
      }))
    }
    
    return apiRequest<{
      message: string
    }>({
      url: `/v1/admin/quizzes/${quizId}`,
      method: "PATCH",
      token,
      data: backendQuizData,
    })
  },

  deleteQuiz: async (quizId: string, token: string) => {
    return apiRequest<{
      message: string
    }>({
      url: `/v1/admin/quizzes/${quizId}`,
      method: "DELETE",
      token,
    })
  },

  getQuizStats: async (quizId: string, token: string) => {
    return apiRequest<{
      total_submissions: number
      pass_rate: number
      avg_score: number
      avg_time_spent: number
      recent_submissions: Array<{
        user_id: string
        score: number
        passed: boolean
        submitted_at: string
      }>
    }>({
      url: `/v1/admin/quizzes/${quizId}/statistics`,
      token,
    })
  },

  getQuizSubmissions: async (quizId: string, token: string, limit: number = 50) => {
    return apiRequest<{
      submissions: Array<{
        id: string
        user_id: string
        score: number
        passed: boolean
        time_spent: number
        submitted_at: string
        answers: Record<string, string | number>
      }>
      total: number
    }>({
      url: `/v1/admin/quizzes/${quizId}/submissions`,
      token,
      params: { limit: limit.toString() },
    })
  },

  // Invite management methods
  createInvite: async (token: string, data: {
    email?: string
    role: string
    allowed_files?: string[]
    expires_in_days?: number
    message?: string
  }) => {
    return apiRequest<{
      invite_id: string
      token: string
      link: string
      email?: string
      role: string
      expires_at: string
      created_by: string
    }>({
      url: "/v1/invites",
      method: "POST",
      token,
      data,
    })
  },

  listInvites: async (token: string) => {
    return apiRequest<{
      invites: any[]
      count: number
      listed_by: string
    }>({
      url: "/v1/invites",
      token,
    })
  },

  getInviteInfo: async (token: string) => {
    return apiRequest<{
      valid: boolean
      email?: string
      role: string
      allowed_files: string[]
      expires_at: string
      created_by: string
      message?: string
    }>({
      url: `/v1/invites/${token}`,
    })
  },

  acceptInvite: async (data: {
    token: string
    username: string
    password: string
  }) => {
    return apiRequest<{
      username: string
      role: string
      allowed_files: string[]
      organization_id?: string
    }>({
      url: "/v1/invites/accept",
      method: "POST",
      data,
    })
  },

  revokeInvite: async (token: string, inviteId: string) => {
    return apiRequest<{
      invite_id: string
      revoked_by: string
    }>({
      url: `/v1/invites/${inviteId}`,
      method: "DELETE",
      token,
    })
  },

  // Quiz generation from documents
  generateQuizFromDocument: async (filename: string, token: string, regenerate: boolean = false) => {
    return apiRequest<{
      quiz: {
        id: string
        source_filename: string
        timestamp: string
        quiz_json: string
        logs?: string
      }
    }>({
      url: `/v1/quiz/${encodeURIComponent(filename)}?regenerate=${regenerate}`,
      method: "POST",
      token,
    })
  },

  // Messaging endpoints
  messagingApi: {
    getMessageThreads: async (token: string) => {
      return apiRequest<{
        threads: Array<{
          id: string
          organization_id: string
          subject: string
          status: string
          created_at: string
          updated_at: string
          last_message_at: string
          organization_name: string
          organization_slug: string
        }>
      }>({
        url: "/v1/messages/threads",
        method: "GET",
        token,
      })
    },

    getThreadMessages: async (threadId: string, token: string) => {
      return apiRequest<{
        messages: Array<{
          id: string
          thread_id: string
          organization_id: string
          sender_type: string
          sender_name: string
          sender_email: string
          message: string
          message_type: string
          status: string
          created_at: string
          updated_at: string
        }>
      }>({
        url: `/v1/messages/threads/${threadId}/messages`,
        method: "GET",
        token,
      })
    },

    createMessageThread: async (data: {
      organization_id: string
      subject: string
      sender_name: string
      sender_email: string
      message: string
      message_type?: string
    }, token: string) => {
      return apiRequest<{
        thread_id: string
      }>({
        url: "/v1/messages/threads",
        method: "POST",
        token,
        data: data,
      })
    },

    addMessageToThread: async (threadId: string, data: {
      sender_name: string
      sender_email?: string
      message: string
      message_type?: string
    }, token: string) => {
      return apiRequest<{
        message_id: string
      }>({
        url: `/v1/messages/threads/${threadId}/messages`,
        method: "POST",
        token,
        data: data,
      })
    },

    markMessageAsRead: async (messageId: string, token: string) => {
      return apiRequest<{}>({
        url: `/v1/messages/${messageId}/read`,
        method: "POST",
        token,
      })
    },

    getUnreadCount: async (token: string) => {
      return apiRequest<{
        unread_count: number
      }>({
        url: "/v1/messages/unread-count",
        method: "GET",
        token,
      })
    },

    approveOrganization: async (orgId: string, token: string) => {
      return apiRequest<{}>({
        url: `/v1/organizations/${orgId}/approve`,
        method: "POST",
        token,
      })
    },

    rejectOrganization: async (orgId: string, token: string, reason?: string) => {
      return apiRequest<{}>({
        url: `/v1/organizations/${orgId}/reject`,
        method: "POST",
        token,
        data: reason ? { reason } : undefined,
      })
    },

    changeOrganizationStatus: async (orgId: string, token: string, newStatus: string) => {
      return apiRequest<{}>({
        url: `/v1/organizations/${orgId}`,
        method: "PATCH",
        token,
        data: { status: newStatus },
      })
    },

    getPendingOrganizations: async (token: string) => {
      return apiRequest<{
        pending_organizations: Array<{
          id: string
          name: string
          slug: string
          status: string
          created_at: string
          admin_user_id: string
          description?: string
        }>
      }>({
        url: "/v1/organizations/pending",
        method: "GET",
        token,
      })
    },
  }
}
