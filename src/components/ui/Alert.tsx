import { cn } from "@/utils/cn";

interface AlertProps {
  children: React.ReactNode;
  variant?: "info" | "warning" | "error" | "success";
  className?: string;
  title?: string;
}

export function Alert({ children, variant = "info", className, title }: AlertProps) {
  const styles = {
    info: "bg-blue-50 border-blue-200 text-blue-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    error: "bg-red-50 border-red-200 text-red-800",
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
  };
  const icons = {
    info: "ℹ️",
    warning: "⚠️",
    error: "❌",
    success: "✅",
  };
  return (
    <div className={cn("rounded-lg border p-4", styles[variant], className)}>
      <div className="flex gap-3">
        <span className="flex-shrink-0">{icons[variant]}</span>
        <div>
          {title && <p className="font-semibold mb-1">{title}</p>}
          <div className="text-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
