import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger 
} from "@/components/ui/dialog";

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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

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
      
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogTrigger asChild>
          <Button 
            type="button"
            variant="outline" 
            size="icon"
            className="flex-shrink-0"
            data-testid={`${testId}-add-button`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{addFormTitle}</DialogTitle>
            <DialogDescription className="sr-only">
              Form to {addFormTitle.toLowerCase()}
            </DialogDescription>
          </DialogHeader>
          {addFormContent}
        </DialogContent>
      </Dialog>
    </div>
  );
}