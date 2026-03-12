/**
 * Central configuration for line item types.
 * Used by invoice items, work order items, and any future entities.
 * Add a new type here → it automatically appears everywhere.
 */
export const LINE_ITEM_TYPES = [
  { value: 'standard', label: 'Standard Item' },
  { value: 'unique',   label: 'Unique Item'   },
  { value: 'text',     label: 'Text'           },
  { value: 'charges',  label: 'Charges'        },
] as const;

export type LineItemType = typeof LINE_ITEM_TYPES[number]['value'];

export const LINE_ITEM_TYPE_VALUES = LINE_ITEM_TYPES.map(t => t.value) as [string, ...string[]];
