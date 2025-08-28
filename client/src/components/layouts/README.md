# Herbruikbare Layout Systeem

Dit layout systeem bevat herbruikbare components die je kunt gebruiken voor verschillende overzichten in de applicatie zoals customers, suppliers, inventory, enz.

## Components

### 1. DataTableLayout
Een volledig uitgeruste tabel component met:
- Zoeken en filteren
- Sorteerbare en verstelbare kolommen
- Drag & drop kolom herindeling
- Rij selectie met bulk acties
- Dialog support voor toevoegen/bewerken/details
- Export functionaliteit
- Column visibility management

### 2. FormLayout
Een gestructureerd formulier component met:
- Sectie-gebaseerde indeling
- Verschillende veld types (text, email, select, custom)
- Automatische error handling
- Gestandaardiseerde styling
- Plus buttons voor uitbreiding

### 3. useDataTable Hook
Een hook die state management afhandelt voor:
- Kolom configuratie
- Zoeken en filteren
- Sortering
- Rij selectie
- Generieke filter/sort functies

## Gebruik

### Basis Setup

```typescript
import { DataTableLayout, ColumnConfig } from '@/components/layouts/DataTableLayout';
import { FormLayout, FormSection } from '@/components/layouts/FormLayout';
import { useDataTable } from '@/hooks/useDataTable';

// 1. Definieer je kolommen
const defaultColumns: ColumnConfig[] = [
  { 
    key: 'name', 
    label: 'Name', 
    visible: true, 
    width: 200, 
    filterable: true, 
    sortable: true,
    renderCell: (value, row) => <span className="font-medium">{value}</span>
  },
  // ... meer kolommen
];

// 2. Gebruik de hook
const dataTableState = useDataTable({
  defaultColumns,
  defaultSort: { column: 'name', direction: 'asc' }
});

// 3. Render de layout
<DataTableLayout
  data={yourData}
  isLoading={isLoading}
  getRowId={(row) => row.id}
  {...dataTableState}
  entityName="Item"
  entityNamePlural="Items"
  // ... meer props
/>
```

### Form Sections

```typescript
const formSections: FormSection[] = [
  {
    title: "Basic Information",
    fields: [
      {
        key: "name",
        label: "Name",
        type: "text",
        required: true,
        register: form.register("name"),
        error: form.formState.errors.name?.message
      },
      {
        key: "status",
        label: "Status", 
        type: "select",
        options: [
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" }
        ],
        setValue: (value) => form.setValue("status", value)
      }
    ]
  }
];
```

## Voordelen

1. **Consistentie**: Alle tabellen zien er hetzelfde uit en gedragen zich hetzelfde
2. **Minder Code**: Minder duplicatie tussen verschillende overzichten  
3. **Makkelijk Onderhoud**: Wijzigingen in één plaats zijn overal zichtbaar
4. **Flexibiliteit**: Elke tabel kan nog steeds aangepast worden waar nodig
5. **Type Veiligheid**: Volledig TypeScript ondersteuning

## Voorbeelden

Zie `client/src/components/examples/CustomerTableWithLayout.tsx` voor een volledig voorbeeld van hoe de customer table is omgezet naar dit systeem.

Voor andere entities (suppliers, inventory, etc.) kun je hetzelfde patroon volgen:
1. Kopieer het voorbeeld bestand
2. Pas de kolom configuratie aan
3. Pas de form secties aan  
4. Pas de API calls aan
5. Klaar!