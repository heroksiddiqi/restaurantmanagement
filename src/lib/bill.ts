export interface BillLine {
  price: number;
  cost: number;
  qty: number;
}

export interface BillSettings {
  vatPct: number;
  servicePct: number;
  roundToTaka: boolean;
}

export interface BillTotals {
  subtotal: number;
  discount: number;
  taxable: number;
  vat: number;
  service: number;
  total: number;
  cogs: number;
  grossProfit: number;
}

function safeNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateBill(
  lines: BillLine[],
  fixedDiscount: number,
  settings: BillSettings,
): BillTotals {
  const subtotal = round2(
    lines.reduce(
      (sum, line) => sum + safeNumber(line.price) * safeNumber(line.qty),
      0,
    ),
  );

  const discount = round2(
    Math.min(Math.max(safeNumber(fixedDiscount), 0), subtotal),
  );
  const taxable = round2(subtotal - discount);

  const vat = round2((taxable * safeNumber(settings.vatPct)) / 100);
  const service = round2((taxable * safeNumber(settings.servicePct)) / 100);
  const gross = taxable + vat + service;
  const total = settings.roundToTaka ? Math.round(gross) : round2(gross);

  const cogs = round2(
    lines.reduce(
      (sum, line) => sum + safeNumber(line.cost) * safeNumber(line.qty),
      0,
    ),
  );

  return {
    subtotal,
    discount,
    taxable,
    vat,
    service,
    total,
    cogs,
    grossProfit: round2(taxable - cogs),
  };
}

export function calculateChange(received: number, total: number): number {
  return round2(Math.max(safeNumber(received) - safeNumber(total), 0));
}
