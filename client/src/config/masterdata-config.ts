import { z } from "zod";
import {
  insertUnitOfMeasureSchema,
  insertPaymentTermSchema,
  insertIncotermSchema,
  insertVatRateSchema,
  insertCitySchema,
  insertStatusSchema,
  insertImageSchema
} from "@shared/schema";

export interface MasterDataField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'select';
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
}

export interface MasterDataColumn {
  key: string;
  label: string;
  render?: (value: any) => string;
}

export interface MasterDataConfig {
  title: string;
  singularTitle: string;
  endpoint: string;
  schema: z.ZodSchema;
  fields: MasterDataField[];
  columns: MasterDataColumn[];
  hiddenDefaults?: Record<string, any>;
}

export const MASTERDATA_CONFIG: Record<string, MasterDataConfig> = {
  'units-of-measure': {
    title: "Units of Measure",
    singularTitle: "Unit of Measure",
    endpoint: "units-of-measure",
    schema: insertUnitOfMeasureSchema,
    fields: [
      { name: "code", label: "Code", type: "text", required: true },
      { name: "name", label: "Name", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea" },
      { 
        name: "category", 
        label: "Category", 
        type: "select",
        options: [
          { value: "weight", label: "Weight" },
          { value: "length", label: "Length" },
          { value: "volume", label: "Volume" },
          { value: "area", label: "Area" },
          { value: "time", label: "Time" },
          { value: "quantity", label: "Quantity" }
        ]
      }
    ],
    columns: [
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "category", label: "Category" },
      { key: "description", label: "Description" }
    ]
  },

  'payment-terms': {
    title: "Payment Terms",
    singularTitle: "Payment Term",
    endpoint: "payment-terms",
    schema: insertPaymentTermSchema,
    fields: [
      { name: "code", label: "Code", type: "text", required: true },
      { name: "name", label: "Name", type: "text", required: true },
      { name: "days", label: "Days", type: "number", required: true },
      { name: "description", label: "Description", type: "textarea" }
    ],
    columns: [
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "days", label: "Days", render: (value) => `${value} days` },
      { key: "description", label: "Description" }
    ]
  },

  'incoterms': {
    title: "Incoterms",
    singularTitle: "Incoterm",
    endpoint: "incoterms",
    schema: insertIncotermSchema,
    fields: [
      { name: "code", label: "Code", type: "text", required: true },
      { name: "name", label: "Name", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea" },
      { 
        name: "category", 
        label: "Category", 
        type: "select",
        options: [
          { value: "EXW", label: "EXW Group" },
          { value: "FCA", label: "FCA Group" },
          { value: "CPT", label: "CPT Group" },
          { value: "CIP", label: "CIP Group" },
          { value: "DAP", label: "DAP Group" },
          { value: "DPU", label: "DPU Group" },
          { value: "DDP", label: "DDP Group" },
          { value: "FAS", label: "FAS Group" },
          { value: "FOB", label: "FOB Group" },
          { value: "CFR", label: "CFR Group" },
          { value: "CIF", label: "CIF Group" }
        ]
      }
    ],
    columns: [
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "category", label: "Category" },
      { key: "description", label: "Description" }
    ]
  },

  'vat-rates': {
    title: "VAT Rates",
    singularTitle: "VAT Rate",
    endpoint: "vat-rates",
    schema: insertVatRateSchema,
    fields: [
      { name: "code", label: "Code", type: "text", required: true },
      { name: "name", label: "Name", type: "text", required: true },
      { name: "rate", label: "Rate (%)", type: "number", required: true },
      { 
        name: "country", 
        label: "Country", 
        type: "select",
        options: [
          { value: "NL", label: "Netherlands" },
          { value: "DE", label: "Germany" },
          { value: "BE", label: "Belgium" },
          { value: "FR", label: "France" },
          { value: "GB", label: "United Kingdom" },
          { value: "US", label: "United States" }
        ]
      },
      { name: "description", label: "Description", type: "textarea" }
    ],
    columns: [
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "rate", label: "Rate", render: (value) => `${value}%` },
      { key: "country", label: "Country" }
    ]
  },

  'cities': {
    title: "Cities",
    singularTitle: "City",
    endpoint: "cities",
    schema: insertCitySchema,
    fields: [
      { name: "name", label: "City Name", type: "text", required: true },
      { name: "postalCode", label: "Postal Code", type: "text", required: true },
      { 
        name: "country", 
        label: "Country", 
        type: "select",
        required: true,
        options: [
          { value: "NL", label: "Netherlands" },
          { value: "DE", label: "Germany" },
          { value: "BE", label: "Belgium" },
          { value: "FR", label: "France" },
          { value: "GB", label: "United Kingdom" },
          { value: "US", label: "United States" }
        ]
      },
      { name: "region", label: "Region/State", type: "text" }
    ],
    columns: [
      { key: "name", label: "City" },
      { key: "postalCode", label: "Postal Code" },
      { key: "country", label: "Country" },
      { key: "region", label: "Region" }
    ]
  },

  'statuses': {
    title: "Statuses",
    singularTitle: "Status",
    endpoint: "statuses",
    schema: insertStatusSchema,
    fields: [
      { name: "code", label: "Code", type: "text", required: true },
      { name: "name", label: "Name", type: "text", required: true },
      { 
        name: "category", 
        label: "Category", 
        type: "select",
        required: true,
        options: [
          { value: "customer", label: "Customer" },
          { value: "supplier", label: "Supplier" },
          { value: "project", label: "Project" },
          { value: "quotation", label: "Quotation" },
          { value: "invoice", label: "Invoice" },
          { value: "order", label: "Order" },
          { value: "general", label: "General" }
        ]
      },
      { name: "color", label: "Color", type: "text" },
      { name: "description", label: "Description", type: "textarea" }
    ],
    columns: [
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "category", label: "Category" },
      { key: "color", label: "Color" }
    ]
  },


  'images': {
    title: "Images",
    singularTitle: "Image",
    endpoint: "images",
    schema: insertImageSchema,
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea" },
      { 
        name: "category", 
        label: "Category", 
        type: "select",
        options: [
          { value: "logo", label: "Logo" },
          { value: "header", label: "Header" },
          { value: "footer", label: "Footer" },
          { value: "product", label: "Product" },
          { value: "general", label: "General" }
        ]
      }
    ],
    columns: [
      { key: "name", label: "Name" },
      { key: "category", label: "Category" },
      { key: "description", label: "Description" }
    ]
  }
};

export function getMasterDataConfig(type: string): MasterDataConfig | undefined {
  return MASTERDATA_CONFIG[type];
}

export function getMasterDataTypes(): string[] {
  return Object.keys(MASTERDATA_CONFIG);
}