"use client";

import type React from "react";
import "@/app/globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { DatabaseInitializer } from "@/components/database-initializer";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/auth-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <DatabaseInitializer>
              {children}
              <Toaster />
            </DatabaseInitializer>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
