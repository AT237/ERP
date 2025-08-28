import { useQuery } from "@tanstack/react-query";
import SupplierTable from "@/components/supplier-table";
import type { Supplier } from "@shared/schema";

export default function Suppliers() {
  const { data: suppliers, isLoading, error } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  console.log("Suppliers page - Loading:", isLoading, "Data:", suppliers, "Error:", error);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading suppliers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-red-500">Error loading suppliers: {String(error)}</div>
      </div>
    );
  }

  return <SupplierTable />;
}
