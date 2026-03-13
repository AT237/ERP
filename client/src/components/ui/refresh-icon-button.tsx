import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface RefreshIconButtonProps {
  queryKeys?: string[];
  onRefresh?: () => void;
  className?: string;
  title?: string;
}

export function RefreshIconButton({
  queryKeys,
  onRefresh,
  className,
  title = "Ververs",
}: RefreshIconButtonProps) {
  const [spinning, setSpinning] = useState(false);

  return (
    <span
      className={cn(
        "inline-flex items-center bg-background rounded-sm cursor-pointer",
        className
      )}
      title={title}
      onClick={() => {
        if (spinning) return;
        setSpinning(true);
        if (onRefresh) {
          onRefresh();
        } else if (queryKeys) {
          queryKeys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
        }
        setTimeout(() => setSpinning(false), 700);
      }}
    >
      <RefreshCw
        className={cn(
          "h-4 w-4 text-orange-600 hover:text-orange-700",
          spinning && "animate-spin-once"
        )}
      />
    </span>
  );
}
