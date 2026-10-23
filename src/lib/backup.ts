import { format } from 'date-fns';
import type {
  AuditLog,
  DayClose,
  Expense,
  MenuItem,
  Order,
  RestaurantTable,
  Settings,
} from '../db/types';

export interface BackupData {
  menuItems: MenuItem[];
  diningTables: RestaurantTable[];
  orders: Order[];
  expenses: Expense[];
  dayCloses: DayClose[];
  settings: Settings[];
  auditLogs: AuditLog[];
}

export interface BackupFile {
  app: 'restaurant-pos';
  version: 1;
  exportedAt: number;
  data: BackupData;
}

const DATA_KEYS: (keyof BackupData)[] = [
  'menuItems',
  'diningTables',
  'orders',
  'expenses',
  'dayCloses',
  'settings',
  'auditLogs',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function backupFileName(date: Date = new Date()): string {
  return `restaurant-pos-backup-${format(date, 'yyyy-MM-dd-HHmm')}.json`;
}

export function parseBackup(text: string): BackupFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON.');
  }

  if (!isRecord(parsed)) {
    throw new Error('This file is not a valid backup.');
  }
  if (parsed.app !== 'restaurant-pos') {
    throw new Error('This is not a Restaurant POS backup file.');
  }
  if (parsed.version !== 1) {
    throw new Error('This backup version is not supported.');
  }
  if (typeof parsed.exportedAt !== 'number') {
    throw new Error('The backup date is missing.');
  }
  if (!isRecord(parsed.data)) {
    throw new Error('The backup data is missing.');
  }

  for (const key of DATA_KEYS) {
    if (!Array.isArray(parsed.data[key])) {
      throw new Error(`The backup is missing ${key}.`);
    }
  }

  const settings = parsed.data.settings as unknown[];
  const appSettings = settings[0];
  if (
    settings.length === 0 ||
    !isRecord(appSettings) ||
    appSettings.id !== 'app' ||
    typeof appSettings.restaurantName !== 'string' ||
    typeof appSettings.address !== 'string' ||
    typeof appSettings.phone !== 'string' ||
    typeof appSettings.vatPct !== 'number' ||
    typeof appSettings.servicePct !== 'number' ||
    typeof appSettings.roundToTaka !== 'boolean' ||
    typeof appSettings.currencySymbol !== 'string' ||
    typeof appSettings.receiptFooter !== 'string'
  ) {
    throw new Error('The backup is missing valid restaurant settings.');
  }

  return parsed as unknown as BackupFile;
}
