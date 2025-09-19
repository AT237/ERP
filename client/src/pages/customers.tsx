import CustomerTable from "@/components/customer-table";
import { CustomerProvider } from "@/contexts/CustomerContext";

export default function Customers() {
  return (
    <CustomerProvider>
      <CustomerTable />
    </CustomerProvider>
  );
}