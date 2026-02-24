import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { COMPONENT_CATALOG } from "./component-catalog";

export default function ComponentsIndexPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Components</h1>
        <p className="mt-1 text-muted-foreground">
          Dummy showcase pages for reusable UI building blocks.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {COMPONENT_CATALOG.map((item) => (
          <Card key={item.slug}>
            <CardHeader>
              <CardTitle className="text-xl">{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{item.description}</p>
              <Button asChild variant="outline">
                <Link href={`/components/${item.slug}`}>Open {item.title}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
