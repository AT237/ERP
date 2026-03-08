import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ValidationError } from "@/hooks/use-validation-errors";

interface ValidationErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  errors: ValidationError[];
  onShowFields?: () => void;
}

export function ValidationErrorDialog({
  open,
  onOpenChange,
  errors,
  onShowFields,
}: ValidationErrorDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Verplichte velden ontbreken
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>De volgende velden moeten nog ingevuld worden:</p>
              <ul className="list-disc pl-5 space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="text-sm">
                    <span className="font-medium">{error.label}</span>
                    {error.message !== "Dit veld is verplicht" && (
                      <span className="text-muted-foreground"> — {error.message}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            Sluiten
          </AlertDialogCancel>
          {onShowFields && (
            <AlertDialogAction
              onClick={onShowFields}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Toon veld
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
