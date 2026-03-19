"use client";

import Link from "next/link";
import { BookOpen, FileText, Search, Settings2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  {
    title: "Search Or Select Patient",
    description:
      "Open the patient search page, type the name, and select the correct patient before starting any report.",
    href: "/lab-entry/search",
    action: "Open Search",
    icon: Search,
  },
  {
    title: "Create Patient If Needed",
    description:
      "If the patient does not exist, use Create Patient. The page warns when the full name looks very similar to an existing patient.",
    href: "/lab-entry/create-patient?backTo=%2Flab-entry%2Ftutorial&backLabel=Back%20to%20Tutorial",
    action: "Create Patient",
    icon: UserPlus,
  },
  {
    title: "Open Patient Page",
    description:
      "Use the patient details page to review report history, print counters, activity history, and deleted or updated report actions.",
    href: "/lab-entry/search",
    action: "Go To Patients",
    icon: BookOpen,
  },
  {
    title: "Create Or Edit Report",
    description:
      "From the patient page, create a new report or reopen an old one in the report editor. Saving updates the report history.",
    href: "/lab-entry/search",
    action: "Start From Search",
    icon: FileText,
  },
  {
    title: "Maintain The Catalog",
    description:
      "Admins and managers can manage departments, panels, and inputs from Lab Config. If a test is used in reports, activity stays tracked.",
    href: "/lab-config",
    action: "Open Lab Config",
    icon: Settings2,
  },
];

export default function LabTutorialPage() {
  return (
    <div className="mx-auto flex w-full  flex-col gap-6">
      <Card className="border-slate-200/80 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-3xl">How To Use</CardTitle>
          <CardDescription>
            Follow this workflow for patient search, patient creation, report entry, printing, and report history.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card key={step.title} className="border-slate-200/80 dark:border-slate-800">
                <CardHeader className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Step {index + 1}
                      </div>
                      <CardTitle className="text-lg">{step.title}</CardTitle>
                    </div>
                  </div>
                  <CardDescription>{step.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline">
                    <Link href={step.href}>{step.action}</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 dark:border-slate-800">
        <CardHeader>
          <CardTitle>Quick Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Search should be the main entry point for existing patients.</p>
          <p>Create Patient is for new patients only, and it warns about similar names.</p>
          <p>Patient pages now contain report history tables and report activity tables.</p>
          <p>Printing updates the print counter and last printed time automatically.</p>
        </CardContent>
      </Card>
    </div>
  );
}
