import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface RefreshIconButtonProps {
  queryKeys: string[];
  className?: string;
  title?: string;
  size?: "sm" | "default";
}

export function RefreshIconButton({
  queryKeys,
  className,
  title = "Ververs",
  size = "default",
}: RefreshIconButtonProps) {
  const [spinning, setSpinning] = useState(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    e.nativeEvent.stopImmediatePropagation();
    if (spinning) return;
    setSpinning(true);
    queryKeys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
    setTimeout(() => setSpinning(false), 700);
  };

  return (
    <RefreshCw
      className={cn(
        "shrink-0 text-orange-600 hover:text-orange-700 cursor-pointer",
        size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4",
        spinning ? "animate-spin-once" : "",
        className
      )}
      title={title}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
    />
  );
}
