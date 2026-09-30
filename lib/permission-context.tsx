"use client"

import { createContext, useContext, type ReactNode } from "react"
import { useAuth } from "@/lib/auth-context"

interface PermissionContextType {
  canViewFiles: boolean
  canUploadFiles: boolean
  canDownloadFiles: boolean
  canSearchFiles: boolean
  canManageUsers: boolean
  canManageFiles: boolean
  canDeleteFiles: boolean
  canEditFiles: boolean
  canViewSystemStats: boolean
  canManageApiKeys: boolean
  canViewReports: boolean
  canManageOrganizations: boolean
}

const PermissionContext = createContext<PermissionContextType | null>(null)

// This used to call useAuth().hasPermission(PERMISSIONS.X) for each field,
// but useAuth()'s context never actually exposed a hasPermission function
// (grep internal/auth-context.tsx - there's a `role` field and nothing
// else), and lib/auth-context.tsx's PERMISSIONS constant only ever defined
// 6 of the 12 keys this provider referenced, in a "view_files"-style
// vocabulary that doesn't match the colon-style ("view:files") vocabulary
// lib/roles.ts's real permission sets use. That made every field here throw
// or evaluate to undefined the moment this provider was ever mounted - see
// WAI ticket for details. Real client-visible authorization in this app is
// coarse (role: "admin" | "user" | "owner", already gating features
// elsewhere via `isAdmin`), so derive from that directly instead of routing
// through the disconnected roles.ts/permission-validator.ts system.
export function PermissionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const isAdminOrOwner = user?.role === "admin" || user?.role === "owner"

  const permissions: PermissionContextType = {
    canViewFiles: true,
    canUploadFiles: true,
    canDownloadFiles: true,
    canSearchFiles: true,
    canManageUsers: isAdminOrOwner,
    canManageFiles: isAdminOrOwner,
    canDeleteFiles: isAdminOrOwner,
    canEditFiles: isAdminOrOwner,
    canViewSystemStats: isAdminOrOwner,
    canManageApiKeys: isAdminOrOwner,
    canViewReports: isAdminOrOwner,
    canManageOrganizations: user?.role === "owner",
  }

  return (
    <PermissionContext.Provider value={permissions}>
      {children}
    </PermissionContext.Provider>
  )
}

export function usePermissions() {
  const context = useContext(PermissionContext)
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionProvider")
  }
  return context
}

// Role-based component wrapper
interface RoleGuardProps {
  roles: ("admin" | "user" | "editor" | "viewer" | "owner")[]
  children: ReactNode
  fallback?: ReactNode
}

export function RoleGuard({ roles, children, fallback = null }: RoleGuardProps) {
  const { user } = useAuth()

  if (user && roles.includes(user.role)) {
    return <>{children}</>
  }

  return <>{fallback}</>
}
