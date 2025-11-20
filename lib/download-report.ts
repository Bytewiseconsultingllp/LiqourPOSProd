export function downloadCSVFile(filename: string, rows: (string | number)[][]) {
  if (!rows.length) {
    return;
  }

  const csvContent = rows
    .map((row) =>
      row
        .map((value) => {
          const stringValue = value === undefined || value === null ? '' : value.toString();
          if (/[",\n]/.test(stringValue)) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(',')
    )
    .join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
