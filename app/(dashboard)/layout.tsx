"use client";

import type React from "react";
import { AppSidebar } from "@/components/sidebar";
import { AuthGuard } from "@/components/auth-guard";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="glass mx-4 mt-4 flex h-14 shrink-0 items-center gap-2 rounded-2xl px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-8">
            <div className="w-full min-w-0">{children}</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}
