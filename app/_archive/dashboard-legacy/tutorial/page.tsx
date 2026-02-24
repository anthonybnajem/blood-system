"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  PlayCircle,
  BookOpenCheck,
  Settings,
  Beef,
  Package2,
  ReceiptText,
} from "lucide-react";

const steps = [
  {
    title: "1. Set Up Your Store",
    description:
      "Fill out store information, taxes, and receipt branding under Settings → Store Information.",
    link: "/settings",
  },
  {
    title: "2. Add Categories",
    description:
      "Create Carnico-specific groupings (e.g., Beef Cuts, Sausages, Ready Meals).",
    details: [
      "Navigate to Products → Categories and add at least one category before moving on.",
      "Categories are required; you cannot create a product without assigning it to a category.",
    ],
    link: "/categories",
  },
  {
    title: "3. Add Products",
    description:
      "Add items such as Ribeye Steak (sold by kg) or Merguez Sausage (per unit) once categories exist.",
    details: [
      "Define the selling method (per item or by weight) for each product.",
      "Upload product photos or SKU/barcode data if available for faster sales.",
    ],
    link: "/products",
  },
  {
    title: "4. Manage Inventory",
    description:
      "Track meat batches, record adjustments (spoilage, trimming), and review movement history.",
    link: "/inventory",
  },
  {
    title: "5. Configure Receipts",
    description:
      "Design Carnico-branded receipts (logo, thank-you note, barcode) in the Receipt Designer.",
    link: "/receipt-designer",
  },
  {
    title: "6. Start Selling",
    description:
      "Use the Sales screen to weigh or scan products, apply discounts, and print receipts for wholesale or retail orders.",
    link: "/sales",
  },
  {
    title: "7. Review Reports",
    description:
      "Monitor daily revenue, top-selling cuts, and export sales/history data from Reports.",
    link: "/reports",
  },
];

const sampleProducts = [
  { name: "Ribeye Steak", unit: "Sold by weight (kg)", note: "Premium beef cut for retail display" },
  { name: "Ground Beef", unit: "Sold by weight (kg)", note: "Batch-tracked for burger production" },
  { name: "Merguez Sausage", unit: "Sold per unit or packs", note: "Spicy sausage popular in wholesale orders" },
];

export default function TutorialPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BookOpenCheck className="h-8 w-8 text-primary" />
            Carnico POS Tutorial
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Beef className="h-4 w-4 text-primary" />
            Tailored for Carnico’s meat-processing workflows
          </div>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          Follow this guided checklist to get your POS ready for day-to-day operations. Each step links to the appropriate page.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {steps.map((step) => (
          <Card key={step.title} className="border-2 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                {step.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CardDescription>{step.description}</CardDescription>
              {step.details && (
                <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                  {step.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              )}
              <Button asChild variant="outline" className="gap-2">
                <Link href={step.link}>
                  <PlayCircle className="h-4 w-4" />
                  Go to {step.link.replace("/", "").toUpperCase() || "HOME"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-2 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package2 className="h-5 w-5 text-primary" />
            Sample Product Setup
          </CardTitle>
          <CardDescription>
            Examples aligned with Carnico’s meat catalog. Adjust units (by kg or unit) as needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {sampleProducts.map((product) => (
            <div key={product.name} className="p-3 rounded-lg border bg-muted/40">
              <p className="font-semibold">{product.name}</p>
              <p className="text-sm text-muted-foreground">{product.unit}</p>
              <p className="text-xs text-muted-foreground">{product.note}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-2 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-primary" />
            Receipt Setup Tutorial
          </CardTitle>
          <CardDescription>
            Ensure every Carnico receipt reflects your brand and information clearly.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground">
        
          <p>
            1. Enter store details (address, phone, meat-processing certification) under Store Information so they appear on every receipt.
          </p>
          <p>
            2. Add a thank-you message (e.g., “Thank you for choosing Carnico Meat Factory”) and optional returns policy.
          </p>
         
        </CardContent>
      </Card>

      <Card className="border-2 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Helpful Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-sm text-muted-foreground">
            • Use Inventory → History to export/import stock adjustments.<br />
            • Customize receipts in the Receipt Designer before going live.<br />
            • Export sales and movement data regularly for backups.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
