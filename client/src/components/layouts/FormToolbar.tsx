import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Save, 
  Plus, 
  Trash2, 
  Printer, 
  ChevronLeft, 
  ChevronRight,
  FileSpreadsheet
} from "lucide-react";
import { PrintLayoutDialog } from "./PrintLayoutDialog";
import { SafeDeleteDialog } from "@/components/ui/safe-delete-dialog";

export interface FormToolbarProps {
  onSave?: () => void;
  onAddNew?: () => void;
  onDelete?: () => void;
  onPrint?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onExportExcel?: () => void;
  
  saveDisabled?: boolean;
  saveLoading?: boolean;
  addNewDisabled?: boolean;
  deleteDisabled?: boolean;
  printDisabled?: boolean;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  exportDisabled?: boolean;
  
  showSave?: boolean;
  showAddNew?: boolean;
  showDelete?: boolean;
  showPrint?: boolean;
  showNavigation?: boolean;
  showExport?: boolean;

  documentType?: string;
  entityId?: string;
  checkUsagesUrl?: string;
  entityName?: string;
}

export function FormToolbar({
  onSave,
  onAddNew,
  onDelete,
  onPrint,
  onPrevious,
  onNext,
  onExportExcel,
  
  saveDisabled = false,
  saveLoading = false,
  addNewDisabled = false,
  deleteDisabled = false,
  printDisabled = false,
  previousDisabled = false,
  nextDisabled = false,
  exportDisabled = false,
  
  showSave = true,
  showAddNew = true,
  showDelete = true,
  showPrint = true,
  showNavigation = true,
  showExport = true,

  documentType,
  entityId,
  checkUsagesUrl,
  entityName = "this record",
}: FormToolbarProps) {
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const buttonClass = "h-8 w-8 p-0";
  const iconClass = "h-4 w-4";

  const handlePrintClick = () => {
    if (documentType) {
      setPrintDialogOpen(true);
    } else if (onPrint) {
      onPrint();
    }
  };

  return (
    <>
      {showSave && (
        <Button
          variant="ghost"
          size="sm"
          className={buttonClass}
          onClick={onSave}
          disabled={saveDisabled || saveLoading}
          title="Save"
          data-testid="toolbar-save"
        >
          {saveLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
          ) : (
            <Save className={iconClass} />
          )}
        </Button>
      )}
      
      {showAddNew && (
        <Button
          variant="ghost"
          size="sm"
          className={buttonClass}
          onClick={onAddNew}
          disabled={addNewDisabled}
          title="Add New"
          data-testid="toolbar-add"
        >
          <Plus className={iconClass} />
        </Button>
      )}
      
      {showDelete && (
        <Button
          variant="ghost"
          size="sm"
          className={buttonClass}
          onClick={() => {
            if (checkUsagesUrl && entityId) {
              setDeleteDialogOpen(true);
            } else if (onDelete) {
              onDelete();
            }
          }}
          disabled={deleteDisabled}
          title="Delete"
          data-testid="toolbar-delete"
        >
          <Trash2 className={iconClass} />
        </Button>
      )}
      
      {showPrint && (
        <Button
          variant="ghost"
          size="sm"
          className={buttonClass}
          onClick={handlePrintClick}
          disabled={printDisabled}
          title="Print Report"
          data-testid="toolbar-print"
        >
          <Printer className={iconClass} />
        </Button>
      )}
      
      {showNavigation && (
        <>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <Button
            variant="ghost"
            size="sm"
            className={buttonClass}
            onClick={onPrevious}
            disabled={previousDisabled}
            title="Previous Record"
            data-testid="toolbar-previous"
          >
            <ChevronLeft className={iconClass} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={buttonClass}
            onClick={onNext}
            disabled={nextDisabled}
            title="Next Record"
            data-testid="toolbar-next"
          >
            <ChevronRight className={iconClass} />
          </Button>
        </>
      )}
      
      {showExport && (
        <>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <Button
            variant="ghost"
            size="sm"
            className={buttonClass}
            onClick={onExportExcel}
            disabled={exportDisabled}
            title="Export to Excel"
            data-testid="toolbar-export"
          >
            <FileSpreadsheet className={iconClass} />
          </Button>
        </>
      )}

      {documentType && (
        <PrintLayoutDialog
          open={printDialogOpen}
          onOpenChange={setPrintDialogOpen}
          documentType={documentType}
          entityId={entityId}
        />
      )}

      {checkUsagesUrl && entityId && onDelete && (
        <SafeDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          entityName={entityName}
          entityId={entityId}
          checkUsagesUrl={checkUsagesUrl}
          onConfirm={onDelete}
        />
      )}
    </>
  );
}
