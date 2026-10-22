"use client";

import React, { useState } from "react";
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Database,
  Activity,
  Clock,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface NotificationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type NotificationType = "gap-warning" | "submission" | "system" | "sync";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timeAgo: string;
  read: boolean;
  action?: { label: string; viewId: string };
}

const initialNotifications: Notification[] = [
  {
    id: "n1",
    type: "gap-warning",
    title: "Representation Gap Alert",
    description: "East African ancestry missing in BRCA2 dataset — 0 samples detected.",
    timeAgo: "3m ago",
    read: false,
    action: { label: "View Gap", viewId: "gap-tracker" },
  },
  {
    id: "n2",
    type: "submission",
    title: "Submission Approved",
    description: "TCGA COAD ancestry enrichment submission approved by review board.",
    timeAgo: "18m ago",
    read: false,
    action: { label: "View Details", viewId: "biobank" },
  },
  {
    id: "n3",
    type: "system",
    title: "Pipeline Update Complete",
    description: "Ancestry model v2.4 deployed — South Asian population now supported.",
    timeAgo: "42m ago",
    read: false,
  },
  {
    id: "n4",
    type: "sync",
    title: "Data Sync Completed",
    description: "gnomAD v4.1 reference panel synced — 12,847 new variants indexed.",
    timeAgo: "1h ago",
    read: true,
  },
  {
    id: "n5",
    type: "gap-warning",
    title: "Frequency Discrepancy",
    description: "TP53 c.215C>T shows 3.2x higher MAF in admixed vs. reference panel.",
    timeAgo: "2h ago",
    read: true,
    action: { label: "Investigate", viewId: "frequency-explorer" },
  },
  {
    id: "n6",
    type: "submission",
    title: "New Submission Received",
    description: "Community Biobank submitted 847 samples with self-reported ancestry.",
    timeAgo: "3h ago",
    read: true,
    action: { label: "Review", viewId: "biobank" },
  },
  {
    id: "n7",
    type: "system",
    title: "Bias Score Threshold Met",
    description: "Dataset 'Rural Appalachian' exceeds bias threshold of 0.75.",
    timeAgo: "5h ago",
    read: true,
    action: { label: "View Dataset", viewId: "datasets" },
  },
  {
    id: "n8",
    type: "sync",
    title: "Scheduled Maintenance",
    description: "Reference database maintenance window: tonight 02:00–04:00 UTC.",
    timeAgo: "6h ago",
    read: true,
  },
];

const typeConfig: Record<NotificationType, { icon: React.ElementType; color: string }> = {
  "gap-warning": { icon: AlertTriangle, color: "text-amber-500" },
  submission: { icon: CheckCircle, color: "text-success" },
  system: { icon: Activity, color: "text-primary" },
  sync: { icon: Database, color: "text-muted-foreground" },
};

export function NotificationPanel({ open, onOpenChange }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleAction = (notification: Notification) => {
    if (notification.action) {
      markAsRead(notification.id);
      onOpenChange(false);
      window.dispatchEvent(
        new CustomEvent("ancestralmt:navigate", { detail: notification.action.viewId })
      );
    }
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground relative hover:text-foreground">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="notif-badge">{unreadCount}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="glass-panel depth-4 w-96 p-0 overflow-hidden rounded-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-primary border-primary/30">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-6 text-[11px] text-muted-foreground hover:text-foreground px-2"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification List */}
        <ScrollArea className="max-h-80">
          <div className="py-1 px-2">
            {notifications.map((notification, idx) => {
              const config = typeConfig[notification.type];
              const Icon = config.icon;
              return (
                <div
                  key={notification.id}
                  className={cn(
                    "notif-item notif-enter px-3 py-2.5 flex gap-3 cursor-pointer",
                    !notification.read && "notif-item-unread"
                  )}
                  style={{ animationDelay: `${idx * 0.04}s` }}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className={cn("shrink-0 mt-0.5", config.color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs font-medium truncate", !notification.read ? "text-foreground" : "text-muted-foreground")}>
                        {notification.title}
                      </span>
                      {!notification.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                      {notification.description}
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {notification.timeAgo}
                      </span>
                      {notification.action && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction(notification);
                          }}
                          className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-0.5 font-medium"
                        >
                          {notification.action.label}
                          <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-border/30 px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            View all notifications
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
