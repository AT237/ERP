import ProspectsTable from "@/components/prospects-table";
import { ProspectsProvider } from "@/contexts/ProspectsContext";

export default function Prospects() {
  return (
    <ProspectsProvider>
      <ProspectsTable />
    </ProspectsProvider>
  );
}