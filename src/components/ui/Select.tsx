"use client";
import { cn } from "@/utils/cn";
import { type SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helper?: string;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helper, placeholder, id, children, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900",
            "focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500",
            "disabled:bg-gray-50 disabled:text-gray-500 bg-white",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children}
        </select>
        {error && <p className="text-xs text-red-600">{error}</p>}
        {!error && helper && <p className="text-xs text-gray-500">{helper}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";
