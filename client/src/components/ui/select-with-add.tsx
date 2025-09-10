import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  Popover, PopoverContent, PopoverTrigger 
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SelectWithAddProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  children: React.ReactNode;
  addFormTitle: string;
  addFormContent: React.ReactNode;
  testId?: string;
}

export function SelectWithAdd({
  value,
  onValueChange,
  placeholder,
  children,
  addFormTitle,
  addFormContent,
  testId,
}: SelectWithAddProps) {
  const [isAddPopoverOpen, setIsAddPopoverOpen] = useState(false);

  return (
    <div className="flex space-x-2">
      <div className="flex-1">
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger data-testid={testId}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {children}
          </SelectContent>
        </Select>
      </div>
      
      <Popover open={isAddPopoverOpen} onOpenChange={setIsAddPopoverOpen}>
        <PopoverTrigger asChild>
          <Button 
            type="button"
            variant="outline" 
            size="icon"
            className="flex-shrink-0"
            data-testid={`${testId}-add-button`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0" align="end">
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{addFormTitle}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {addFormContent}
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>
    </div>
  );
}