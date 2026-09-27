// Exportação CSV que abre direto no Excel pt-BR: BOM (acentos), ";" como separador
// e vírgula decimal. Use csvNumber para valores numéricos.

export type CsvCell = string | number | null | undefined;

// Número sem separador de milhar e com vírgula decimal (1234,56).
export function csvNumber(value: number | string | null | undefined, decimals = 2): string {
  const n = Number(value ?? 0);
  return (Number.isFinite(n) ? n : 0).toFixed(decimals).replace('.', ',');
}

function csvCell(value: CsvCell): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function downloadCsv(fileName: string, header: string[], rows: CsvCell[][]): void {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(';'));
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
