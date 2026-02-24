"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Clean starter workspace. Build your new project from here.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Project Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span>Template cleanup</span>
              <Badge>Ready</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Database connection</span>
              <Badge variant="secondary">Configured</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Auth and users</span>
              <Badge variant="secondary">Enabled</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Add your domain entities and tables.</p>
            <p>2. Replace dashboard cards with your app metrics.</p>
            <p>3. Add new routes and feature modules.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
