# LayoutForm2 Component

A beautiful, reusable form layout component that captures all the visual elements from CustomerFormLayout while being completely configurable for any form type.

## Features

✅ **Beautiful Visual Design**: Preserves all styling from CustomerFormLayout  
✅ **Two-Column Grid Structure**: Professional label-field alignment  
✅ **Multi-Column Field Layouts**: Support for complex field arrangements  
✅ **Tab System**: Organized sections with BaseFormLayout integration  
✅ **Change Tracking**: Visual indicators for modified fields  
✅ **Form Validation**: Built-in validation message display  
✅ **Custom Components**: Support for custom field types  
✅ **TypeScript**: Full type safety with comprehensive interfaces  
✅ **Responsive**: Mobile-friendly design patterns  
✅ **Test Support**: Built-in test ID generation  

## Key Visual Elements Captured

### From CustomerFormLayout:
- Two-column grid: `grid grid-cols-[130px_1fr] items-start gap-x-6 gap-y-6`
- Right-aligned labels: `text-sm font-medium text-right pt-2`
- Multi-column layouts: `grid grid-cols-[30%_130px_30%] gap-4 items-center`
- Orange change tracking: Modified fields get orange borders/backgrounds
- Section headers: `text-lg font-semibold text-orange-600`
- Tab system with BaseFormLayout integration
- Professional spacing and alignment

## Basic Usage

```tsx
import { LayoutForm2, createFieldRow, createSectionHeaderRow } from '@/components/layouts/LayoutForm2';
import { useForm } from 'react-hook-form';
import { Save, ArrowLeft } from 'lucide-react';

interface MyFormData {
  name: string;
  email: string;
  phone: string;
}

function MyForm() {
  const [activeSection, setActiveSection] = useState('general');
  const form = useForm<MyFormData>();

  const sections = [
    {
      id: 'general',
      label: 'General',
      rows: [
        createSectionHeaderRow<MyFormData>('Basic Information'),
        createFieldRow<MyFormData>({
          key: 'name',
          label: 'Full Name',
          type: 'text',
          placeholder: 'Enter full name',
          register: form.register('name'),
          validation: { isRequired: true },
          testId: 'input-name'
        }),
        createFieldRow<MyFormData>({
          key: 'email',
          label: 'Email',
          type: 'email',
          placeholder: 'Enter email address',
          register: form.register('email'),
          testId: 'input-email'
        })
      ]
    }
  ];

  const actionButtons = [
    {
      key: 'cancel',
      label: 'Cancel',
      icon: <ArrowLeft size={14} />,
      onClick: () => console.log('Cancel'),
      variant: 'outline'
    },
    {
      key: 'save',
      label: 'Save',
      icon: <Save size={14} />,
      onClick: form.handleSubmit((data) => console.log(data)),
      variant: 'default'
    }
  ];

  return (
    <LayoutForm2
      sections={sections}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      form={form}
      onSubmit={(data) => console.log('Form submitted:', data)}
      actionButtons={actionButtons}
    />
  );
}
```

## Advanced Usage - Multi-Column Layout

```tsx
import { LayoutForm2, createFieldsRow } from '@/components/layouts/LayoutForm2';

// Create a three-column layout like in CustomerFormLayout
const sections = [
  {
    id: 'advanced',
    label: 'Advanced',
    rows: [
      // Three-column layout: [30%_130px_30%]
      createFieldsRow<MyFormData>([
        {
          key: 'firstName',
          label: 'First Name',  // This label shows on the left
          type: 'text',
          register: form.register('firstName'),
        },
        {
          key: 'lastName',
          label: 'Last Name',   // This label shows in the middle
          type: 'text',
          register: form.register('lastName'),
        },
        {
          key: 'middleName',
          label: 'Middle Name', // This field shows on the right
          type: 'text',
          register: form.register('middleName'),
        }
      ])
    ]
  }
];
```

## Field Types

### Text Input
```tsx
{
  key: 'name',
  label: 'Name',
  type: 'text',
  placeholder: 'Enter name',
  maxLength: 100,
  register: form.register('name'),
  testId: 'input-name'
}
```

### Select Dropdown
```tsx
{
  key: 'status',
  label: 'Status',
  type: 'select',
  options: [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ],
  setValue: (value) => form.setValue('status', value),
  watch: () => form.watch('status'),
  testId: 'select-status'
}
```

### Textarea
```tsx
{
  key: 'notes',
  label: 'Notes',
  type: 'textarea',
  rows: 4,
  placeholder: 'Enter notes...',
  register: form.register('notes'),
  testId: 'textarea-notes'
}
```

### Display Field (Read-Only)
```tsx
{
  key: 'calculatedValue',
  label: 'Total Amount',
  type: 'display',
  displayValue: '€ 1,234.56',
  displayClassName: 'font-bold text-green-600',
  testId: 'display-total'
}
```

### Custom Component
```tsx
{
  key: 'customField',
  label: 'Custom Field',
  type: 'custom',
  customComponent: (
    <MyCustomComponent 
      value={form.watch('customField')}
      onChange={(value) => form.setValue('customField', value)}
    />
  )
}
```

## Change Tracking

Enable change tracking to highlight modified fields:

```tsx
const [originalValues, setOriginalValues] = useState<MyFormData>();
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

<LayoutForm2
  sections={sections}
  activeSection={activeSection}
  onSectionChange={setActiveSection}
  form={form}
  onSubmit={handleSubmit}
  actionButtons={actionButtons}
  changeTracking={{
    enabled: true,
    suppressTracking: false, // Set to true during form initialization
    modifiedFieldClassName: 'ring-2 ring-orange-400 border-orange-400 bg-orange-50 dark:bg-orange-950',
    onChangesDetected: (hasChanges, modifiedFields) => {
      setHasUnsavedChanges(hasChanges);
      console.log('Modified fields:', Array.from(modifiedFields));
    }
  }}
  originalValues={originalValues}
/>
```

## Validation

### Basic Validation
```tsx
{
  key: 'email',
  label: 'Email',
  type: 'email',
  register: form.register('email'),
  validation: {
    error: form.formState.errors.email?.message,
    isRequired: true
  }
}
```

### Dynamic Validation (Like Country-Based BTW Requirements)
```tsx
{
  key: 'taxId',
  label: 'BTW Number',
  type: 'text',
  register: form.register('taxId'),
  validation: {
    dynamicallyRequired: requiresBtw,
    warning: requiresBtw ? 'BTW number is required for this country' : undefined,
    error: form.formState.errors.taxId?.message
  }
}
```

## Custom Row Types

### Section Header
```tsx
createSectionHeaderRow<MyFormData>(
  'Contact Information',
  'mb-4', // className
  'text-xl text-blue-600' // titleClassName override
)
```

### Custom Content
```tsx
createCustomRow<MyFormData>(
  <div className="p-4 bg-blue-50 rounded-lg">
    <p className="text-blue-800">Custom content here</p>
  </div>,
  'my-6' // className
)
```

### Single Field with Custom Layout
```tsx
{
  type: 'field',
  field: {
    key: 'specialField',
    label: 'Special Field',
    type: 'text',
    width: '50%', // Custom width
    wrapperClassName: 'border-2 border-blue-300',
    register: form.register('specialField')
  },
  className: 'bg-gray-50 p-4 rounded'
}
```

## Header Fields

Add header information display:

```tsx
const headerFields = [
  { label: 'Quote #', value: 'Q-2024-001' },
  { label: 'Status', value: <Badge>Active</Badge> },
  { label: 'Date', value: '2024-01-15' }
];

<LayoutForm2
  headerFields={headerFields}
  // ... other props
/>
```

## Complete Example - Customer Form Clone

```tsx
import { LayoutForm2, createFieldRow, createFieldsRow, createSectionHeaderRow } from '@/components/layouts/LayoutForm2';
import { CountrySelectWithAdd } from '@/components/ui/country-select-with-add';
import { AddressSelectWithAdd } from '@/components/ui/address-select-with-add';

interface CustomerFormData {
  name: string;
  kvkNummer: string;
  countryCode: string;
  taxId: string;
  language: string;
  areaCode: string;
  generalEmail: string;
  addressId: string;
}

function CustomerFormClone() {
  const [activeSection, setActiveSection] = useState('general');
  const [requiresBtw, setRequiresBtw] = useState(false);
  const form = useForm<CustomerFormData>();

  const sections = [
    {
      id: 'general',
      label: 'General',
      rows: [
        // Three-column layout exactly like CustomerFormLayout
        createFieldsRow<CustomerFormData>([
          {
            key: 'name',
            label: 'Bedrijfsnaam',
            type: 'text',
            placeholder: 'Bedrijfsnaam',
            register: form.register('name'),
            validation: { isRequired: true },
            testId: 'input-customer-name'
          },
          {
            key: 'countryCode',
            label: 'Country',
            type: 'custom',
            customComponent: (
              <CountrySelectWithAdd
                value={form.watch('countryCode') || ''}
                onValueChange={(value) => form.setValue('countryCode', value)}
                placeholder="Selecteer land..."
                testId="select-customer-country"
              />
            )
          }
        ]),
        
        createFieldsRow<CustomerFormData>([
          {
            key: 'kvkNummer',
            label: 'KVK-nummer',
            type: 'text',
            placeholder: '12345678',
            maxLength: 8,
            register: form.register('kvkNummer'),
            testId: 'input-customer-kvk-nummer'
          },
          {
            key: 'taxId',
            label: 'BTW-nummer',
            type: 'text',
            placeholder: 'NL123456789B01',
            register: form.register('taxId'),
            validation: { 
              dynamicallyRequired: requiresBtw,
              warning: requiresBtw ? 'BTW nummer is verplicht voor dit land' : undefined
            },
            testId: 'input-customer-taxId'
          }
        ]),

        // Single field with custom width
        createFieldRow<CustomerFormData>({
          key: 'generalEmail',
          label: 'Algemene email',
          type: 'email',
          placeholder: 'algemeen@bedrijf.nl',
          width: '30%',
          register: form.register('generalEmail'),
          testId: 'input-customer-general-email'
        }),

        createFieldRow<CustomerFormData>({
          key: 'addressId',
          label: 'Adres',
          type: 'custom',
          width: '30%',
          customComponent: (
            <AddressSelectWithAdd
              value={form.watch('addressId') || ''}
              onValueChange={(value) => form.setValue('addressId', value)}
              placeholder="Selecteer adres..."
              testId="select-customer-address"
            />
          )
        })
      ]
    }
  ];

  const actionButtons = [
    {
      key: 'cancel',
      label: 'Cancel',
      icon: <ArrowLeft size={14} />,
      onClick: () => console.log('Cancel'),
      variant: 'outline' as const,
      testId: 'button-cancel'
    },
    {
      key: 'save',
      label: 'Save Customer',
      icon: <Save size={14} />,
      onClick: form.handleSubmit((data) => console.log('Save:', data)),
      variant: 'default' as const,
      testId: 'button-save'
    }
  ];

  return (
    <LayoutForm2
      sections={sections}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      form={form}
      onSubmit={(data) => console.log('Form submitted:', data)}
      actionButtons={actionButtons}
    />
  );
}
```

## TypeScript Interfaces

The component provides comprehensive TypeScript support:

```tsx
// Main interfaces
interface FormField2<T extends FieldValues>
interface FormRow<T extends FieldValues>
interface FormSection2<T extends FieldValues>
interface LayoutForm2Props<T extends FieldValues>
interface ChangeTrackingConfig
interface FieldValidation

// Helper functions
function createFieldRow<T extends FieldValues>(field: FormField2<T>, className?: string): FormRow<T>
function createFieldsRow<T extends FieldValues>(fields: FormField2<T>[], className?: string): FormRow<T>
function createSectionHeaderRow<T extends FieldValues>(title: string, className?: string, titleClassName?: string): FormRow<T>
function createCustomRow<T extends FieldValues>(content: ReactNode, className?: string): FormRow<T>
```

## Comparison with CustomerFormLayout

| Feature | CustomerFormLayout | LayoutForm2 |
|---------|-------------------|-------------|
| Visual Design | ✅ Beautiful | ✅ Same styling preserved |
| Two-Column Layout | ✅ Fixed structure | ✅ Configurable |
| Multi-Column Fields | ✅ Hard-coded | ✅ Configurable |
| Change Tracking | ✅ Built-in | ✅ Optional/configurable |
| Form Validation | ✅ react-hook-form | ✅ Compatible |
| Tab System | ✅ BaseFormLayout | ✅ Same integration |
| Custom Fields | ❌ Limited | ✅ Full support |
| Reusability | ❌ Customer-specific | ✅ Any form type |
| TypeScript | ✅ Typed | ✅ Generic types |

## Migration Guide

To migrate from CustomerFormLayout to LayoutForm2:

1. **Extract field definitions** from the hard-coded tabs
2. **Convert to FormField2 configurations** with proper typing
3. **Group into sections** using FormSection2 interface
4. **Add change tracking** if needed
5. **Replace CustomerFormLayout** with LayoutForm2

The visual result will be identical, but with full configurability and reusability.