export function roundTaka(amount: number): number {
  return Math.round(amount);
}

export function formatTaka(amount: number): string {
  const rounded = roundTaka(amount);
  const sign = rounded < 0 ? '-' : '';
  return `${sign}৳${Math.abs(rounded).toLocaleString('en-US')}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}
