import type { BackupFile } from '../lib/backup';
import { db } from './db';

export async function createBackup(): Promise<BackupFile> {
  const [
    menuItems,
    diningTables,
    orders,
    expenses,
    dayCloses,
    settings,
    auditLogs,
  ] = await Promise.all([
    db.menuItems.toArray(),
    db.diningTables.toArray(),
    db.orders.toArray(),
    db.expenses.toArray(),
    db.dayCloses.toArray(),
    db.settings.toArray(),
    db.auditLogs.toArray(),
  ]);

  return {
    app: 'restaurant-pos',
    version: 1,
    exportedAt: Date.now(),
    data: {
      menuItems,
      diningTables,
      orders,
      expenses,
      dayCloses,
      settings,
      auditLogs,
    },
  };
}

export async function restoreBackup(backup: BackupFile): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.menuItems,
      db.diningTables,
      db.orders,
      db.expenses,
      db.dayCloses,
      db.settings,
      db.auditLogs,
    ],
    async () => {
      await db.menuItems.clear();
      await db.diningTables.clear();
      await db.orders.clear();
      await db.expenses.clear();
      await db.dayCloses.clear();
      await db.settings.clear();
      await db.auditLogs.clear();

      if (backup.data.menuItems.length > 0) {
        await db.menuItems.bulkPut(backup.data.menuItems);
      }
      if (backup.data.diningTables.length > 0) {
        await db.diningTables.bulkPut(backup.data.diningTables);
      }
      if (backup.data.orders.length > 0) {
        await db.orders.bulkPut(backup.data.orders);
      }
      if (backup.data.expenses.length > 0) {
        await db.expenses.bulkPut(backup.data.expenses);
      }
      if (backup.data.dayCloses.length > 0) {
        await db.dayCloses.bulkPut(backup.data.dayCloses);
      }
      if (backup.data.settings.length > 0) {
        await db.settings.bulkPut(backup.data.settings);
      }
      if (backup.data.auditLogs.length > 0) {
        await db.auditLogs.bulkPut(backup.data.auditLogs);
      }
    },
  );
}
