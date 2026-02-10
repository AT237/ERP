import { format, parse } from "date-fns";

export function toDisplayDate(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return "";
  try {
    const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
    if (isNaN(date.getTime())) return "";
    return format(date, "dd-MM-yyyy");
  } catch {
    return "";
  }
}

export function toStorageDate(displayDate: string): Date | undefined {
  if (!displayDate) return undefined;
  try {
    const parts = displayDate.split("-");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
        return date;
      }
    }
    const date = new Date(displayDate);
    if (!isNaN(date.getTime())) return date;
    return undefined;
  } catch {
    return undefined;
  }
}

export function toStorageDateString(displayDate: string): string {
  const date = toStorageDate(displayDate);
  if (!date) return "";
  return format(date, "yyyy-MM-dd");
}
