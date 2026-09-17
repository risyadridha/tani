"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  trend = "neutral",
  className,
}: StatCardProps) {
  const trendColors = {
    up: "text-success",
    down: "text-destructive",
    neutral: "text-muted-foreground",
  };

  const trendIcons = {
    up: <TrendingUp className="h-4 w-4" />,
    down: <TrendingDown className="h-4 w-4" />,
    neutral: <Minus className="h-4 w-4" />,
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-bold text-foreground truncate">
              {value}
            </p>
            {change !== undefined && (
              <div className="mt-2 flex items-center gap-1 text-sm">
                <span className={cn("font-medium", trendColors[trend])}>
                  {trendIcons[trend]}
                  {change >= 0 ? "+" : ""}{change}%
                </span>
                <span className="text-muted-foreground">
                  {changeLabel || "vs periode sebelumnya"}
                </span>
              </div>
            )}
          </div>
          {icon && <div className="text-muted-foreground/50">{icon}</div>}
        </div>
      </CardContent>
    </Card>
  );
}