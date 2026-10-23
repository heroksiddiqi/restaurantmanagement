import { db } from './db';
import type { DayClose } from './types';

export interface DayCloseInput {
  date: string;
  openingCash: number;
  expectedCash: number;
  countedCash: number;
  note?: string;
}

export async function saveDayClose(input: DayCloseInput): Promise<DayClose> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    throw new Error('Day close date is invalid.');
  }
  if (!Number.isFinite(input.openingCash) || input.openingCash < 0) {
    throw new Error('Opening cash must be zero or more.');
  }
  if (!Number.isFinite(input.countedCash) || input.countedCash < 0) {
    throw new Error('Counted cash must be zero or more.');
  }

  return db.transaction('rw', db.dayCloses, db.auditLogs, async () => {
    const existing = await db.dayCloses
      .where('date')
      .equals(input.date)
      .first();

    const record: DayClose = {
      id: existing?.id,
      date: input.date,
      openingCash: Math.round(input.openingCash * 100) / 100,
      expectedCash: Math.round(input.expectedCash * 100) / 100,
      countedCash: Math.round(input.countedCash * 100) / 100,
      note: input.note?.trim() || undefined,
      closedAt: Date.now(),
    };

    const id = await db.dayCloses.put(record);
    await db.auditLogs.add({
      at: record.closedAt,
      action: existing ? 'day.close.update' : 'day.close',
      entityId: id,
      meta: {
        date: record.date,
        expectedCash: record.expectedCash,
        countedCash: record.countedCash,
      },
    });

    return { ...record, id };
  });
}
