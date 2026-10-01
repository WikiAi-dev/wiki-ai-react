"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import { BarChart3, ChevronsUpDown, FileText, Home, Key, LogOut, Mail, Search, Settings, Users } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useTranslation } from "@/src/i18n"
import { Wordmark } from "@/components/wordmark"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface NavItem {
  title: string
  url: string
  icon: LucideIcon
}

interface NavGroup {
  label: string
  items: NavItem[]
}

export function AppSidebar() {
  const { t } = useTranslation()
  const pathname = usePathname()
  const { user, isAdmin, logout } = useAuth()

  const adminGroups: NavGroup[] = [
    { label: t("navigation.groups.overview"), items: [{ title: t("navigation.dashboard"), url: "/app/admin", icon: BarChart3 }] },
    {
      label: t("navigation.groups.knowledge"),
      items: [
        { title: t("navigation.search"), url: "/app/search", icon: Search },
        { title: t("navigation.files"), url: "/app/admin/files", icon: FileText },
      ],
    },
    {
      label: t("navigation.groups.team"),
      items: [
        { title: t("navigation.users"), url: "/app/admin/users", icon: Users },
        { title: t("navigation.invites"), url: "/app/admin/invites", icon: Mail },
        { title: t("navigation.apiKeys"), url: "/app/admin/api-keys", icon: Key },
      ],
    },
  ]

  const userGroups: NavGroup[] = [
    { label: t("navigation.groups.overview"), items: [{ title: t("navigation.dashboard"), url: "/app", icon: Home }] },
    {
      label: t("navigation.groups.knowledge"),
      items: [
        { title: t("navigation.search"), url: "/app/search", icon: Search },
        { title: t("navigation.files"), url: "/app/files", icon: FileText },
      ],
    },
  ]

  // "/app" and "/app/admin" are prefixes of every other route, so they only
  // match exactly; everything else also matches its nested routes.
  const isActive = (url: string) =>
    url === "/app" || url === "/app/admin"
      ? pathname === url || (url === "/app" && pathname.startsWith("/app/dashboard"))
      : pathname === url || pathname.startsWith(url + "/")

  const roleKey = user?.role === "owner" || user?.role === "admin" ? user.role : "user"
  const initial = user?.username?.charAt(0).toUpperCase() || "?"

  return (
    <Sidebar>
      <SidebarHeader className="px-3 pt-4 pb-2">
        <Link
          href="/app"
          className="flex flex-col gap-1 rounded-lg px-1.5 py-1 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <Wordmark />
          {user?.organization && <span className="truncate pl-[2.375rem] text-xs text-muted-foreground">{user.organization}</span>}
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-1">
        {(isAdmin ? adminGroups : userGroups).map((group) => (
          <SidebarGroup key={group.label} className="py-1.5">
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link href={item.url}>
                        <item.icon strokeWidth={1.75} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="h-12 px-2 data-[state=open]:bg-sidebar-accent">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {initial}
                  </span>
                  <span className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate text-sm font-medium text-sidebar-foreground">{user?.username}</span>
                    <span className="truncate text-xs text-muted-foreground">{t(`navigation.roles.${roleKey}`)}</span>
                  </span>
                  <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-(--radix-dropdown-menu-trigger-width) min-w-56">
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{t("navigation.account")}</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href="/app/settings">
                    <Settings />
                    {t("navigation.settings")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={logout}>
                  <LogOut />
                  {t("navigation.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
