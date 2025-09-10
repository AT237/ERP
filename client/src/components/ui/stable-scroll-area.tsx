import * as React from "react";
import { cn } from "@/lib/utils";

interface StableScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  orientation?: "vertical" | "horizontal" | "both";
  maxHeight?: string | number;
  maxWidth?: string | number;
}

/**
 * A stable scroll area replacement that doesn't use ResizeObserver
 * to prevent the "ResizeObserver loop completed" errors
 */
export const StableScrollArea = React.forwardRef<HTMLDivElement, StableScrollAreaProps>(
  ({ 
    className, 
    children, 
    orientation = "vertical", 
    maxHeight = "100%", 
    maxWidth = "100%",
    ...props 
  }, ref) => {
    const scrollClasses = {
      vertical: "overflow-y-auto overflow-x-hidden",
      horizontal: "overflow-x-auto overflow-y-hidden", 
      both: "overflow-auto"
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative",
          scrollClasses[orientation],
          className
        )}
        style={{
          maxHeight: typeof maxHeight === "string" ? maxHeight : `${maxHeight}px`,
          maxWidth: typeof maxWidth === "string" ? maxWidth : `${maxWidth}px`,
          scrollbarWidth: "thin",
          scrollbarColor: "hsl(var(--border)) transparent"
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

StableScrollArea.displayName = "StableScrollArea";