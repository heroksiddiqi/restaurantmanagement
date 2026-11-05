import Dexie, { type Table } from 'dexie';
import { DEFAULT_SETTINGS } from './seed';
import type {
  AuditLog,
  DayClose,
  Expense,
  MenuItem,
  Order,
  RestaurantTable,
  Settings,
} from './types';

export class PosDatabase extends Dexie {
  menuItems!: Table<MenuItem, number>;
  diningTables!: Table<RestaurantTable, number>;
  orders!: Table<Order, number>;
  expenses!: Table<Expense, number>;
  dayCloses!: Table<DayClose, number>;
  settings!: Table<Settings, string>;
  auditLogs!: Table<AuditLog, number>;

  constructor() {
    super('restaurant-pos');
    this.version(1).stores({
      menuItems: '++id, &code, category, active, name',
      diningTables: '++id, &name',
      orders: '++id, &orderNo, tableId, status, type, createdAt, paidAt',
      expenses: '++id, date, category',
      dayCloses: '++id, &date',
      settings: '&id',
      auditLogs: '++id, at, action, entityId',
    });
  }
}

export const db = new PosDatabase();

export async function ensureSeeded(): Promise<void> {
  const settings = await db.settings.get('app');

  if (!settings) {
    await db.settings.put(DEFAULT_SETTINGS);
  }
}

export async function getSettings(): Promise<Settings> {
  const settings = await db.settings.get('app');
  if (settings) return settings;
  await db.settings.put(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}
