"use client";

import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
  Home,
  Users,
  Blocks,
  Settings,
  LayoutTemplate,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: string[];
}

const navMain: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/components", label: "Components", icon: Blocks },
  { href: "/employees", label: "Users", icon: Users, roles: ["admin", "manager"] },
];

function NavMain({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role as string | undefined;

  const filteredItems = items.filter((item) => {
    if (!item.roles) return true;
    if (!userRole) return false;
    return item.roles.includes(userRole);
  });

  return (
    <SidebarMenu>
      {filteredItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
              <Link href={item.href}>
                <Icon />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const { data: session } = useSession();
  const isSettingsActive = pathname === "/settings";
  const userRole = session?.user?.role as string | undefined;
  const userName = session?.user?.name || "User";
  const userEmail = session?.user?.email || "";

  const canAccessSettings = userRole === "admin" || userRole === "manager";

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <LayoutTemplate className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Boilerplate Dashboard</span>
                  <span className="truncate text-xs">Starter Template</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavMain items={navMain} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {canAccessSettings && (
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                asChild
                isActive={isSettingsActive}
                tooltip="Settings"
              >
                <Link href="/settings">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <Settings className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {state === "collapsed" ? "Settings" : "System Settings"}
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="w-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {userName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <div className="font-semibold truncate w-full">{userName}</div>
                    <div className="text-xs text-muted-foreground truncate w-full">
                      {userEmail}
                    </div>
                    {userRole && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {userRole}
                      </Badge>
                    )}
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                  className="text-destructive cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
