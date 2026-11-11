export function downloadCsv(filename, rows, columns) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = columns.map(c => escape(c.label)).join(',');
  const body = rows.map(r => columns.map(c => escape(c.get(r))).join(',')).join('\n');
  const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}