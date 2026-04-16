import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";

interface HsCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  testId?: string;
}

const HS_CODE_LENGTH = 9;

function formatHsCode(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, HS_CODE_LENGTH);
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0, 4)}.${d.slice(4)}`;
  return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6)}`;
}

function extractDigits(formatted: string): string {
  return formatted.replace(/\D/g, "").slice(0, HS_CODE_LENGTH);
}

export function HsCodeInput({
  value,
  onChange,
  placeholder = "0000.00.000",
  disabled = false,
  className = "",
  testId,
}: HsCodeInputProps) {
  const digits = extractDigits(value || "");
  const digitCount = digits.length;
  const remaining = HS_CODE_LENGTH - digitCount;
  const formatted = formatHsCode(digits);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const newDigits = extractDigits(raw);
      onChange(formatHsCode(newDigits));
    },
    [onChange]
  );

  const getIndicatorColor = () => {
    if (digitCount === 0) return "text-muted-foreground";
    if (digitCount === HS_CODE_LENGTH) return "text-green-600";
    return "text-orange-500";
  };

  return (
    <div className="space-y-0.5">
      <div className="relative">
        <Input
          value={formatted}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={11}
          className={`h-8 text-xs font-mono pr-16 ${className}`}
          data-testid={testId}
        />
        {digitCount > 0 && (
          <span
            className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium ${getIndicatorColor()}`}
          >
            {digitCount === HS_CODE_LENGTH
              ? "✓ 9/9"
              : `${digitCount}/${HS_CODE_LENGTH}`}
          </span>
        )}
      </div>
      {digitCount > 0 && remaining > 0 && (
        <p className="text-[10px] text-orange-500 pl-1">
          Nog {remaining} {remaining === 1 ? "cijfer" : "cijfers"} nodig
        </p>
      )}
    </div>
  );
}
