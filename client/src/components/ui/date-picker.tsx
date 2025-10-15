import * as React from "react"
import { format, parse } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

interface DatePickerProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  testId?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = "dd-mm-yyyy",
  disabled = false,
  className,
  testId
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(value || "")

  // Sync internal state with external value
  React.useEffect(() => {
    setInputValue(value || "")
  }, [value])

  // Parse dd-mm-yyyy string to Date
  const parseDate = (dateString: string): Date | null => {
    if (!dateString) return null
    try {
      // Try parsing dd-mm-yyyy format
      const parts = dateString.split('-')
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10) - 1 // Month is 0-indexed
        const year = parseInt(parts[2], 10)
        const date = new Date(year, month, day)
        
        // Validate the date
        if (date.getFullYear() === year && 
            date.getMonth() === month && 
            date.getDate() === day) {
          return date
        }
      }
      return null
    } catch {
      return null
    }
  }

  // Format Date to dd-mm-yyyy string
  const formatDate = (date: Date): string => {
    try {
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      return `${day}-${month}-${year}`
    } catch {
      return ""
    }
  }

  const selectedDate = parseDate(inputValue)

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      const formatted = formatDate(date)
      setInputValue(formatted)
      onChange?.(formatted)
      setOpen(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    
    // Validate and call onChange only if valid date
    const parsedDate = parseDate(newValue)
    if (parsedDate || newValue === "") {
      onChange?.(newValue)
    }
  }

  const handleInputBlur = () => {
    // Reformat on blur if valid
    const parsedDate = parseDate(inputValue)
    if (parsedDate) {
      const formatted = formatDate(parsedDate)
      setInputValue(formatted)
      onChange?.(formatted)
    }
  }

  return (
    <div className={cn("flex gap-2", className)}>
      <Input
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1"
        data-testid={testId}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "px-3",
              !selectedDate && "text-muted-foreground"
            )}
            disabled={disabled}
            data-testid={testId ? `${testId}-calendar` : undefined}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate || undefined}
            onSelect={handleSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
