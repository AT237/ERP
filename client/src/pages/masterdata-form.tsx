import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import MasterDataFormLayout from "@/components/layouts/MasterDataFormLayout";
import { getMasterDataConfig } from "@/config/masterdata-config";

interface MasterDataFormProps {
  type?: string;
  id?: string;
  onSave?: () => void;
}

export default function MasterDataForm({ type, id, onSave }: MasterDataFormProps) {
  const config = getMasterDataConfig(type || '');
  
  // Navigate back to the listing page
  const handleSave = () => {
    if (onSave) {
      onSave();
    } else {
      // Default navigation behavior - go back to the previous page
      window.history.back();
    }
  };

  const handleCancel = () => {
    window.history.back();
  };

  // Show error if type is not recognized
  if (!type || !config) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleCancel}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-destructive">Invalid Master Data Type</h2>
            <p className="text-muted-foreground">
              The master data type "{type}" is not recognized.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Valid types: units-of-measure, payment-terms, incoterms, vat-rates, cities, statuses
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleCancel}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="text-sm text-muted-foreground">
          Master Data / {config.title} / {id ? 'Edit' : 'New'}
        </div>
      </div>

      <MasterDataFormLayout 
        type={type} 
        id={id}
        onSave={handleSave}
      />
    </div>
  );
}