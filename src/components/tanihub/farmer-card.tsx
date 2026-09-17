"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Star, MapPin, CheckCircle2, MessageSquare, Package } from "lucide-react";

interface FarmerCardProps {
  image?: string;
  name: string;
  location: string;
  verified: boolean;
  rating: number;
  reviewCount: number;
  completedOrders: number;
  responseRate: number;
  memberSince: string;
  commodities: string[];
  onViewProfile?: () => void;
  onChat?: () => void;
  className?: string;
}

export function FarmerCard({
  image,
  name,
  location,
  verified,
  rating,
  reviewCount,
  completedOrders,
  responseRate,
  memberSince,
  commodities,
  onViewProfile,
  onChat,
  className,
}: FarmerCardProps) {
  return (
    <Card className={cn("overflow-hidden transition-shadow hover:shadow-subtle-hover", className)}>
      <CardHeader className="flex flex-row items-start gap-4 p-5 pb-0">
        <Avatar className="h-20 w-20">
          <AvatarImage src={image} alt={name} />
          <AvatarFallback className="text-xl font-semibold bg-primary/10 text-primary">
            {name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-foreground truncate">{name}</h3>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {location}
                </span>
                {verified && (
                  <Badge variant="secondary" className="gap-1 px-2 py-0.5">
                    <CheckCircle2 className="h-3 w-3" />
                    Terverifikasi
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-yellow-600">
              <Star className="h-4 w-4 fill-current" />
              <span className="font-medium text-foreground">{rating.toFixed(1)}</span>
              <span className="text-muted-foreground">({reviewCount})</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Package className="h-4 w-4" />
              {completedOrders} pesanan
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="flex flex-wrap gap-2 mb-4">
          {commodities.slice(0, 4).map((commodity) => (
            <Badge key={commodity} variant="outline" className="text-xs">
              {commodity}
            </Badge>
          ))}
          {commodities.length > 4 && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              +{commodities.length - 4} lainnya
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{responseRate}%</p>
            <p className="text-xs text-muted-foreground">Respons</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{completedOrders}+</p>
            <p className="text-xs text-muted-foreground">Selesai</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{memberSince}</p>
            <p className="text-xs text-muted-foreground">Bergabung</p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onViewProfile}>
            Lihat Profil
          </Button>
          <Button className="flex-1" onClick={onChat}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Chat
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}