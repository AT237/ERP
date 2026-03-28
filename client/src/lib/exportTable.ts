type ColumnConfig = {
  key: string;
  label: string;
  visible: boolean;
};

export function exportTableToCSV<T extends Record<string, any>>(
  data: T[],
  columns: ColumnConfig[],
  filename: string
) {
  const visibleCols = columns.filter(c => c.visible);
  const header = visibleCols.map(c => `"${c.label.replace(/"/g, '""')}"`).join(';');
  const rows = data.map(row =>
    visibleCols.map(col => {
      const val = row[col.key];
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    }).join(';')
  );
  const bom = '\uFEFF';
  const csv = bom + [header, ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
