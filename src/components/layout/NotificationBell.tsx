"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

type NotificationItem = {
  type: "LOW_STOCK" | "OPEN_TIMELOG" | "PENDING_ORDERS";
  title: string;
  description: string;
  href: string;
  count: number;
  names: string[];
};

type NotificationsData = {
  total: number;
  items: NotificationItem[];
};

interface NotificationBellProps {
  role: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; dot: string }> = {
  LOW_STOCK: {
    icon: (
      <svg className="h-4 w-4 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    dot: "bg-rose-500",
  },
  OPEN_TIMELOG: {
    icon: (
      <svg className="h-4 w-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    dot: "bg-amber-500",
  },
  PENDING_ORDERS: {
    icon: (
      <svg className="h-4 w-4 text-orange-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    dot: "bg-orange-500",
  },
};

export function NotificationBell({ role }: NotificationBellProps) {
  const [data, setData] = useState<NotificationsData | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isManager = role === "ADMIN" || role === "ENCARGADO";

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) setData(await res.json());
    } catch {
      // silently ignore
    }
  };

  useEffect(() => {
    if (!isManager) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [isManager]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!isManager) return null;

  const total = data?.total ?? 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        aria-label="Notificaciones"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold px-1 leading-none">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-[-40px] top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Notificaciones</p>
          </div>

          {data?.items && data.items.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {data.items.map((item) => {
                const config = TYPE_CONFIG[item.type];
                const extraCount = item.names.length > 3 ? item.names.length - 3 : 0;
                const displayNames = item.names.slice(0, 3);
                return (
                  <div key={item.type} className="px-4 py-3 space-y-1">
                    <div className="flex items-start gap-2">
                      {config.icon}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                        <p className="text-xs text-gray-500">{item.description}</p>
                        {displayNames.length > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {displayNames.join(", ")}
                            {extraCount > 0 && ` y ${extraCount} más`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                      >
                        Ver →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-gray-400">Todo en orden ✓</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
