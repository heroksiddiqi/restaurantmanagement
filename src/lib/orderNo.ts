export function startOfLocalDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function endOfLocalDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(24, 0, 0, 0);
  return date.getTime();
}

export function buildOrderNo(timestamp: number, sequence: number): string {
  const date = new Date(timestamp);
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const seq = String(Math.max(1, Math.floor(sequence))).padStart(3, '0');
  return `OR-${year}${month}${day}-${seq}`;
}

export function parseOrderSequence(orderNo: string): number | null {
  const match = orderNo.match(/^OR-\d{6}-(\d+)$/);
  if (!match) return null;
  const sequence = Number(match[1]);
  return Number.isInteger(sequence) ? sequence : null;
}

export function nextOrderNo(
  existingOrderNos: string[],
  timestamp: number,
): string {
  const highest = existingOrderNos.reduce((max, orderNo) => {
    const sequence = parseOrderSequence(orderNo);
    return sequence != null && sequence > max ? sequence : max;
  }, 0);

  return buildOrderNo(timestamp, highest + 1);
}
