import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface RefreshIconButtonProps {
  queryKeys?: string[];
  onRefresh?: () => void;
  className?: string;
  title?: string;
  variant?: "ghost" | "outline";
}

export function RefreshIconButton({
  queryKeys,
  onRefresh,
  className,
  title = "Ververs",
  variant = "outline",
}: RefreshIconButtonProps) {
  const [spinning, setSpinning] = useState(false);

  const handleClick = () => {
    if (spinning) return;
    setSpinning(true);
    if (onRefresh) {
      onRefresh();
    } else if (queryKeys) {
      queryKeys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
    }
    setTimeout(() => setSpinning(false), 700);
  };

  return (
    <Button
      type="button"
      variant={variant}
      className={cn("px-2", className)}
      title={title}
      onClick={handleClick}
      tabIndex={-1}
    >
      <RefreshCw
        className={cn(
          "h-4 w-4 text-orange-500",
          spinning && "animate-spin-once"
        )}
      />
    </Button>
  );
}
