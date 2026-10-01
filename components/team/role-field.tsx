"use client"

import { useTranslation } from "@/src/i18n"
import { cn } from "@/lib/utils"

/** Roles identity-service knows, most powerful first. */
export const ROLES = ["owner", "admin", "member", "viewer"] as const
export type Role = (typeof ROLES)[number]

export const roleBadgeVariant = (role: string) => (role === "owner" || role === "admin" ? "default" : "secondary")

/**
 * Role picker as a list of options with a one-line explanation each.
 * Only owners may hand out the owner role, so it is hidden for everyone else.
 */
export function RoleField({
  id,
  value,
  onChange,
  canAssignOwner,
  disabled,
}: {
  id: string
  value: string
  onChange: (role: Role) => void
  canAssignOwner: boolean
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const roles = ROLES.filter((role) => role !== "owner" || canAssignOwner)
  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="mb-2 text-sm font-medium leading-none">{t("team.users.role")}</legend>
      <div className="flex flex-col gap-1.5">
        {roles.map((role) => (
          <label
            key={role}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-2.5 transition-colors",
              value === role ? "border-primary/50 bg-primary/[0.06]" : "border-border hover:bg-muted/50",
            )}
          >
            <input
              type="radio"
              name={id}
              value={role}
              checked={value === role}
              onChange={() => onChange(role)}
              className="mt-1 size-4 accent-[var(--color-primary)]"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">{t(`team.roles.${role}`)}</span>
              <span className="block text-[13px] leading-snug text-muted-foreground">{t(`team.roleHints.${role}`)}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
