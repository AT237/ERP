import { z } from "zod";
import {
  insertUnitOfMeasureSchema,
  insertPaymentDaySchema,
  insertPaymentTermSchema,
  insertRateAndChargeSchema,
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

export interface MasterDataSection {
  id: string;
  label: string;
  fields: MasterDataField[];
}

export interface MasterDataConfig {
  title: string;
  singularTitle: string;
  endpoint: string;
  schema: z.ZodSchema;
  fields: MasterDataField[];
  sections?: MasterDataSection[];
  columns: MasterDataColumn[];
  hiddenDefaults?: Record<string, any>;
}

export const MASTERDATA_CONFIG: Record<string, MasterDataConfig> = {
  'payment-days': {
    title: "Payment Days",
    singularTitle: "Payment Day",
    endpoint: "payment-days",
    schema: insertPaymentDaySchema,
    fields: [
      { name: "days", label: "Days", type: "number", required: true },
      { name: "name_nl", label: "Name (NL)", type: "text", required: true },
      { name: "name_en", label: "Name (EN)", type: "text", required: true },
      { name: "description_nl", label: "Description (NL)", type: "textarea" },
      { name: "description_en", label: "Description (EN)", type: "textarea" }
    ],
    sections: [
      {
        id: "general",
        label: "General",
        fields: [
          { name: "days", label: "Days", type: "number", required: true },
          { name: "name_nl", label: "Name (NL)", type: "text", required: true },
          { name: "name_en", label: "Name (EN)", type: "text", required: true },
          { name: "description_nl", label: "Description (NL)", type: "textarea" },
          { name: "description_en", label: "Description (EN)", type: "textarea" },
          { name: "sortOrder", label: "Sort Order", type: "number" }
        ]
      },
      {
        id: "reminders",
        label: "Reminders",
        fields: [
          { name: "reminderEnabled", label: "Send Reminder", type: "select", options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }] },
          { name: "reminderDays", label: "Reminder after (days)", type: "number" },
          { name: "secondReminderEnabled", label: "Send 2nd Reminder", type: "select", options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }] },
          { name: "secondReminderDays", label: "2nd Reminder after (days)", type: "number" }
        ]
      }
    ],
    columns: [
      { key: "days", label: "Days" },
      { key: "name_en", label: "Name (EN)" },
      { key: "name_nl", label: "Name (NL)" },
      { key: "description_en", label: "Description" }
    ]
  },

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
    sections: [
      {
        id: "general",
        label: "General",
        fields: [
          { name: "code", label: "Code", type: "text", required: true },
          { name: "name", label: "Name", type: "text", required: true },
          { name: "days", label: "Days", type: "number", required: true },
          { name: "description", label: "Description", type: "textarea" }
        ]
      },
      {
        id: "installments",
        label: "Installment Payments",
        fields: [
          { name: "paymentAtOrder", label: "Payment at Order (%)", type: "number" },
          { name: "paymentAtDelivery", label: "Payment at Delivery (%)", type: "number" },
          { name: "paymentAfterInstallation", label: "Payment after Installation (%)", type: "number" }
        ]
      }
    ],
    columns: [
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "days", label: "Days", render: (value) => `${value} days` },
      { key: "description", label: "Description" }
    ]
  },

  'rates-and-charges': {
    title: "Rates & Charges",
    singularTitle: "Rate & Charge",
    endpoint: "rates-and-charges",
    schema: insertRateAndChargeSchema,
    fields: [
      { name: "code", label: "Code", type: "text", required: true },
      { name: "name", label: "Name", type: "text", required: true },
      { name: "rate", label: "Rate", type: "number", required: true },
      { name: "description", label: "Description", type: "textarea" },
      { 
        name: "category", 
        label: "Category", 
        type: "select",
        options: [
          { value: "transport", label: "Transport" },
          { value: "handling", label: "Handling" },
          { value: "packaging", label: "Packaging" },
          { value: "insurance", label: "Insurance" },
          { value: "surcharge", label: "Surcharge" },
          { value: "discount", label: "Discount" },
          { value: "other", label: "Other" }
        ]
      }
    ],
    columns: [
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "rate", label: "Rate", render: (value) => `€ ${Number(value).toFixed(2)}` },
      { key: "category", label: "Category" },
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
      { name: "description", label: "Description", type: "textarea" }
    ],
    columns: [
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "rate", label: "Rate", render: (value) => `${value}%` },
      { key: "description", label: "Description" }
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