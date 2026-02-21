import MasterDataTable from "@/components/masterdata-table";
import { getMasterDataConfig } from "@/config/masterdata-config";

export default function RatesAndChargesPage() {
  const config = getMasterDataConfig('rates-and-charges');
  if (!config) return null;

  return (
    <MasterDataTable
      title={config.title}
      endpoint={config.endpoint}
      schema={config.schema}
      fields={config.fields}
      columns={config.columns}
    />
  );
}
