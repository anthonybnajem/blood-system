"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  variants?: any;
  href?: string;
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  variants,
  href,
}: StatsCardProps) {
  const cardContent = (
    <Card
      className={
        href
          ? "transition-all hover:border-primary hover:shadow-md focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
          : undefined
      }
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  return (
    <motion.div variants={variants}>
      {href ? (
        <Link href={href} className="block focus:outline-none">
          {cardContent}
        </Link>
      ) : (
        cardContent
      )}
    </motion.div>
  );
}
