"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useTranslation } from "@/src/i18n"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Brain,
  Home,
  Search,
  FileText,
  ShoppingCart,
  LayoutDashboard,
  Settings,
  LogOut,
  ChevronUp,
  Key,
  Users,
  BarChart3,
} from "lucide-react"

interface NavItem {
  title: string
  url: string
  icon: any
}

export function AppSidebar() {
  const { t } = useTranslation()
  const pathname = usePathname()
  const { user, isAdmin, logout } = useAuth()

  const userNavItems: NavItem[] = [
    { title: t('navigation.dashboard'), url: "/app", icon: Home },
    { title: t('navigation.search'), url: "/app/search", icon: Search },
    { title: t('navigation.files'), url: "/app/files", icon: FileText },
    { title: t('navigation.quizzes'), url: "/app/quizzes", icon: Brain },
  ]

  const adminNavItems: NavItem[] = [
    { title: t('navigation.dashboard'), url: "/app/admin", icon: BarChart3 },
    { title: t('navigation.userManagement'), url: "/app/admin/users", icon: Users },
    { title: t('navigation.apiKeys'), url: "/app/admin/api-keys", icon: Key },
    { title: t('navigation.fileManagement'), url: "/app/admin/files", icon: FileText },
    { title: t('navigation.search'), url: "/app/search", icon: Search },
    { title: t('navigation.quizManagement'), url: "/app/admin/quizzes", icon: Brain },
    { title: t('navigation.quizzes'), url: "/app/quizzes", icon: Brain },
  ]

  const integrationItems: NavItem[] = [
    { title: t('navigation.openCartPlugins'), url: "/app/plugins", icon: ShoppingCart },
    { title: t('navigation.catalogs'), url: "/app/catalogs", icon: LayoutDashboard },
  ]

  // "/app" and "/app/admin" are prefixes of every other route here, so a
  // naive startsWith() would keep Dashboard highlighted on every page.
  // Only match those two exactly; everything else matches on a segment
  // boundary so a future nested route (e.g. /app/admin/quizzes/123) still
  // highlights its parent nav item.
  const isNavItemActive = (url: string) =>
    url === "/app" || url === "/app/admin" ? pathname === url : pathname === url || pathname.startsWith(url + "/")

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/app">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">{t('WikiAi')}</span>
                    <span className="text-xs text-muted-foreground">{user?.organization}</span>
                  </div>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{isAdmin ? t('navigation.admin') : t('navigation.main')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {(isAdmin ? adminNavItems : userNavItems).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isNavItemActive(item.url)}>
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Integrations</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {integrationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <Link href={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )} */} {/* Removed on 11.01.2026 (11 Jan) */}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {user?.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium">{user?.username}</span>
                    <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
                  </div>
                  <ChevronUp className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-56" align="start">
                <DropdownMenuItem asChild>
                  <Link href="/app/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    {t('navigation.settings')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('navigation.signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
