import { db } from './db';

export interface TableInput {
  id?: number;
  name: string;
  seats: number;
}

export async function saveTable(input: TableInput): Promise<number> {
  const name = input.name.trim();
  if (!name) throw new Error('Table name is required.');
  if (!Number.isInteger(input.seats) || input.seats < 1 || input.seats > 50) {
    throw new Error('Seats must be a whole number between 1 and 50.');
  }

  return db.transaction('rw', db.diningTables, db.auditLogs, async () => {
    const tables = await db.diningTables.toArray();
    const duplicate = tables.find(
      (table) =>
        table.name.toLowerCase() === name.toLowerCase() &&
        table.id !== input.id,
    );
    if (duplicate) {
      throw new Error(`Table "${duplicate.name}" already exists.`);
    }

    const timestamp = Date.now();
    let id: number;
    let action: string;

    if (input.id != null) {
      const existing = tables.find((table) => table.id === input.id);
      if (!existing) throw new Error('Table not found.');
      await db.diningTables.update(input.id, { name, seats: input.seats });
      id = input.id;
      action = 'table.update';
    } else {
      id = await db.diningTables.add({ name, seats: input.seats });
      action = 'table.add';
    }

    await db.auditLogs.add({
      at: timestamp,
      action,
      entityId: id,
      meta: { name, seats: input.seats },
    });

    return id;
  });
}

export async function deleteTable(id: number): Promise<void> {
  await db.transaction(
    'rw',
    db.diningTables,
    db.orders,
    db.auditLogs,
    async () => {
      const table = await db.diningTables.get(id);
      if (!table) return;

      const openOrder = await db.orders
        .where('tableId')
        .equals(id)
        .filter((order) => order.status === 'unpaid')
        .first();
      if (openOrder) {
        throw new Error(
          'This table has an open order. Cancel or clear it first.',
        );
      }

      await db.diningTables.delete(id);
      await db.auditLogs.add({
        at: Date.now(),
        action: 'table.delete',
        entityId: id,
        meta: { name: table.name },
      });
    },
  );
}
