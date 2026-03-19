import packageJson from "@/package.json";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const contactChannels = [
  {
    label: "Phone / WhatsApp",
    value: "+961 76340017",
  },
  {
    label: "Email",
    value: "anthonybounajem@gmail.com",
  },
];

export default function ContactDeveloperPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contact Developer</h1>
        <p className="mt-1 text-muted-foreground">
          Quick access to technical support and deployment details for this installation.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Support Channels</CardTitle>
          <CardDescription>
            Contact the developer directly for technical support, setup help, updates, or troubleshooting related to this installation.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {contactChannels.map((channel) => (
            <div
              key={channel.label}
              className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm"
            >
              <div className="text-sm font-medium text-muted-foreground">{channel.label}</div>
              <div className="mt-2 text-lg font-semibold">{channel.value}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Installation Info</CardTitle>
          <CardDescription>
            Useful details to send when reporting issues.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/70 p-4">
            <div className="text-sm text-muted-foreground">Application</div>
            <div className="mt-1 font-semibold">{packageJson.name}</div>
          </div>
          <div className="rounded-2xl border border-border/70 p-4">
            <div className="text-sm text-muted-foreground">Version</div>
            <div className="mt-1 flex items-center gap-2 font-semibold">
              <span>{packageJson.version}</span>
              <Badge variant="secondary">Desktop / Web</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
